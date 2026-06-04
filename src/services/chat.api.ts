import { apiClient } from '@/lib/api/client';
import type {
  AttachmentUrl,
  Conversation,
  JoinRequest,
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
          // Tin tự huỷ (giây, 5–2592000). Bỏ field nếu không set. Xem doc 15.
          selfDestructTtl: input.selfDestructTtl,
        },
      },
    ),

  // ─── Sửa / gỡ tin nhắn (conversation SERVER) ────────────────────────────
  // Endpoint & contract theo FRONTEND/15-edit-recall-selfdestruct.md.
  // (E2E edit dùng PATCH /secret-messages/:id — chưa wire vì UI chưa hỗ trợ
  //  quản lý khoá E2E; bổ sung khi có lớp encrypt client-side.)

  /** Sửa nội dung text của 1 tin SERVER (trong 5 phút). Trả Message đã cập nhật (isEdited=true). */
  editMessage: (conversationId: string, messageId: string, plaintext: string) =>
    apiClient.patch<Message>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}`,
      { body: { plaintext } },
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

  // ─── Ghim hội thoại ─────────────────────────────────────────────────────
  // PATCH /pin với body { pinned } — trả Conversation đã cập nhật isPinned. Xem 03.
  setPin: (id: string, pinned: boolean) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/pin`, {
      body: { pinned },
    }),

  // ─── Thành viên nhóm ────────────────────────────────────────────────────
  // addMembers nhận mảng userId (1–100); removeMember xoá 1 user. Xem 16.
  addMembers: (conversationId: string, userIds: string[]) =>
    apiClient.post<Conversation>(
      `/api/v1/conversations/${conversationId}/members`,
      { body: { userIds } },
    ),

  // Kick 1 thành viên (chỉ role cao hơn). Trả { ok: true } — refetch detail để cập nhật members.
  removeMember: (conversationId: string, userId: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}`,
    ),

  // Tự rời nhóm (OWNER không rời được — phải chuyển quyền hoặc xoá nhóm).
  leaveConversation: (conversationId: string) =>
    apiClient.post<{ ok: true }>(`/api/v1/conversations/${conversationId}/leave`),

  // ─── Yêu cầu vào nhóm (join request) ────────────────────────────────────
  // Endpoint & contract theo FRONTEND/16-group-members.md.

  /** Danh sách yêu cầu PENDING (cho OWNER/ADMIN/MOD), kèm thông tin requester. */
  listJoinRequests: (
    conversationId: string,
    params: { page?: number; limit?: number } = {},
  ) =>
    apiClient.get<JoinRequest[]>(
      `/api/v1/conversations/${conversationId}/join-requests`,
      { query: { page: params.page ?? 1, limit: params.limit ?? 50 } },
    ),

  /** User ngoài gửi yêu cầu xin vào nhóm công khai (reason ≤ 300 ký tự, optional). */
  requestJoin: (conversationId: string, reason?: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests`,
      { body: { reason } },
    ),

  /** Duyệt yêu cầu → thêm người gửi làm MEMBER. */
  acceptJoinRequest: (conversationId: string, requestId: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}/accept`,
    ),

  /** Từ chối yêu cầu (reason optional). */
  rejectJoinRequest: (conversationId: string, requestId: string, reason?: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}/reject`,
      { body: { reason } },
    ),

  /** Người gửi tự huỷ yêu cầu của mình khi còn PENDING. */
  cancelJoinRequest: (conversationId: string, requestId: string) =>
    apiClient.delete<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}`,
    ),
} as const;
