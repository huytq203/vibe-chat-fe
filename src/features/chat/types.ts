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

/** Thành viên đang bị chặn (xem 28-group-settings.md §4) — từ GET /conversations/{id}/banned-members. */
export type BannedMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Thời điểm bị chặn (nếu BE trả). */
  bannedAt?: string | null;
};

/** Phạm vi quyền hạn nhóm: ADMIN = OWNER/ADMIN/MODERATOR; ALL = mọi thành viên ACTIVE. */
export type PermissionScope = 'ADMIN' | 'ALL';

/** Cài đặt quyền hạn nhóm GROUP/CHANNEL (xem 28-group-settings.md). */
export type GroupSettings = {
  /** Cho vào nhóm qua link/QR chia sẻ. */
  joinByLink: boolean;
  /** Vào qua link/QR phải được phê duyệt (tạo join-request thay vì vào thẳng). */
  joinApproval: boolean;
  /** Ai được sửa tên/mô tả nhóm. */
  whoCanEditInfo: PermissionScope;
  /** Quyền chat — ai được gửi tin. ADMIN = khoá nhóm. */
  whoCanSend: PermissionScope;
  /** Ai được ghim/bỏ ghim tin. */
  whoCanPin: PermissionScope;
  /** Bật badge đánh dấu tin của trưởng/phó nhóm trên UI. */
  markLeaderMessages: boolean;
};

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
  /** Cài đặt quyền hạn — chỉ có ở GROUP/CHANNEL (xem 28-group-settings.md). */
  settings?: GroupSettings;
  /** Số tin đang ghim (tối đa 5) — biết mà không cần gọi endpoint pinned (xem 29). */
  pinnedCount?: number;
  /** Public/private nhóm — đổi qua PATCH /conversations/{id}. */
  isPublic?: boolean;
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

/** 7 loại cảm xúc cố định (whitelist) — khớp ReactionType của BE. */
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'THANKS';

/** 1 dòng summary cảm xúc trên 1 tin nhắn (gom theo loại). */
export type MessageReaction = {
  type: ReactionType;
  count: number;
};

/** Trạng thái cảm xúc của 1 tin dưới góc nhìn người gọi — BE trả khi set/remove. */
export type ReactionState = {
  reactions: MessageReaction[];
  total: number;
  myReaction: ReactionType | null;
};

/** 1 người đã thả cảm xúc — dùng cho popup "ai đã react". */
export type Reactor = {
  userId: string;
  type: ReactionType;
  reactedAt: string;
};

