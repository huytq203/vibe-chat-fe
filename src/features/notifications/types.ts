export type NotificationType =
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'MESSAGE_NEW'
  | 'MESSAGE_MENTION'
  // CALL_INCOMING là transient (chỉ push đánh thức device, KHÔNG lưu inbox) — xem 07-notifications.md.
  | 'CALL_INCOMING'
  | 'CALL_MISSED'
  | 'CONVERSATION_DELETED';

export type Notification = {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string | null;
  title: string;
  body: string | null;
  conversationId: string | null;
  messageId: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

/** Payload WS `notification:cleared` — server auto-mark-read khi user đã xem nội dung gốc. */
export type NotificationClearedEvent = {
  scope: 'conversation' | 'friendRequest';
  conversationId?: string;
  types?: string[];
  actorId?: string;
  clearedCount: number;
};

export type DeviceType = 'WEB' | 'IOS' | 'ANDROID' | 'DESKTOP';

export type RegisterFcmTokenInput = {
  token: string;
  deviceType: DeviceType;
  userAgent?: string;
};
