import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'comments'] });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities', taskId] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      tasksApi.deleteComment(projectId, taskId, commentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'comments'] });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities', taskId] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
