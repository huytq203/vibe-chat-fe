export type NotificationType =
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'MESSAGE_NEW'
  | 'MESSAGE_MENTION'
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

export type DeviceType = 'WEB' | 'IOS' | 'ANDROID' | 'DESKTOP';

export type RegisterFcmTokenInput = {
  token: string;
  deviceType: DeviceType;
  userAgent?: string;
};
