'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { cipherOn, getSocket } from '@/lib/ws/socket';
import { isElectron, showElectronNotification } from '@/lib/electron';
import { useAuthStore } from '@/features/auth';
import { friendKeys, notificationKeys, userKeys } from '@/services/keys';
import type {
  Notification,
  NotificationClearedEvent,
  NotificationPage,
} from '@/features/notifications/types';

/**
 * Lắng nghe `notification:new` (prepend inbox + tăng badge + toast) và
 * `notification:cleared` (server auto-mark-read khi user đã xem nội dung gốc —
 * FE chỉ giảm badge + patch cache, KHÔNG gọi markRead). Xem 07-notifications.md.
 * FCM background push xử lý độc lập trong service worker (public/firebase-messaging-sw.js).
 */
export function useNotificationRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeConversationId = params.id ?? null;

  // Ref giữ hội thoại đang mở để handler socket đọc giá trị mới nhất
  // mà không phải re-subscribe mỗi lần đổi hội thoại.
  const activeConvRef = useRef(activeConversationId);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;

    function onNotificationNew(n: Notification) {
      // CALL_INCOMING là transient (không lưu inbox) — call UI đã xử lý qua call-socket.
      if (n.type === 'CALL_INCOMING') return;

      // Tăng badge: bump unread-count cache trước, invalidate sau.
      qc.setQueryData<{ unreadCount: number } | undefined>(
        notificationKeys.unreadCount(),
        (prev) => ({ unreadCount: (prev?.unreadCount ?? 0) + 1 }),
      );

      // System badge (chuông): tất cả trừ MESSAGE_NEW và MESSAGE_MENTION
      // (tin nhắn đã có unreadCount riêng theo hội thoại, không tính vào system).
      const isMessage = n.type === 'MESSAGE_NEW' || n.type === 'MESSAGE_MENTION';
      if (!isMessage) {
        qc.setQueryData<{ unreadCount: number } | undefined>(
          notificationKeys.unreadCount('system'),
          (prev) => ({ unreadCount: (prev?.unreadCount ?? 0) + 1 }),
        );
      }

      // Prepend vào page đầu tiên nếu đang mở danh sách.
      const entries = qc.getQueriesData<NotificationPage>({
        queryKey: notificationKeys.lists(),
      });
      for (const [key, page] of entries) {
        if (!page) continue;
        qc.setQueryData<NotificationPage>(key, {
          ...page,
          items: [n, ...page.items].slice(0, page.limit),
          total: page.total + 1,
          unreadCount: page.unreadCount + 1,
        });
      }

      // Side-effect theo type: invalidate đúng cache để UI tab khác cập nhật ngay
      // (vd FindFriendsPanel tab "Lời mời" cần refresh khi nhận FRIEND_REQUEST_RECEIVED).
      switch (n.type) {
        case 'FRIEND_REQUEST_RECEIVED':
          qc.invalidateQueries({ queryKey: friendKeys.incoming() });
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;
        case 'FRIEND_REQUEST_ACCEPTED':
          qc.invalidateQueries({ queryKey: friendKeys.outgoing() });
          qc.invalidateQueries({ queryKey: friendKeys.list() });
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;
        default:
          break;
      }

      // List cuộn vô hạn (panel chuông) giữ shape InfiniteData → chỉ invalidate.
      qc.invalidateQueries({ queryKey: notificationKeys.infinite() });
      if (!isMessage) {
        qc.invalidateQueries({ queryKey: notificationKeys.unreadCount('system') });
      }

      // Đang mở đúng hội thoại của tin → không cần toast (user đã thấy tin).
      const inActiveConv = Boolean(n.conversationId) && n.conversationId === activeConvRef.current;

      // App đang xem → toast trong app. App nền: web đã có FCM service worker đẩy,
      // còn desktop (Electron) không có push nền → bắn native notification qua socket.
      const focused = typeof document !== 'undefined' && document.hasFocus();
      if (focused) {
        if (inActiveConv) return;
        const convId = n.conversationId;
        toast(n.title, {
          description: n.body ?? undefined,
          // Click "Xem" → nhảy sang hội thoại của tin (chỉ hiện khi đang ở hội thoại khác).
          action: convId
            ? { label: 'Xem', onClick: () => router.replace(`/chat/${convId}`, { scroll: false }) }
            : undefined,
        });
      } else if (isElectron()) {
        showElectronNotification({ title: n.title, body: n.body ?? undefined });
      }
    }

    // Server tự mark read khi user đã xem nội dung gốc (đọc tin / xử lý lời mời...)
    // → giảm badge + set isRead trong cache theo filter của scope.
    function onNotificationCleared(e: NotificationClearedEvent) {
      qc.setQueryData<{ unreadCount: number } | undefined>(
        notificationKeys.unreadCount(),
        (prev) => ({ unreadCount: Math.max(0, (prev?.unreadCount ?? 0) - e.clearedCount) }),
      );

      const matches = (n: Notification): boolean => {
        if (e.scope === 'conversation') {
          return (
            Boolean(e.conversationId) &&
            n.conversationId === e.conversationId &&
            (!e.types || e.types.includes(n.type))
          );
        }
        return n.type === 'FRIEND_REQUEST_RECEIVED' && (!e.actorId || n.actorId === e.actorId);
      };

      const now = new Date().toISOString();
      const entries = qc.getQueriesData<NotificationPage>({
        queryKey: notificationKeys.lists(),
      });
      for (const [key, page] of entries) {
        if (!page) continue;
        let cleared = 0;
        const items = page.items.map((n) => {
          if (n.isRead || !matches(n)) return n;
          cleared += 1;
          return { ...n, isRead: true, readAt: now };
        });
        if (cleared > 0) {
          qc.setQueryData<NotificationPage>(key, {
            ...page,
            items,
            unreadCount: Math.max(0, page.unreadCount - cleared),
          });
        }
      }
      // List unreadOnly cần loại bỏ item đã đọc → refetch cho chuẩn (patch trên chỉ là optimistic).
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.infinite() });
      // System badge cần sync lại (không đủ thông tin xác định loại nào bị clear).
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount('system') });
    }

    const unsubNotificationNew = cipherOn('notification:new', onNotificationNew as (data: unknown) => void);
    const unsubNotificationCleared = cipherOn('notification:cleared', onNotificationCleared as (data: unknown) => void);
    return () => {
      unsubNotificationNew();
      unsubNotificationCleared();
    };
  }, [isAuthed, qc, router]);
}
