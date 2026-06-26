'use client';

import { useConversations } from '@/features/chat/hooks/use-query';
import { useSystemNotifCount } from '@/features/notifications';

type NavUnread = {
  /** Số hội thoại có tin nhắn chưa đọc (bỏ qua conv đang khoá). */
  messageCount: number;
  /** Số thông báo hệ thống chưa đọc. */
  notifCount: number;
  /** Tổng tin nhắn + thông báo chưa đọc — dùng cho badge ở NavSidebar. */
  total: number;
};

/** Tổng hợp số chưa đọc (tin nhắn + thông báo) để hiển thị badge trên rail NavSidebar. */
export function useNavUnread(): NavUnread {
  const { data: conversations = [] } = useConversations();
  const notifCount = useSystemNotifCount().data?.unreadCount ?? 0;
  const messageCount = conversations.reduce(
    (sum, c) => sum + (!c.isLocked && c.unreadCount > 0 ? 1 : 0),
    0,
  );
  return { messageCount, notifCount, total: messageCount + notifCount };
}
