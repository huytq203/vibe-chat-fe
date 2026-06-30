import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

function assigneesKey(projectId: string, taskId: string) {
  return ['tasks', projectId, taskId, 'assignees'] as const;
}

function assigneeMutationKey(projectId: string, taskId: string) {
  return ['tasks', projectId, taskId, 'assignees', 'mutate'] as const;
}

/**
 * Chỉ refetch khi không còn mutation người-thực-hiện nào đang chạy → tránh refetch
 * giữa chừng (server chưa commit đủ) làm mất bớt khi gán nhiều người liên tiếp.
 */
function settleAssignees(qc: QueryClient, projectId: string, taskId: string) {
  if (qc.isMutating({ mutationKey: assigneeMutationKey(projectId, taskId) }) <= 1) {
    void qc.invalidateQueries({ queryKey: assigneesKey(projectId, taskId) });
    void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
  }
}

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
    mutationKey: assigneeMutationKey(projectId, taskId),
    mutationFn: (member: { userId: string; displayName: string; avatarUrl?: string | null }) =>
      tasksApi.addAssignee(projectId, taskId, member),
    onSettled: () => settleAssignees(qc, projectId, taskId),
  });
}

export function useRemoveAssignee(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: assigneeMutationKey(projectId, taskId),
    mutationFn: (userId: string) => tasksApi.removeAssignee(projectId, taskId, userId),
    onSettled: () => settleAssignees(qc, projectId, taskId),
  });
}