/** 1 trang danh sách người đã thả cảm xúc (cursor-based). */
export type ReactorsPage = {
  items: Reactor[];
  nextCursor: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  encryptionType: EncryptionType;
  plaintext: string | null;
  attachments: Attachment[];
  /** Summary cảm xúc gom theo loại (BE luôn trả; có thể rỗng). */
  reactions?: MessageReaction[];
  /** Cảm xúc của chính người gọi trên tin này. NULL nếu chưa thả. */
  myReaction?: ReactionType | null;
  contentPreview: string | null;
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  /** Danh sách @user được tag (group). BE đã filter chỉ giữ member hợp lệ. */
  mentions?: Mention[];
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

/**
 * Tag @user trong group. Offset tính theo độ dài chuỗi `plaintext` (UTF-16 code
 * unit của JS) — startOffset là vị trí ký tự '@', length là độ dài '@DisplayName'.
 * Xem FRONTEND/04-messages.md.
 */
export type Mention = {
  userId: string;
  startOffset: number;
  length: number;
};

/** Loại mark inline của rich text (xem spec rich-text-editor). */
export type RichMarkType =
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'color' | 'highlight' | 'link' | 'font';

/** 1 đoạn định dạng inline; offset theo UTF-16 của plaintext (đồng bộ Mention). */
export type RichMark = {
  start: number;
  end: number; // exclusive
  type: RichMarkType;
  /** color/highlight = preset key; link = URL; font = preset key. */
  value?: string;
};

/** Căn lề theo block (đoạn). */
export type RichBlock = {
  start: number;
  end: number;
  align: 'left' | 'center' | 'right';
};

/** Định dạng rich text lưu trong metadata.richText. */
export type RichText = {
  v: 1;
  marks: RichMark[];
  blocks: RichBlock[];
};

export type EditMessageInput = {
  conversationId: string;
  messageId: string;
  plaintext: string;
  /** Định dạng rich text mới (đặt vào metadata.richText). */
  metadata?: Record<string, unknown>;
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
  /** Tag @user (group, ≤50). BE filter bỏ user không phải member. */
  mentions?: Mention[];
  /** Metadata không nhạy cảm gửi kèm cho BE (optional). */
  metadata?: Record<string, unknown>;
  /** Tin tự huỷ sau N giây kể từ lúc gửi (5–2592000). Bỏ trống = tin thường.
   *  Xem 15-edit-recall-selfdestruct.md. */
  selfDestructTtl?: number;
  /** Blob URL cục bộ — chỉ để hiển thị optimistic, KHÔNG gửi lên BE. */
  previewUrl?: string;
  /** Attachment dựng sẵn để hiển thị optimistic ngay, KHÔNG gửi lên BE. */
  optimisticAttachment?: Attachment;
  /** Nhiều attachment optimistic (tin gộp nhiều file). Ưu tiên hơn optimisticAttachment. */
  optimisticAttachments?: Attachment[];
};

// ─── Contact card (chia sẻ danh thiếp) ─────────────────────────────────────────
// BE: message.type='CONTACT', metadata.contact = snapshot hồ sơ user được chia sẻ.

export type ContactCardMetadata = {
  contactUserId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

/** Đọc contact card từ message.metadata; null nếu không hợp lệ. */
export function readContactCard(message: Message): ContactCardMetadata | null {
  if (message.type !== 'CONTACT' || !message.metadata) return null;
  const c = (message.metadata as Record<string, unknown>).contact as
    | Partial<ContactCardMetadata>
    | undefined;
  if (!c || typeof c.contactUserId !== 'string') return null;
  return {
    contactUserId: c.contactUserId,
    displayName: typeof c.displayName === 'string' ? c.displayName : 'Người dùng',
    username: typeof c.username === 'string' ? c.username : '',
    avatarUrl: typeof c.avatarUrl === 'string' ? c.avatarUrl : null,
  };
}

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

// ─── Hẹn giờ gửi tin nhắn (scheduled messages) ─────────────────────────────────
// Tham chiếu BE: src/modules/messages/scheduled-messages.* — vòng đời PENDING →
// SENT/CANCELLED/FAILED. Chỉ chủ nhân thao tác được.

export type ScheduledMessageStatus = 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED';

export type ScheduledMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  /** Nội dung BE đã giải mã cho chính chủ xem lại. NULL nếu tin media-only. */
  plaintext: string | null;
  contentPreview: string | null;
  attachmentIds: string[];
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  selfDestructTtl: number | null;
  /** ISO — thời điểm sẽ gửi. */
  scheduledAt: string;
  status: ScheduledMessageStatus;
  /** UUID message thật khi đã gửi (status=SENT). */
  sentMessageId: string | null;
  /** Lý do thất bại (status=FAILED). */
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateScheduledMessageInput = {
  conversationId: string;
  /** ISO 8601 — phải ở tương lai (BE yêu cầu cách hiện tại ≥30s, ≤90 ngày). */
  scheduledAt: string;
  plaintext?: string;
  type?: MessageType;
  attachmentIds?: string[];
  metadata?: Record<string, unknown>;
  replyToMessageId?: string;
  mentions?: Mention[];
  selfDestructTtl?: number;
};

export type UpdateScheduledMessageInput = {
  conversationId: string;
  scheduledId: string;
  scheduledAt?: string;
  plaintext?: string;
  type?: MessageType;
  attachmentIds?: string[];
  metadata?: Record<string, unknown>;
  replyToMessageId?: string;
  mentions?: Mention[];
  selfDestructTtl?: number;
};
