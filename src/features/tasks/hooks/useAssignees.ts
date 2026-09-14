import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { applyAssigneeAdded, applyAssigneeRemoved } from '../lib/board-cache';
import { seedFromDetail } from '../lib/detail-seed';
import { markLocal } from '../lib/local-mutations';
import type { Board } from '../types';

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
  }
}

export function useAssignees(projectId: string, taskId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'assignees'],
    queryFn: () => tasksApi.listAssignees(projectId, taskId!),
    enabled: !!projectId && !!taskId,
    ...(taskId ? seedFromDetail(qc, projectId, taskId, (detail) => detail.assignees) : {}),
  });
}

export function useAddAssignee(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: assigneeMutationKey(projectId, taskId),
    mutationFn: (member: { userId: string; displayName: string; avatarUrl?: string | null }) => {
      markLocal(taskId, 'assignee:added');
      return tasksApi.addAssignee(projectId, taskId, member);
    },
    onSuccess: (_result, member) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) =>
        board
          ? (applyAssigneeAdded(board, {
              taskId,
              userId: member.userId,
              displayName: member.displayName,
              avatarUrl: member.avatarUrl ?? null,
            }) ?? board)
          : board,
      );
    },
    onSettled: () => settleAssignees(qc, projectId, taskId),
  });
}

export function useRemoveAssignee(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: assigneeMutationKey(projectId, taskId),
    mutationFn: (userId: string) => {
      markLocal(taskId, 'assignee:removed');
      return tasksApi.removeAssignee(projectId, taskId, userId);
    },
    onSuccess: (_result, userId) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) =>
        board ? (applyAssigneeRemoved(board, { taskId, userId }) ?? board) : board,
      );
    },
    onSettled: () => settleAssignees(qc, projectId, taskId),
  });
}
