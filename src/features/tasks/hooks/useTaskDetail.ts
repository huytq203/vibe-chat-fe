import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import type { TaskDetail, TaskPriority } from '../types';

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
      isPinned?: boolean;
    }) => tasksApi.updateTask(taskId, input),
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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
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
    mutationFn: () => fn(taskId),
    onSuccess: (updated) => {
      qc.setQueryData(['tasks', projectId, taskId, 'detail'], updated);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
      // History phản ánh action workflow vừa xảy ra
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities', taskId] });
      void qc.invalidateQueries({ queryKey: ['tasks', 'feed'] });
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

/** Lưu trữ task đã DONE để clear khỏi board (chỉ owner). */
export function useArchiveTask(projectId: string, taskId: string) {
  return useWorkflowMutation(projectId, taskId, tasksApi.archiveTask);
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.deleteTask(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
