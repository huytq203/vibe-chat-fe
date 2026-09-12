'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/reports.api';
import { tasksApi } from '../services/tasks.api';
import type { ReportPeriod } from '../types';

/**
 * Báo cáo theo project: stats + leaderboard.
 * Truyền `null` khi chưa chọn project — query sẽ không chạy.
 */
export function useReports(projectId: string | null, period: ReportPeriod = 'month') {
  const stats = useQuery({
    queryKey: ['tasks', projectId, 'stats'],
    queryFn: () => tasksApi.getProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const leaderboard = useQuery({
    queryKey: ['tasks', projectId, 'leaderboard', period],
    queryFn: () => reportsApi.leaderboard(projectId!, period),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  return { stats, leaderboard };
}

export function useMyPerformance(period: ReportPeriod) {
  return useQuery({
    queryKey: ['tasks', 'my-performance', period],
    queryFn: () => reportsApi.myPerformance(period),
    staleTime: 60_000,
  });
}

/** Tổng quan stats mọi project của user (tab báo cáo, chưa chọn project). */
export function useStatsOverview() {
  return useQuery({
    queryKey: ['tasks', 'overview'],
    queryFn: () => tasksApi.getStatsOverview(),
    staleTime: 60_000,
  });
}
