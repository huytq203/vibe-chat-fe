'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/services/sessions.api';
import { sessionKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { closeSocket } from '@/lib/ws/socket';

/** Danh sách phiên đang đăng nhập (web/mobile/desktop). */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => sessionsApi.list(),
  });
}

/** Đá 1 thiết bị theo sessionId. */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.revoke(sessionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() }),
  });
}

/** Đăng xuất tất cả thiết bị khác (giữ phiên hiện tại). */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() }),
  });
}

/**
 * Đăng xuất khỏi TẤT CẢ thiết bị kể cả thiết bị hiện tại. BE revoke mọi phiên +
 * clear cookie → dọn session phía client (đóng socket, xoá store + cache) như logout.
 * Component tự điều hướng về /login sau khi thành công.
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const clearLockSession = useConvLockStore((s) => s.clearAll);
  return useMutation({
    mutationFn: () => sessionsApi.revokeAll(),
    onSettled: () => {
      closeSocket();
      clearLockSession();
      clear();
      queryClient.clear();
    },
  });
}
