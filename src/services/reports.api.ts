import { apiClient } from '@/lib/api/client';
import type { CreateReportInput } from '@/features/reports/types';
import type {
  Leaderboard,
  MyPerformance,
  ReportPeriod,
} from '@/features/tasks/types';

/** Transport tạo báo cáo (E1): POST /reports — rate-limit 10/phút, cần auth. */
export const reportsApi = {
  create: (input: CreateReportInput) =>
    apiClient.post<{ id: string }>('/api/v1/reports', { body: input }),
  leaderboard: (projectId: string, period: ReportPeriod) =>
    apiClient.get<Leaderboard>(
      `/api/v1/projects/${projectId}/stats/leaderboard`,
      { query: { period } },
    ),
  myPerformance: (period: ReportPeriod) =>
    apiClient.get<MyPerformance>('/api/v1/stats/my-performance', {
      query: { period },
    }),
};
