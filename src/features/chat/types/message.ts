import type { MessageReaction, ReactionType } from './reaction';

export type EncryptionType = 'NONE';
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
  | 'CALL'
  | 'REMINDER'
  | 'CHECKLIST'
  | 'BOOKMARK'
  | 'POLL';

export type LastMessagePreview = {
  id: string;
  senderId: string;
  type: MessageType;
  preview: string | null;
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
  viaBotId?: string | null;
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
  forwardFrom?: ForwardInfo | null;
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

export type ForwardInfo = {
  senderId: string | null;
  displayName: string;
  conversationId: string | null;
  originalSentAt: string;
};

export type StickerSnapshot = {
  stickerId: string;
  packId: string;
  url: string;
  width: number;
  height: number;
  emoji: string;
  isAnimated: boolean;
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
  /** Inline bot selection verified by BE before persisting. */
  viaBotId?: string;
  inlineQueryId?: string;
  inlineResultId?: string;
  inlineQuery?: string;
};

/** Metadata cục bộ gắn vào optimistic message (KHÔNG đến từ BE). */
export type OptimisticMeta = {
  previewUrl?: string;
  optimistic?: boolean;
  failed?: boolean;
  clientNonce?: string;
};

export type MessagesPage = {
  items: Message[];
  nextCursor: string | null;
};

/** Loại nội dung chia sẻ cho tab "Ảnh & Video / Tài liệu / Liên kết" (xem 20-shared-content.md). */
export type SharedContentType = 'MEDIA' | 'FILE' | 'LINK';
