'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { friendKeys, notificationKeys, userKeys } from '@/services/keys';
import type { Notification, NotificationPage } from '@/features/notifications/types';

/**
 * Lắng nghe event `notification:new` từ WS — invalidate cache + show in-app toast.
 * FCM background push được xử lý độc lập trong service worker
 * (public/firebase-messaging-sw.js).
 */
export function useNotificationRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;

    function onNotificationNew(n: Notification) {
      // Tăng badge: bump unread-count cache trước, invalidate sau.
      qc.setQueryData<{ unreadCount: number } | undefined>(
        notificationKeys.unreadCount(),
        (prev) => ({ unreadCount: (prev?.unreadCount ?? 0) + 1 }),
      );

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

      if (typeof document !== 'undefined' && document.hasFocus()) {
        toast(n.title, { description: n.body ?? undefined });
      }
    }

    socket.on('notification:new', onNotificationNew);
    return () => {
      socket.off('notification:new', onNotificationNew);
    };
  }, [isAuthed, qc]);
}
