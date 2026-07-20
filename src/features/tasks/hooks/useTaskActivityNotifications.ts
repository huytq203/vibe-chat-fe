'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { getCurrentUser } from '../lib/current-user';
import { useActivityFeed } from './useActivityFeed';

const LAST_SEEN_KEY = 'halo:tasks:activity-last-seen';
const READ_IDS_KEY = 'halo:tasks:activity-read-ids';
const lastSeenQueryKey = ['tasks', 'feed', 'last-seen'] as const;
const readIdsQueryKey = ['tasks', 'feed', 'read-ids'] as const;

/** Feed hoạt động kèm trạng thái chưa đọc dùng chung cho header và navigation rail. */
export function useTaskActivityNotifications() {
  const qc = useQueryClient();
  const isAuthed = useAuthStore((state) => state.isAuthenticated);
  const feed = useActivityFeed(1, 20);
  const currentUserId = getCurrentUser()?.userId;
  const lastSeen = useQuery({
    queryKey: lastSeenQueryKey,
    enabled: isAuthed,
    staleTime: Infinity,
    queryFn: () => {
      const stored = window.localStorage.getItem(LAST_SEEN_KEY);
      if (stored) return stored;
      const initial = new Date().toISOString();
      window.localStorage.setItem(LAST_SEEN_KEY, initial);
      return initial;
    },
  });
  const readIds = useQuery({
    queryKey: readIdsQueryKey,
    enabled: isAuthed,
    staleTime: Infinity,
    queryFn: () => {
      const stored = window.localStorage.getItem(READ_IDS_KEY);
      if (!stored) return [] as string[];
      try {
        return JSON.parse(stored) as string[];
      } catch {
        return [] as string[];
      }
    },
  });

  const isUnread = (activity: { id: string; actorId: string; createdAt: string }) =>
    !!lastSeen.data &&
    activity.actorId !== currentUserId &&
    activity.createdAt > lastSeen.data &&
    !(readIds.data ?? []).includes(activity.id);

  const unreadCount = (feed.data?.items ?? []).filter(isUnread).length;

  const markRead = (activityId: string) => {
    const next = Array.from(new Set([...(readIds.data ?? []), activityId])).slice(-200);
    window.localStorage.setItem(READ_IDS_KEY, JSON.stringify(next));
    qc.setQueryData(readIdsQueryKey, next);
  };

  const markAllRead = () => {
    const seenAt = new Date().toISOString();
    window.localStorage.setItem(LAST_SEEN_KEY, seenAt);
    window.localStorage.setItem(READ_IDS_KEY, '[]');
    qc.setQueryData(lastSeenQueryKey, seenAt);
    qc.setQueryData(readIdsQueryKey, []);
  };

  return { feed, unreadCount, isUnread, markRead, markAllRead };
}
