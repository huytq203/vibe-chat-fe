'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { getTaskSocket } from '../lib/task-socket';
import { taskKeys } from '../services/keys';

/** Payload tối thiểu của các event realtime — chỉ cần taskId để invalidate đúng scope */
interface TaskScopedPayload {
  taskId?: string;
}

type Invalidator = (
  qc: QueryClient,
  projectId: string,
  payload: TaskScopedPayload,
) => void;

const invalidateBoard: Invalidator = (qc, projectId) => {
  void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
};

/** Invalidate 1 sub-resource của task (comments/checklist/...) + board (count trên card) */
function taskSub(sub: string): Invalidator {
  return (qc, projectId, payload) => {
    if (payload.taskId) {
      void qc.invalidateQueries({
        queryKey: ['tasks', projectId, payload.taskId, sub],
      });
      void qc.invalidateQueries({
        queryKey: ['tasks', projectId, payload.taskId, 'detail'],
      });
    }
    invalidateBoard(qc, projectId, payload);
    // Feed hoạt động (Dashboard) cũng đổi theo mutation
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities'] });
  };
}

const boardAndDetail: Invalidator = (qc, projectId, payload) => {
  invalidateBoard(qc, projectId, payload);
  if (payload.taskId) {
    void qc.invalidateQueries({
      queryKey: ['tasks', projectId, payload.taskId, 'detail'],
    });
  }
  void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities'] });
};

const invalidateProjects: Invalidator = (qc, projectId, payload) => {
  void qc.invalidateQueries({ queryKey: taskKeys.projects() });
  invalidateBoard(qc, projectId, payload);
};

/** Map event socket → invalidation. Payload nào cũng có thể thiếu field → coi là optional. */
const EVENT_INVALIDATORS: Record<string, Invalidator> = {
  'task:created': invalidateBoard,
  'task:updated': boardAndDetail,
  'task:moved': boardAndDetail,
  'task:deleted': boardAndDetail,
  'column:created': invalidateBoard,
  'column:updated': invalidateBoard,
  'column:deleted': invalidateBoard,
  'project:updated': invalidateProjects,
  'project:deleted': invalidateProjects,
  'board:locked': invalidateProjects,
  'board:unlocked': invalidateProjects,
  'member:added': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
  },
  'member:removed': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
  },
  'tag:created': (qc, projectId, p) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
    invalidateBoard(qc, projectId, p);
  },
  'tag:updated': (qc, projectId, p) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
    invalidateBoard(qc, projectId, p);
  },
  'tag:deleted': (qc, projectId, p) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
    invalidateBoard(qc, projectId, p);
  },
  'task:tag-attached': taskSub('tags'),
  'task:tag-detached': taskSub('tags'),
  'comment:created': taskSub('comments'),
  'comment:updated': taskSub('comments'),
  'comment:deleted': taskSub('comments'),
  'checklist:added': taskSub('checklist'),
  'checklist:updated': taskSub('checklist'),
  'checklist:toggled': taskSub('checklist'),
  'checklist:deleted': taskSub('checklist'),
  'attachment:added': taskSub('attachments'),
  'attachment:deleted': taskSub('attachments'),
  'assignee:added': taskSub('assignees'),
  'assignee:removed': taskSub('assignees'),
};

/**
 * Realtime cho board/project đang mở: join room `project:{id}`, mọi event
 * từ thành viên khác → invalidate React Query cache tương ứng (refetch nền).
 * Invalidation idempotent nên event từ chính mình cũng vô hại.
 */
export function useTaskRealtime(projectId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const socket = getTaskSocket();
    if (!socket) return;

    const handlers = new Map<string, (payload: unknown) => void>();
    for (const [event, invalidate] of Object.entries(EVENT_INVALIDATORS)) {
      const handler = (payload: unknown): void => {
        invalidate(qc, projectId, (payload ?? {}) as TaskScopedPayload);
      };
      handlers.set(event, handler);
      socket.on(event, handler);
    }

    const join = (): void => {
      socket.emit(
        'join-project',
        { projectId },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) {
            logger.warn('Task WS join-project bị từ chối', {
              projectId,
              error: ack?.error,
            });
          }
        },
      );
    };
    join();
    // Sau reconnect phải join lại room (server quên room cũ)
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      for (const [event, handler] of handlers) socket.off(event, handler);
      socket.emit('leave-project', { projectId });
    };
  }, [projectId, qc]);
}
