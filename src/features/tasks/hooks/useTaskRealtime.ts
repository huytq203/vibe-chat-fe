'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { getTaskSocket } from '../lib/task-socket';
import { getCurrentUser } from '../lib/current-user';
import { taskKeys } from '../services/keys';
import {
  applyTaskMoved,
  applyTaskUpdated,
  applyTaskCreated,
  applyTaskDeleted,
  applyColumnCreated,
  applyColumnUpdated,
  applyColumnDeleted,
  bumpTaskCount,
  applyAssigneeAdded,
  applyAssigneeRemoved,
  applyTagAttached,
  applyTagDetached,
} from '../lib/board-cache';
import { upsertById, patchById, removeById } from '../lib/list-cache';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  TaskUpdatedEvent,
  ColumnCreatedEvent,
  ColumnUpdatedEvent,
} from '../lib/board-cache';
import type { Board, Comment, ChecklistItem, Attachment } from '../types';

/**
 * Chiến lược realtime: payload event được ÁP THẲNG vào cache (setQueryData)
 * để UI nhảy ngay 1 chặng WS — như Google Sheets. Chỉ fallback
 * invalidate + refetch khi delta không áp được (cache lệch server) hoặc
 * payload không đủ dữ liệu (aggregate: feed/my/reports).
 */

// ── Cache helpers ────────────────────────────────────────────────────────────

/** Áp delta vào board; delta trả null → refetch để reconcile */
function boardDelta(
  qc: QueryClient,
  projectId: string,
  delta: (board: Board) => Board | null,
): void {
  const key = taskKeys.board(projectId);
  const prev = qc.getQueryData<Board>(key);
  if (!prev) return; // board chưa fetch → query sẽ lấy bản mới khi mount
  const next = delta(prev);
  if (next) qc.setQueryData(key, next);
  else void qc.invalidateQueries({ queryKey: key });
}

/**
 * Như boardDelta nhưng miss → bỏ qua thay vì refetch. Dùng cho event trên
 * task có thể là subtask (không render thành card) — miss là bình thường.
 */
function boardDeltaSoft(
  qc: QueryClient,
  projectId: string,
  delta: (board: Board) => Board | null,
): void {
  boardDelta(qc, projectId, (b) => delta(b) ?? b);
}

/** Write-through vào cache dạng list; chưa có cache → thôi (mount sẽ fetch) */
function listDelta<T>(
  qc: QueryClient,
  key: readonly unknown[],
  delta: (list: T[]) => T[] | null,
): void {
  const prev = qc.getQueryData<T[]>(key);
  if (!prev) return;
  const next = delta(prev);
  if (next) qc.setQueryData(key, next);
  else void qc.invalidateQueries({ queryKey: key });
}

const subKey = (projectId: string, taskId: string, sub: string): readonly unknown[] =>
  ['tasks', projectId, taskId, sub] as const;

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }): number =>
  a.createdAt.localeCompare(b.createdAt);

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

// ── Invalidators cho query không delta được từ payload ──────────────────────

function invalidateDetail(qc: QueryClient, projectId: string, taskId: string): void {
  void qc.invalidateQueries({ queryKey: subKey(projectId, taskId, 'detail') });
}

/**
 * Event trên 1 task có thể là subtask → task cha hiển thị danh sách con
 * (['tasks', projectId, parentId, 'subtasks']). Không biết parentId từ payload
 * nên invalidate MỌI subtask-list của project (rẻ, chỉ list nhỏ).
 */
function invalidateSubtaskLists(qc: QueryClient, projectId: string): void {
  void qc.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === 'tasks' && q.queryKey[1] === projectId && q.queryKey[3] === 'subtasks',
  });
}

/** History trong task detail: ['tasks', projectId, 'activities', taskId] (prefix match) */
function invalidateHistory(qc: QueryClient, projectId: string): void {
  void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities'] });
}

/** Feed hoạt động ở Dashboard: ['tasks','feed',page,limit] — KHÁC key history */
function invalidateFeed(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ['tasks', 'feed'] });
}

/** "Việc của tôi" ở Dashboard: ['tasks','my'] */
function invalidateMyTasks(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
}

/** Reports/stats — inactive lúc thường, mark stale để mở tab là fresh */
function invalidateReports(qc: QueryClient, projectId: string): void {
  void qc.invalidateQueries({ queryKey: ['tasks', 'overview'] });
  void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'stats'] });
  void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'leaderboard'] });
}

// ── Event payload types (khớp BE emit — xem task.gateway.ts + các service) ──

