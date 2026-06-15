'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/services/sessions.api';
import { sessionKeys } from '@/services/keys';

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
