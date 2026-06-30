import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

export function useChecklist(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'checklist'],
    queryFn: () => tasksApi.listChecklist(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      tasksApi.createChecklistItem(projectId, taskId, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'checklist'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}

export function useUpdateChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isDone, content }: { itemId: string; isDone?: boolean; content?: string }) =>
      tasksApi.updateChecklistItem(projectId, taskId, itemId, { isDone, content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'checklist'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}

export function useDeleteChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      tasksApi.deleteChecklistItem(projectId, taskId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'checklist'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
