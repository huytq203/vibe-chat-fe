export type ConversationType = 'DIRECT' | 'GROUP' | 'CHANNEL';
export type EncryptionType = 'SERVER';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'FILE'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACT'
  | 'SYSTEM'
  | 'CALL';

export type LastMessagePreview = {
  id: string;
  senderId: string;
  type: MessageType;
  preview: string | null;
  createdAt: string;
};

export type ConversationMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  nickname: string | null;
  role: MemberRole;
};

/** Thứ hạng quyền: OWNER > ADMIN > MODERATOR > MEMBER (xem 16-group-members.md). */
export type MemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  encryptionType: EncryptionType;
  memberCount: number;
  messageCount: number;
  memberIds: string[];
  members?: ConversationMember[];
  lastMessage: LastMessagePreview | null;
  lastMessageAt: string | null;
  unreadCount: number;
  // Ghim hội thoại — conv đã ghim luôn nổi lên đầu danh sách. BE sẽ trả 2 field
  // này (endpoint pin đang chờ chốt — xem chatApi.pinConversation).
  isPinned?: boolean;
  pinnedAt?: string | null;
  isLocked?: boolean;
  // Mute per-user (đã normalize bởi BE). isMuted=true + mutedUntil=null = vĩnh viễn;
  // mutedUntil=<ISO> = tắt có hạn; hết hạn BE tự trả isMuted=false. Xem 22-mute-notifications.md.
  isMuted?: boolean;
  mutedUntil?: string | null;
  createdAt: string;
};

// ─── Join request (xin vào nhóm) ───────────────────────────────────────────
// Tham chiếu FRONTEND/16-group-members.md.

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

/** Thông tin người gửi yêu cầu — chỉ có ở endpoint list (cho admin). */
export type JoinRequestRequester = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type JoinRequest = {
  id: string;
  conversationId: string;
  status: JoinRequestStatus;
  /** Lý do xin vào (hoặc lý do từ chối sau khi reject). */
  reason: string | null;
  requester: JoinRequestRequester | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

/** File đính kèm trong message (server trả về). `downloadUrl` đã được server ký sẵn
 *  và nhúng cho MỌI member (cả người nhận). Có TTL → hết hạn refresh qua
 *  GET /conversations/:id/attachments/:mediaId/url. Xem 04-messages.md & 14-media-upload.md. */
export type Attachment = {
  mediaId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  downloadUrl: string | null;
};

/** Response refresh URL attachment (scoped theo conversation, member-accessible). */
export type AttachmentUrl = {
  mediaId: string;
  downloadUrl: string;
  expiresIn: number;
};

/** 1 emoji reaction tổng hợp trên 1 tin nhắn (gom theo emoji). BE chưa trả → optional. */
export type MessageReaction = {
  emoji: string;
  count: number;
  /** userId đã thả emoji này (xác định reactedByMe + tooltip). */
  userIds: string[];
  /** true nếu user hiện tại đã thả emoji này. */
  reactedByMe: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  encryptionType: EncryptionType;
  plaintext: string | null;
  attachments: Attachment[];
  /** Cảm xúc emoji trên tin. CHƯA có API BE — xem features/chat/reactions.ts (REACTIONS_ENABLED). */
  reactions?: MessageReaction[];
  contentPreview: string | null;
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  /** Thời điểm sửa gần nhất (BE set khi edit). NULL nếu chưa sửa. */
  editedAt?: string | null;
  isDeleted: boolean;
  /** Phạm vi gỡ tin. EVERYONE = thu hồi với mọi người. Xem 15-edit-recall-selfdestruct.md. */
  deletedFor?: 'NONE' | 'SENDER' | 'EVERYONE';
  /** ISO — thời điểm tin tự huỷ biến mất. NULL = tin thường. FE tự ẩn khi tới hạn. */
  expireAt?: string | null;
  isView: boolean;
  createdAt: string;
};

export type EditMessageInput = {
  conversationId: string;
  messageId: string;
  plaintext: string;
};

export type DeleteMessageInput = {
  conversationId: string;
  messageId: string;
};

export type SendMessageInput = {
  conversationId: string;
  /** Bắt buộc khi type=TEXT. Caption optional khi gửi media (BỎ HẲN nếu rỗng — đừng gửi ''). */
  plaintext?: string;
  clientNonce?: string;
  type?: MessageType;
  replyToMessageId?: string;
  /** UUID media đã READY (≤10). Bắt buộc khi type là IMAGE/VIDEO/AUDIO/FILE. */
  attachmentIds?: string[];
  /** Metadata không nhạy cảm gửi kèm cho BE (optional). */
  metadata?: Record<string, unknown>;
  /** Tin tự huỷ sau N giây kể từ lúc gửi (5–2592000). Bỏ trống = tin thường.
   *  Xem 15-edit-recall-selfdestruct.md. */
  selfDestructTtl?: number;
  /** Blob URL cục bộ — chỉ để hiển thị optimistic, KHÔNG gửi lên BE. */
  previewUrl?: string;
  /** Attachment dựng sẵn để hiển thị optimistic ngay, KHÔNG gửi lên BE. */
  optimisticAttachment?: Attachment;
};

// ─── Media ────────────────────────────────────────────────────────────────────
// Tham chiếu doc FRONTEND/14-media-upload.md

export type MediaCategory =
  | 'AVATAR'
  | 'THUMBNAIL'
  | 'VOICE'
  | 'VIDEO'
  | 'ATTACHMENT';

export type MediaStatus = 'PENDING' | 'READY' | 'DELETED';

export type MediaResponse = {
  id: string;
  category: MediaCategory;
  status: MediaStatus;
  mimeType: string;
  size: number;
  originalName: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  downloadUrl: string | null;
  createdAt: string;
};

export type PresignResponse = {
  id: string;
  uploadUrl: string;
  method: 'PUT';
  contentType: string;
  expiresIn: number;
};

export type PresignInput = {
  category: MediaCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type MediaDimensions = {
  width?: number;
  height?: number;
  duration?: number;
};

/** Metadata cục bộ gắn vào optimistic message (KHÔNG đến từ BE). */
export type OptimisticMeta = {
  previewUrl?: string;
  optimistic?: boolean;
  failed?: boolean;
  clientNonce?: string;
};

export type Presence = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastSeenLabel: string | null;
};

export type MessagesPage = {
  items: Message[];
  nextCursor: string | null;
};

/** Loại nội dung chia sẻ cho tab "Ảnh & Video / Tài liệu / Liên kết" (xem 20-shared-content.md). */
export type SharedContentType = 'MEDIA' | 'FILE' | 'LINK';

/** Nhóm chung giữa mình và 1 user khác (xem 26-common-groups.md). */
export type CommonGroupItem = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  memberCount: number;
};

export type CommonGroupsPage = {
  items: CommonGroupItem[];
  nextCursor: string | null;
};
