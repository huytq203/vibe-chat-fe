'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { normalizeDisplayName } from '../lib/normalize-display-name';

/**
 * Đồng bộ profile hiện tại sang UserSnapshot của task-service.
 * Việc invalidate sau khi sync giúp dữ liệu mojibake đã lưu trước đây được làm mới
 * trong assignee, comment, activity và board mà không cần gỡ/gán lại người dùng.
 */
export function useCurrentUserSnapshotSync(): void {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const rawDisplayName = user?.displayName?.trim() || user?.username.trim() || user?.id || '';
  const displayName = normalizeDisplayName(rawDisplayName);

  const sync = useQuery({
    queryKey: ['task-user-snapshot', user?.id, displayName, user?.avatarUrl],
    queryFn: () =>
      tasksApi.syncCurrentUserSnapshot({
        displayName,
        avatarUrl: user?.avatarUrl ?? null,
      }),
    enabled: Boolean(user && displayName),
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (!sync.dataUpdatedAt) return;
    void queryClient.invalidateQueries({ queryKey: taskKeys.all });
  }, [queryClient, sync.dataUpdatedAt]);
}
