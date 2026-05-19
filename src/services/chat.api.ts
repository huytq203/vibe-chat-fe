import { apiClient } from '@/lib/api/client';
import type {
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
          plaintext: input.plaintext,
          clientNonce: input.clientNonce,
          type: input.type ?? 'TEXT',
          replyToMessageId: input.replyToMessageId,
        },
      },
    ),

  markRead: (conversationId: string, messageId: string) =>
    apiClient.post<void>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/read`,
    ),

  getPresenceBulk: (userIds: string[]) =>
    apiClient.get<Presence[]>('/api/v1/presence', {
      query: { userIds: userIds.join(',') },
    }),
} as const;
