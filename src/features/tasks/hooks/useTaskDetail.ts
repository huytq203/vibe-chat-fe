import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { applyTaskDeleted, applyTaskMoved, applyTaskUpdated } from '../lib/board-cache';
import { scheduleInvalidate } from '../lib/invalidate-scheduler';
import { markLocal } from '../lib/local-mutations';
import type { Board, TaskDetail, TaskPriority } from '../types';

function writeTaskResponse(
  qc: QueryClient,
  projectId: string,
  task: TaskDetail,
): void {
  qc.setQueryData(['tasks', projectId, task.id, 'detail'], task);
  qc.setQueryData<Board>(taskKeys.board(projectId), (board) => {
    if (!board) return board;
    const moved = applyTaskMoved(board, {
      taskId: task.id,
      columnId: task.columnId,
      position: task.position,
    }) ?? board;
    return applyTaskUpdated(moved, {
      taskId: task.id,
      changes: {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        isPinned: task.isPinned,
        completedAt: task.completedAt,
        reviewRequestedAt: task.reviewRequestedAt,
        status: task.status,
      },
    }) ?? moved;
  });
}

export function useTaskDetail(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'detail'],
    queryFn: () => tasksApi.getTask(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useUpdateTask(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      priority?: TaskPriority | null;
      gem?: number | null;
      isPinned?: boolean;
    }) => {
      markLocal(taskId, 'task:updated');
      const detail = qc.getQueryData<TaskDetail>([
        'tasks',
        projectId,
        taskId,
        'detail',
      ]);
      return tasksApi.updateTask(taskId, { ...input, version: detail?.version });
    },
    onMutate: async (input) => {
      const key = ['tasks', projectId, taskId, 'detail'] as const;
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskDetail>(key);
      if (prev) {
        qc.setQueryData<TaskDetail>(key, { ...prev, ...input });
      }
      return { prev };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks', projectId, taskId, 'detail'], ctx.prev);
    },
    onSuccess: (updated) => {
      writeTaskResponse(qc, projectId, updated);
    },
  });
}

/**
 * Workflow complete/reopen/archive. BE trả TaskDetail mới (status suy diễn) →
 * ghi thẳng vào cache + invalidate board và history (activity) của task.
 */
function useWorkflowMutation(
  projectId: string,
  taskId: string,
  fn: (id: string) => Promise<TaskDetail>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      markLocal(taskId, 'task:updated');
      return fn(taskId);
    },
    onSuccess: (updated) => {
      writeTaskResponse(qc, projectId, updated);
      // History phản ánh action workflow vừa xảy ra
      scheduleInvalidate(qc, ['tasks', projectId, 'activities', taskId]);
      scheduleInvalidate(qc, ['tasks', 'feed']);
    },
  });
}

/** Bấm "Hoàn thành": owner → DONE; member thường → chờ owner duyệt (IN_REVIEW). */
export function useCompleteTask(projectId: string, taskId: string) {
  return useWorkflowMutation(projectId, taskId, tasksApi.completeTask);
}

/** Mở lại task (owner) / hủy yêu cầu duyệt của chính mình. */
export function useReopenTask(projectId: string, taskId: string) {
  return useWorkflowMutation(projectId, taskId, tasksApi.reopenTask);
}


export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => {
      markLocal(taskId, 'task:deleted');
      return tasksApi.deleteTask(taskId);
    },
    onSuccess: (_result, taskId) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) =>
        board ? applyTaskDeleted(board, { taskId }) : board,
      );
      qc.removeQueries({ queryKey: ['tasks', projectId, taskId, 'detail'], exact: true });
    },
  });
}
