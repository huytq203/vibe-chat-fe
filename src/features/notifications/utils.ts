import type { Notification, NotificationType } from './types';

export function getNotificationHref(n: Notification): string {
  switch (n.type) {
    case 'MESSAGE_NEW':
    case 'MESSAGE_MENTION':
      return n.conversationId ? `/chat/${n.conversationId}` : '/chat';
    case 'FRIEND_REQUEST_RECEIVED':
      return '/chat?friends=requests';
    case 'FRIEND_REQUEST_ACCEPTED':
      return '/chat?friends=list';
    case 'CONVERSATION_DELETED':
    default:
      return '/chat';
  }
}

const ICON_BY_TYPE: Record<NotificationType, string> = {
  FRIEND_REQUEST_RECEIVED: '👥',
  FRIEND_REQUEST_ACCEPTED: '🤝',
  MESSAGE_NEW: '💬',
  MESSAGE_MENTION: '📣',
  CONVERSATION_DELETED: '🗑️',
};

export function getNotificationIcon(type: NotificationType): string {
  return ICON_BY_TYPE[type] ?? '🔔';
}
