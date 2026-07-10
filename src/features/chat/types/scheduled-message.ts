import type { MessageType, Mention } from './message';

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
