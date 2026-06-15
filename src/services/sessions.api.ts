import { apiClient } from '@/lib/api/client';
import type { UserSessionInfo } from '@/features/settings/types';

/**
 * REST endpoints quản lý phiên đa thiết bị (auth backend). Pure transport.
 * Hook (TanStack Query) ở features/settings/hooks/use-sessions.ts.
 */
export const sessionsApi = {
  list: () => apiClient.get<UserSessionInfo[]>('/api/v1/auth/sessions'),
  // Đá 1 thiết bị theo sessionId (204 No Content).
  revoke: (sessionId: string) =>
    apiClient.delete<void>(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`),
  // Đăng xuất tất cả thiết bị khác, giữ phiên hiện tại (204 No Content).
  revokeOthers: () => apiClient.delete<void>('/api/v1/auth/sessions'),
} as const;
