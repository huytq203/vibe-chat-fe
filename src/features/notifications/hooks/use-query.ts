'use client';

import { useQuery } from '@tanstack/react-query';
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

export function useUnreadCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
