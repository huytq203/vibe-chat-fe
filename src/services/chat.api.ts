import { apiClient } from '@/lib/api/client';
import type {
  AttachmentUrl,
  BannedMember,
  CommonGroupsPage,
  Conversation,
  GroupSettings,
  JoinRequest,
  Message,
  MessagesPage,
  Presence,
  ReactionState,
  ReactionType,
  Reactor,
  SendMessageInput,
  SharedContentType,
} from '@/features/chat/types';

/** Body cập nhật tên/mô tả/avatar/công khai nhóm (PATCH /conversations/{id}). Xem 28. */
export type UpdateConversationInput = {
  name?: string;
  /** Gửi null để xoá mô tả. */
  description?: string | null;
  /** mediaId ảnh đã upload (xem 14-media-upload). Gửi null để gỡ avatar. */
  avatarMediaId?: string | null;
  isPublic?: boolean;
};

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

  // scope: "ME" (default, ẩn phía mình) | "BOTH" (ẩn cả 2) — chỉ áp dụng DIRECT.
  // GROUP/CHANNEL: scope bị BE bỏ qua, luôn xoá toàn cục. Xem 03-conversations.md.
  deleteConversation: (id: string, scope?: 'ME' | 'BOTH') =>
    apiClient.delete<{ ok: true }>(`/api/v1/conversations/${id}`, {
      body: scope ? { scope } : undefined,
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

  // Đặt/đổi biệt danh per-conversation cho 1 thành viên (null/'' để xoá). Mọi thành viên đều thấy.
  // Trả Conversation đã cập nhật members[].nickname. Xem 03-conversations.md.
  setNickname: (conversationId: string, userId: string, nickname: string | null) =>
    apiClient.put<Conversation>(
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

  // ─── Mute thông báo (per-user) ──────────────────────────────────────────
  // PATCH /mute body { isMuted, mutedUntil? } — trả Conversation đã normalize
  // isMuted/mutedUntil. mutedUntil null/bỏ = vĩnh viễn. Xem 22-mute-notifications.md.
  setMute: (id: string, body: { isMuted: boolean; mutedUntil?: string | null }) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/mute`, { body }),

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

  // ─── Conversation Lock ───────────────────────────────────────────────────
  // Contract theo FRONTEND/18-conversation-lock.md.

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

  /** Nhóm GROUP mà mình và userId cùng tham gia — cursor-based (xem 26-common-groups.md). */
  listCommonGroups: (userId: string, params: { limit?: number; cursor?: string } = {}) =>
    apiClient.get<CommonGroupsPage>(`/api/v1/conversations/common-groups/${userId}`, {
      query: { limit: params.limit ?? 20, cursor: params.cursor },
    }),

  // ─── Cài đặt nhóm (đổi tên/mô tả/công khai + quyền hạn) ─────────────────────
  // Contract theo FRONTEND/28-group-settings.md. Trả Conversation đầy đủ đã cập nhật.

  /** Đổi tên/mô tả/công khai nhóm. Quyền theo settings.whoCanEditInfo (isPublic luôn cần ADMIN). */
  updateConversation: (id: string, input: UpdateConversationInput) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}`, { body: input }),

  /** Cập nhật quyền hạn nhóm (chỉ OWNER/ADMIN/MODERATOR). Tất cả field optional. */
  updateSettings: (id: string, input: Partial<GroupSettings>) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/settings`, { body: input }),

  // ─── Phân quyền thành viên (CONTRACT GIẢ ĐỊNH — chờ BE xác nhận) ────────────
  // 2 cấp quyền: OWNER (trưởng nhóm) + ADMIN (phó nhóm). role='MEMBER' = gỡ quyền phó.

  /** Đặt vai trò 1 thành viên (cấp/gỡ quyền phó nhóm). Chỉ OWNER. */
  setMemberRole: (conversationId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    apiClient.patch<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/role`,
      { body: { role } },
    ),

  /** Nhượng quyền trưởng nhóm cho 1 thành viên. Chỉ OWNER. */
  transferOwnership: (conversationId: string, userId: string) =>
    apiClient.post<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/transfer-owner`,
      { body: { userId } },
    ),

  /** Chặn (ban) 1 thành viên — chỉ role thấp hơn. Trả { ok: true }. */
  banMember: (conversationId: string, userId: string) =>
    apiClient.post<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/ban`,
    ),

  /** Bỏ chặn 1 thành viên. Trả { ok: true }. */
  unbanMember: (conversationId: string, userId: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/ban`,
    ),

  /** Danh sách thành viên đang bị chặn. Chuẩn hoá về BannedMember[] dù BE trả
   *  mảng trực tiếp hay bọc { items } / { data }. */
  listBannedMembers: async (conversationId: string): Promise<BannedMember[]> => {
    const res = await apiClient.get<unknown>(
      `/api/v1/conversations/${conversationId}/banned-members`,
    );
    if (Array.isArray(res)) return res as BannedMember[];
    const obj = res as { items?: BannedMember[]; data?: BannedMember[] } | null;
    return obj?.items ?? obj?.data ?? [];
  },

  // ─── Ghim tin nhắn (pinned messages) ────────────────────────────────────────
  // Contract theo FRONTEND/29-pinned-messages.md. Tối đa 5 tin / conversation.

  /** Ghim 1 tin. Trả Message đã giải mã. */
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

  // ─── Reactions (thả cảm xúc emoji) ─────────────────────────────────────────
  // Mỗi user 1 cảm xúc/tin: PUT để thả/đổi (ghi đè), DELETE để gỡ. BE trả
  // ReactionState { reactions[], total, myReaction } sau mỗi thao tác.
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
  listReactors: (
    conversationId: string,
    messageId: string,
    params?: { type?: ReactionType; limit?: number; before?: string },
  ) =>
    apiClient.get<{ data: Reactor[]; meta: { limit: number; nextCursor: string | null } }>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}/reactions`,
      { query: { ...params } },
    ),

} as const;
