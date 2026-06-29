import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import type { TaskPriority } from '../types';

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
      description?: string;
      dueDate?: string | null;
      priority?: TaskPriority | null;
    }) => tasksApi.updateTask(taskId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'board'] });
    },
  });
}