interface CommentDeletedEvent {
  commentId: string;
  taskId: string;
}

interface ChecklistToggledEvent {
  itemId: string;
  taskId: string;
  isDone: boolean;
}

interface AttachmentDeletedEvent {
  attachmentId: string;
  taskId: string;
}

interface AssigneeEvent {
  taskId: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface TagAttachedEvent {
  taskId: string;
  tag: { id: string; name: string; color: string };
}

type Handler = (qc: QueryClient, projectId: string, payload: unknown) => void;

const EVENT_HANDLERS: Record<string, Handler> = {
  // ── Task trên board: delta thẳng vào cache ──
  'task:created': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyTaskCreated(b, p as TaskCreatedEvent));
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
  },
  'task:updated': (qc, projectId, p) => {
    const ev = p as TaskUpdatedEvent;
    boardDelta(qc, projectId, (b) => applyTaskUpdated(b, ev));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateSubtaskLists(qc, projectId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
    invalidateMyTasks(qc);
    if (ev.changes?.completedAt !== undefined || ev.changes?.status !== undefined) {
      invalidateReports(qc, projectId);
    }
  },
  'task:moved': (qc, projectId, p) => {
    const ev = p as TaskMovedEvent;
    boardDelta(qc, projectId, (b) => applyTaskMoved(b, ev));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateMyTasks(qc); // MyTask hiển thị columnName
  },
  'task:deleted': (qc, projectId, p) => {
    const ev = p as { taskId: string };
    boardDelta(qc, projectId, (b) => applyTaskDeleted(b, ev));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateSubtaskLists(qc, projectId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
    invalidateMyTasks(qc);
    invalidateReports(qc, projectId);
  },

  // ── Column ──
  'column:created': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyColumnCreated(b, p as ColumnCreatedEvent));
  },
  'column:updated': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyColumnUpdated(b, p as ColumnUpdatedEvent));
  },
  'column:deleted': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyColumnDeleted(b, p as { columnId: string }));
    invalidateMyTasks(qc);
    invalidateReports(qc, projectId);
  },

  // ── Project / board lock ──
  'project:updated': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: taskKeys.projects() });
    void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
  },
  'project:deleted': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: taskKeys.projects() });
    void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    invalidateMyTasks(qc);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
  },
  'board:locked': (qc, projectId) => {
    boardDelta(qc, projectId, (b) => ({ ...b, project: { ...b.project, isBoardLocked: true } }));
    void qc.invalidateQueries({ queryKey: taskKeys.projects() });
  },
  'board:unlocked': (qc, projectId) => {
    boardDelta(qc, projectId, (b) => ({ ...b, project: { ...b.project, isBoardLocked: false } }));
    void qc.invalidateQueries({ queryKey: taskKeys.projects() });
  },

  // ── Members ──
  'member:added': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'leaderboard'] });
  },
  'member:removed': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'leaderboard'] });
  },

  // ── Tags của project (đổi tên/màu ảnh hưởng mọi card gắn tag → refetch board) ──
  'tag:created': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
  },
  'tag:updated': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
    void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
  },
  'tag:deleted': (qc, projectId) => {
    void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'tags'] });
    void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
  },

  // ── Tag gắn trên task: delta vào card (miss = subtask → bỏ qua) ──
  'task:tag-attached': (qc, projectId, p) => {
    const ev = p as TagAttachedEvent;
    boardDeltaSoft(qc, projectId, (b) => applyTagAttached(b, ev));
    void qc.invalidateQueries({ queryKey: subKey(projectId, ev.taskId, 'tags') });
    invalidateSubtaskLists(qc, projectId);
  },
  'task:tag-detached': (qc, projectId, p) => {
    const ev = p as { taskId: string; tagId: string };
    boardDeltaSoft(qc, projectId, (b) => applyTagDetached(b, ev));
    void qc.invalidateQueries({ queryKey: subKey(projectId, ev.taskId, 'tags') });
    invalidateSubtaskLists(qc, projectId);
  },

  // ── Comments: write-through list + bump count trên card ──
  'comment:created': (qc, projectId, p) => {
    const ev = p as Comment;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'commentCount', 1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
  },
  'comment:updated': (qc, projectId, p) => {
    const ev = p as Comment;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
  },
  'comment:deleted': (qc, projectId, p) => {
    const ev = p as CommentDeletedEvent;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      removeById(l, ev.commentId),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'commentCount', -1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
  },

  // ── Checklist ──
  'checklist:added': (qc, projectId, p) => {
    const ev = p as ChecklistItem;
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      upsertById(l, ev, byPosition),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'checklistCount', 1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
  },
  'checklist:updated': (qc, projectId, p) => {
    const ev = p as ChecklistItem;
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      upsertById(l, ev, byPosition),
    );
  },
  'checklist:toggled': (qc, projectId, p) => {
    const ev = p as ChecklistToggledEvent;
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      patchById(l, ev.itemId, { isDone: ev.isDone }),
    );
    invalidateDetail(qc, projectId, ev.taskId); // checklistDone trên detail
    invalidateFeed(qc);
  },
  'checklist:deleted': (qc, projectId, p) => {
    const ev = p as { itemId: string; taskId: string };
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      removeById(l, ev.itemId),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'checklistCount', -1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
  },

  // ── Attachments (board card không hiển thị count → chỉ list + detail) ──
  'attachment:added': (qc, projectId, p) => {
    const ev = p as Attachment;
    listDelta<Attachment>(qc, subKey(projectId, ev.taskId, 'attachments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
    invalidateFeed(qc);
  },
  'attachment:deleted': (qc, projectId, p) => {
    const ev = p as AttachmentDeletedEvent;
    listDelta<Attachment>(qc, subKey(projectId, ev.taskId, 'attachments'), (l) =>
      removeById(l, ev.attachmentId),
    );
    invalidateFeed(qc);
  },

  // ── Assignees: delta vào card; "Việc của tôi" chỉ khi liên quan chính mình ──
  'assignee:added': (qc, projectId, p) => {
    const ev = p as AssigneeEvent;
    boardDeltaSoft(qc, projectId, (b) =>
      applyAssigneeAdded(b, {
        taskId: ev.taskId,
        userId: ev.userId,
        displayName: ev.displayName ?? ev.userId,
        avatarUrl: ev.avatarUrl ?? null,
      }),
    );
    void qc.invalidateQueries({ queryKey: subKey(projectId, ev.taskId, 'assignees') });
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
    if (ev.userId === getCurrentUser()?.userId) invalidateMyTasks(qc);
  },
  'assignee:removed': (qc, projectId, p) => {
    const ev = p as AssigneeEvent;
    boardDeltaSoft(qc, projectId, (b) => applyAssigneeRemoved(b, ev));
    void qc.invalidateQueries({ queryKey: subKey(projectId, ev.taskId, 'assignees') });
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
    if (ev.userId === getCurrentUser()?.userId) invalidateMyTasks(qc);
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Retry lấy socket khi token chưa sẵn sàng lúc mount (tránh realtime chết im lặng) */
const SOCKET_RETRY_MS = 1000;

/**
 * Realtime cho board/project đang mở: join room `project:{id}`, mọi event
 * từ thành viên khác được áp thẳng vào cache (delta) hoặc invalidate.
 * Delta/invalidation idempotent nên event từ chính mình cũng vô hại.
 */
export function useTaskRealtime(projectId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let teardown: (() => void) | null = null;

    const setup = (): void => {
      if (disposed) return;
      const socket = getTaskSocket();
      if (!socket) {
        // Token chưa sẵn sàng (vd: mount trước khi auth xong) → thử lại
        retryTimer = setTimeout(setup, SOCKET_RETRY_MS);
        return;
      }

      const handlers = new Map<string, (payload: unknown) => void>();
      for (const [event, handle] of Object.entries(EVENT_HANDLERS)) {
        const handler = (payload: unknown): void => {
          handle(qc, projectId, payload ?? {});
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

      // Sau reconnect: join lại room (server quên room cũ) + refetch các query
      // đang hiển thị — event trong lúc mất kết nối đã mất, phải resync
      const onReconnect = (): void => {
        join();
        void qc.invalidateQueries({ queryKey: taskKeys.all });
      };
      socket.on('connect', onReconnect);

      teardown = () => {
        socket.off('connect', onReconnect);
        for (const [event, handler] of handlers) socket.off(event, handler);
        socket.emit('leave-project', { projectId });
      };
    };

    setup();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      teardown?.();
    };
  }, [projectId, qc]);
}

/**
 * Warmup socket ngay khi vào khu vực tasks (kể cả chưa chọn project) — để lúc
 * mở board lần đầu đã có kết nối sẵn, không tốn handshake. Retry khi token
 * chưa sẵn sàng lúc mount.
 */
export function useTaskSocketWarmup(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const warm = (): void => {
      if (!getTaskSocket()) timer = setTimeout(warm, SOCKET_RETRY_MS);
    };
    warm();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
}
