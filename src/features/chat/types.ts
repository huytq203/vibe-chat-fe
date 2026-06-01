export type ConversationType = 'DIRECT' | 'GROUP' | 'CHANNEL';
export type EncryptionType = 'SERVER' | 'E2E';
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

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  keyVersion: number;
};

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
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
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

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  encryptionType: EncryptionType;
  plaintext: string | null;
  encrypted: EncryptedBlob | null;
  attachments: Attachment[];
  contentPreview: string | null;
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  isView: boolean;
  createdAt: string;
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
