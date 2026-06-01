import { apiClient } from '@/lib/api/client';
import type {
  AttachmentUrl,
  Conversation,
  Message,
  MessagesPage,
  Presence,
  SendMessageInput,
} from '@/features/chat/types';

/**
 * Chat REST transport. Pure — không đụng cache/state.
 * Hook TanStack Query ở features/chat/hooks/*.
 */
export const chatApi = {
  listConversations: (params: { page: number; limit: number }) =>
    apiClient.get<Conversation[]>('/api/v1/conversations', { query: params }),

  getConversation: (id: string) =>
    apiClient.get<Conversation>(`/api/v1/conversations/${id}`),

  createDirect: (userId: string) =>
    apiClient.post<Conversation>('/api/v1/conversations/direct', {
      body: { userId, encryptionType: 'SERVER' },
    }),

  deleteConversation: (id: string) =>
    apiClient.delete<{ ok: true }>(`/api/v1/conversations/${id}`),

  listMessages: async (
    conversationId: string,
    params: { limit?: number; before?: string } = {},
  ): Promise<MessagesPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Message[]>(
      'GET',
      `/api/v1/conversations/${conversationId}/messages`,
      { query: { limit: params.limit ?? 30, before: params.before } },
    );
    return { items: data, nextCursor: meta?.nextCursor ?? null };
  },

  sendMessage: (input: SendMessageInput) =>
    apiClient.post<Message>(
      `/api/v1/conversations/${input.conversationId}/messages`,
      {
        body: {
          // Caption rỗng → bỏ field (đừng gửi '') theo 04-messages.md.
          plaintext: input.plaintext ? input.plaintext : undefined,
          clientNonce: input.clientNonce,
          type: input.type ?? 'TEXT',
          // Bắt buộc với tin media (≤10 id) — xem 04/14-*.md.
          attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
          replyToMessageId: input.replyToMessageId,
          metadata: input.metadata,
        },
      },
    ),

  markRead: (conversationId: string, messageId: string) =>
    apiClient.post<void>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/read`,
    ),

  // Refresh signed URL của 1 attachment (member-accessible, scoped theo conversation).
  getAttachmentUrl: (conversationId: string, mediaId: string) =>
    apiClient.get<AttachmentUrl>(
      `/api/v1/conversations/${conversationId}/attachments/${mediaId}/url`,
    ),

  getPresenceBulk: (userIds: string[]) =>
    apiClient.get<Presence[]>('/api/v1/presence', {
      query: { userIds: userIds.join(',') },
    }),

  setNickname: (conversationId: string, userId: string, nickname: string | null) =>
    apiClient.patch<void>(
      `/api/v1/conversations/${conversationId}/members/${userId}/nickname`,
      { body: { nickname } },
    ),

  createGroup: (input: { name: string; memberIds: string[] }) =>
    apiClient.post<Conversation>('/api/v1/conversations/group', {
      body: { ...input, encryptionType: 'SERVER' },
    }),
} as const;
