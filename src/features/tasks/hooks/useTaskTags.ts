import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useTaskTags(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'tags'],
    queryFn: () => tasksApi.listTaskTags(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useProjectTags(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId, 'tags'],
    queryFn: () => tasksApi.listProjectTags(projectId),
    enabled: !!projectId,
  });
}

export function useAttachTag(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => tasksApi.attachTag(taskId, tagId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'tags'] }),
  });
}

export function useDetachTag(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => tasksApi.detachTag(taskId, tagId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'tags'] }),
  });
}
