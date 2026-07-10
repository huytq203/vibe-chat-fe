import { apiClient } from '@/lib/api/client';
import type {
  AttachmentUrl,
  Message,
  MessagesPage,
  SendMessageInput,
  SharedContentType,
} from '@/features/chat/types';

/** Transport cho tin nhắn: liệt kê/tìm/gửi/sửa/gỡ + đọc + refresh URL attachment. */
export const messageApi = {
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

  /**
   * Nội dung chia sẻ của 1 conversation theo loại (toàn bộ lịch sử, BE filter sẵn) —
   * cho tab "Ảnh & Video / Tài liệu / Liên kết". Trả Message[] cùng shape listMessages.
   * Bỏ `limit` = lấy TẤT CẢ trong 1 lần gọi (mặc định cho tab Shared); chỉ truyền
   * `limit`/`before` khi muốn phân trang. Xem FRONTEND/20-shared-content.md.
   */
  listShared: async (
    conversationId: string,
    params: { type: SharedContentType; limit?: number; before?: string },
  ): Promise<MessagesPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Message[]>(
      'GET',
      `/api/v1/conversations/${conversationId}/shared`,
      { query: { type: params.type, limit: params.limit, before: params.before } },
    );
    return { items: data, nextCursor: meta?.nextCursor ?? null };
  },

  /**
   * Tìm tin nhắn TEXT trong 1 conversation theo từ khoá trên toàn bộ lịch sử (BE khớp
   * trên contentPreview). Filter phụ senderId/from/to kết hợp AND. Trả Message[] cùng
   * shape listMessages, phân trang cursor. Xem FRONTEND/21-message-search.md.
   */
  searchMessages: async (
    conversationId: string,
    params: { key: string; limit?: number; before?: string; senderId?: string; from?: string; to?: string },
  ): Promise<MessagesPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Message[]>(
      'GET',
      `/api/v1/conversations/${conversationId}/messages/search`,
      {
        query: {
          key: params.key,
          limit: params.limit ?? 20,
          before: params.before,
          senderId: params.senderId,
          from: params.from,
          to: params.to,
        },
      },
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
          // Tag @user (group) — bỏ field nếu rỗng. Xem 04-messages.md.
          mentions: input.mentions?.length ? input.mentions : undefined,
          metadata: input.metadata,
          // Tin tự huỷ (giây, 5–2592000). Bỏ field nếu không set. Xem doc 15.
          selfDestructTtl: input.selfDestructTtl,
        },
      },
    ),

  // ─── Sửa / gỡ tin nhắn (conversation SERVER) ────────────────────────────
  // Endpoint & contract theo FRONTEND/15-edit-recall-selfdestruct.md.

  /** Sửa nội dung text của 1 tin SERVER (trong 5 phút). Trả Message đã cập nhật (isEdited=true). */
  editMessage: (
    conversationId: string,
    messageId: string,
    plaintext: string,
    metadata?: Record<string, unknown>,
  ) =>
    apiClient.patch<Message>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}`,
      { body: { plaintext, metadata } },
    ),

  /** Gỡ (thu hồi) 1 tin đã gửi. Trả về Message tombstone (isDeleted=true). */
  deleteMessage: (conversationId: string, messageId: string) =>
    apiClient.delete<Message>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}`,
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
} as const;
