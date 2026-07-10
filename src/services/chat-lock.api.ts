import { apiClient } from '@/lib/api/client';
import type { Conversation } from '@/features/chat/types';

// ─── Conversation Lock ───────────────────────────────────────────────────
// Contract theo FRONTEND/18-conversation-lock.md.

/** Transport cho khoá hội thoại: bật/tắt/verify + list đang khoá. */
export const lockApi = {
  /** Bật lock (hoặc đổi password). Idempotent. Trả Conversation với isLocked: true. */
  lockConversation: (id: string, password: string) =>
    apiClient.put<Conversation>(`/api/v1/conversations/${id}/lock`, {
      body: { password },
    }),

  /** Tắt lock — yêu cầu đúng password hiện tại. Trả { ok: true }. */
  removeLock: (id: string, password: string) =>
    apiClient.delete<{ ok: true }>(`/api/v1/conversations/${id}/lock`, {
      body: { password },
    }),

  /** Verify password — không đổi trạng thái lock. Trả { ok: true } nếu đúng. */
  verifyLock: (id: string, password: string) =>
    apiClient.post<{ ok: true }>(`/api/v1/conversations/${id}/lock/verify`, {
      body: { password },
    }),

  /** Danh sách conversation đang bị lock của user hiện tại. */
  listLockedConversations: () =>
    apiClient.get<Conversation[]>('/api/v1/conversations/locked'),
} as const;
