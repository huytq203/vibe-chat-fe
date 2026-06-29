import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useAssignees(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'assignees'],
    queryFn: () => tasksApi.listAssignees(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useAddAssignee(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tasksApi.addAssignee(projectId, taskId, userId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'assignees'] }),
  });
}

export function useRemoveAssignee(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tasksApi.removeAssignee(projectId, taskId, userId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'assignees'] }),
  });
}
