import type {
  JoinRequestStatus,
  Message,
  MessageReaction,
  ReactionType,
} from '@/features/chat/types';

export type NotifyPayload = { conversationId: string; message: Message };
export type ReadPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
};
export type TypingPayload = {
  conversationId: string;
  userId: string;
  state: 'start' | 'stop';
};
export type ConversationDeletedPayload = {
  conversationId: string;
  deletedBy?: string;
  deletedAt?: string;
};
// BE có thể bắn full Message (đã isDeleted=true) hoặc chỉ id — handle cả hai.
export type MessageDeletedPayload =
  | Message
  | { conversationId: string; messageId: string; deletedAt?: string };

export type MembersAddedPayload = {
  conversationId: string;
  addedUserIds: string[];
  addedBy?: string;
  at?: string;
};
// Hồ sơ 1 user vừa đổi (tên/avatar/ảnh bìa/bio) — bắn tới chính chủ (đa thiết bị) + bạn bè.
export type UserUpdatedPayload = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  at?: string;
};
export type MemberRemovedPayload = {
  conversationId: string;
  userId: string;
  removedBy?: string;
  reason?: 'KICKED' | 'LEFT';
  at?: string;
};
export type JoinRequestPayload = {
  conversationId: string;
  requestId: string;
  requesterId: string;
  reason?: string | null;
  at?: string;
};
export type JoinRequestResolvedPayload = {
  conversationId: string;
  requestId: string;
  status: JoinRequestStatus;
  reviewedBy?: string;
  at?: string;
};
export type MuteUpdatedPayload = {
  conversationId: string;
  isMuted: boolean;
  mutedUntil: string | null;
};
// Đổi tên/mô tả/settings/isPublic của nhóm (xem 28-group-settings.md).
export type ConversationUpdatedPayload = {
  conversationId: string;
  updatedBy?: string;
  at?: string;
};
// Ghim/bỏ ghim tin (xem 29-pinned-messages.md).
export type PinUpdatedPayload = {
  conversationId: string;
  action: 'PINNED' | 'UNPINNED';
  messageId: string;
  by?: string;
  at?: string;
};
// Thả/đổi/gỡ cảm xúc tin nhắn (xem reactions). BE gửi summary mới + actor.
export type ReactionUpdatedPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  action: 'SET' | 'REMOVED';
  type: ReactionType | null;
  reactions: MessageReaction[];
  total: number;
  at?: string;
};
