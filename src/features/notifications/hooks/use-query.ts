'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications.api';
import { notificationKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';

const DEFAULT_LIMIT = 20;

export function useNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_LIMIT;
  const unreadOnly = params?.unreadOnly ?? false;
  return useQuery({
    queryKey: notificationKeys.list({ page, limit, unreadOnly }),
    queryFn: () => notificationsApi.list({ page, limit, unreadOnly }),
    enabled: isAuthed,
    staleTime: 15_000,
  });
}

/** Inbox dạng cuộn vô hạn (page-based) — cho panel danh sách thông báo. */
export function useNotificationsInfinite(limit = DEFAULT_LIMIT) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      notificationsApi.list({ page: pageParam, limit, unreadOnly: false }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: isAuthed,
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

/** Chỉ đếm thông báo hệ thống (kết bạn, cuộc gọi nhỡ, tài khoản) — dùng cho badge chuông.
 * Tin nhắn không được tính vì đã có unreadCount riêng theo từng hội thoại.
 */
export function useSystemNotifCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationKeys.unreadCount('system'),
    queryFn: () => notificationsApi.unreadCount({ category: 'system' }),
    enabled: isAuthed,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
