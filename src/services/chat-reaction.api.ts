import { apiClient } from '@/lib/api/client';
import type { ReactionState, ReactionType, Reactor, ReactorsPage } from '@/features/chat/types';

// ─── Reactions (thả cảm xúc emoji) ─────────────────────────────────────────
// Mỗi user 1 cảm xúc/tin: PUT để thả/đổi (ghi đè), DELETE để gỡ. BE trả
// ReactionState { reactions[], total, myReaction } sau mỗi thao tác.

/** Transport cho cảm xúc: set/remove + list người đã react. */
export const reactionApi = {
  setReaction: (conversationId: string, messageId: string, type: ReactionType) =>
    apiClient.put<ReactionState>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/reactions`,
      { body: { type } },
    ),

  removeReaction: (conversationId: string, messageId: string) =>
    apiClient.delete<ReactionState>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/reactions`,
    ),

  /** Danh sách người đã thả cảm xúc (popup). Lọc theo loại, cursor theo thời gian. */
  listReactors: async (
    conversationId: string,
    messageId: string,
    params?: { type?: ReactionType; limit?: number; before?: string },
  ): Promise<ReactorsPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Reactor[]>(
      'GET',
      `/api/v1/conversations/${conversationId}/messages/${messageId}/reactions`,
      { query: { ...params } },
    );
    return { items: data, nextCursor: meta?.nextCursor ?? null };
  },
} as const;
