import { apiClient } from '@/lib/api/client';
import type { CreateReportInput } from '@/features/reports/types';

/** Transport tạo báo cáo (E1): POST /reports — rate-limit 10/phút, cần auth. */
export const reportsApi = {
  create: (input: CreateReportInput) =>
    apiClient.post<{ id: string }>('/api/v1/reports', { body: input }),
};
