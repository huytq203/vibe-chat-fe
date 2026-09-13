'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/reports.api';
import { tasksApi } from '../services/tasks.api';
import type { ReportPeriod } from '../types';

interface UseReportsParams {
  period: ReportPeriod;
  projectId?: string;
}

/** Hai truy vấn chính của tab Báo cáo, cùng phụ thuộc vào bộ lọc hiện tại. */
export function useReports({ period, projectId }: UseReportsParams) {
  const leaderboard = useQuery({
    queryKey: ['tasks', 'reports', 'leaderboard', period, projectId ?? null],
    queryFn: () => reportsApi.leaderboardAll(period, projectId),
    staleTime: 60_000,
  });
  const myPerformance = useQuery({
    queryKey: ['tasks', 'reports', 'my-performance', period, projectId ?? null],
    queryFn: () => reportsApi.myPerformance(period),
    staleTime: 60_000,
  });
  return { leaderboard, myPerformance };
}

/** Tổng quan stats mọi project của user (tab báo cáo, chưa chọn project). */
export function useStatsOverview() {
  return useQuery({
    queryKey: ['tasks', 'overview'],
    queryFn: () => tasksApi.getStatsOverview(),
    staleTime: 60_000,
  });
}
