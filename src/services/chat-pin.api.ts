import { apiClient } from '@/lib/api/client';
import type { Message } from '@/features/chat/types';

// ─── Ghim tin nhắn (pinned messages) ────────────────────────────────────────
// Contract theo FRONTEND/29-pinned-messages.md. Tối đa 5 tin / conversation.

/** Transport cho ghim tin: pin/unpin + list tin đang ghim. */
export const pinApi = {
  /** Ghim 1 tin. Trả Message. */
  pinMessage: (conversationId: string, messageId: string) =>
    apiClient.post<Message>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/pin`,
    ),

  /** Bỏ ghim 1 tin. Trả { ok: true }. */
  unpinMessage: (conversationId: string, messageId: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/pin`,
    ),

  /** Danh sách tin đang ghim (mới ghim đứng đầu, tối đa 5). Chuẩn hoá về Message[]
   *  dù BE trả mảng trực tiếp hay bọc trong { items } / { data }. */
  listPinnedMessages: async (conversationId: string): Promise<Message[]> => {
    const res = await apiClient.get<unknown>(
      `/api/v1/conversations/${conversationId}/pinned-messages`,
    );
    if (Array.isArray(res)) return res as Message[];
    const obj = res as { items?: Message[]; data?: Message[] } | null;
    return obj?.items ?? obj?.data ?? [];
  },
} as const;
