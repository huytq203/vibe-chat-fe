import { apiClient } from '@/lib/api/client';
import { taskClient } from '@/features/tasks/lib/task-client';
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
  // Hai API này thuộc task-service → phải đi qua taskClient (proxy /task-proxy), không phải apiClient của chat.
  leaderboard: (projectId: string, period: ReportPeriod) =>
    taskClient.get<Leaderboard>(
      `/api/v1/projects/${projectId}/stats/leaderboard?period=${period}`,
    ),
  leaderboardAll: (period: ReportPeriod, projectId?: string) => {
    const query = new URLSearchParams({ period });
    if (projectId) query.set('projectId', projectId);
    return taskClient.get<Leaderboard & { period: ReportPeriod }>(
      `/api/v1/stats/leaderboard?${query.toString()}`,
    );
  },
  myPerformance: (period: ReportPeriod) =>
    taskClient.get<MyPerformance>(`/api/v1/stats/my-performance?period=${period}`),
};
