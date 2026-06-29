import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId, 'members'],
    queryFn: () => tasksApi.listMembers(projectId),
    enabled: !!projectId,
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tasksApi.addMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] }),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tasksApi.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] }),
  });
}
