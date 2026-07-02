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
      isCompleted?: boolean;
    }) => tasksApi.updateTask(taskId, input),
    onMutate: async (input) => {
      const key = ['tasks', projectId, taskId, 'detail'] as const;
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskDetail>(key);
      if (prev) {
        // isCompleted là flag gửi BE, không thuộc TaskDetail → map optimistic sang completedAt
        const { isCompleted, ...rest } = input;
        qc.setQueryData<TaskDetail>(key, {
          ...prev,
          ...rest,
          completedAt:
            isCompleted === undefined
              ? prev.completedAt
              : isCompleted
                ? new Date().toISOString()
                : null,
        });
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

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.deleteTask(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
