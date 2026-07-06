import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

function inviteKey(projectId: string) {
  return ['tasks', projectId, 'invite'] as const;
}
function joinRequestsKey(projectId: string) {
  return ['tasks', projectId, 'join-requests'] as const;
}

// ── Invite link (chỉ OWNER mới fetch — truyền enabled) ────────────────────────

export function useProjectInvite(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: inviteKey(projectId),
    queryFn: () => tasksApi.getInvite(projectId),
    enabled: !!projectId && enabled,
  });
}

export function useEnableInvite(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.enableInvite(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteKey(projectId) }),
  });
}

export function useRotateInvite(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.rotateInvite(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteKey(projectId) }),
  });
}

export function useDisableInvite(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.disableInvite(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteKey(projectId) }),
  });
}

// ── Join requests (chỉ OWNER) ─────────────────────────────────────────────────

export function useJoinRequests(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: joinRequestsKey(projectId),
    queryFn: () => tasksApi.listJoinRequests(projectId),
    enabled: !!projectId && enabled,
  });
}

export function useAcceptJoinRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reqId: string) => tasksApi.acceptJoinRequest(reqId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: joinRequestsKey(projectId) });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'members'] });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}

export function useRejectJoinRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reqId: string) => tasksApi.rejectJoinRequest(reqId),
    onSuccess: () => qc.invalidateQueries({ queryKey: joinRequestsKey(projectId) }),
  });
}

// ── Trang join (mọi user đã đăng nhập) ────────────────────────────────────────

export function useResolveInvite(token: string) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => tasksApi.resolveInvite(token),
    enabled: !!token,
    retry: false, // 404 (link sai/tắt) → không retry, hiện lỗi ngay
  });
}

export function useRequestJoin(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.requestJoin(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite', token] }),
  });
}
