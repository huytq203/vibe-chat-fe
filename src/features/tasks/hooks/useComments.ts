import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useComments(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'comments'],
    queryFn: () => tasksApi.listComments(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; displayName: string; avatarUrl?: string | null }) =>
      tasksApi.createComment(projectId, taskId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'comments'] }),
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      tasksApi.deleteComment(projectId, taskId, commentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'comments'] }),
  });
}
