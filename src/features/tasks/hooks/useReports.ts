'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

/**
 * Báo cáo theo project: stats + leaderboard.
 * Truyền `null` khi chưa chọn project — query sẽ không chạy.
 */
export function useReports(projectId: string | null) {
  const stats = useQuery({
    queryKey: ['tasks', projectId, 'stats'],
    queryFn: () => tasksApi.getProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const leaderboard = useQuery({
    queryKey: ['tasks', projectId, 'leaderboard'],
    queryFn: () => tasksApi.getLeaderboard(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  return { stats, leaderboard };
}

/** Tổng quan stats mọi project của user (tab báo cáo, chưa chọn project). */
export function useStatsOverview() {
  return useQuery({
    queryKey: ['tasks', 'overview'],
    queryFn: () => tasksApi.getStatsOverview(),
    staleTime: 60_000,
  });
}
