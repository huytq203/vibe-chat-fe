import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsApi } from '@/services/reports.api';
import { taskClient } from '../lib/task-client';

vi.mock('../lib/task-client', () => ({
  taskClient: { get: vi.fn() },
}));

describe('API báo cáo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gọi leaderboard gộp mọi project theo kỳ', async () => {
    vi.mocked(taskClient.get).mockResolvedValue({ period: 'month', entries: [] });

    await reportsApi.leaderboardAll('month');

    expect(taskClient.get).toHaveBeenCalledWith('/api/v1/stats/leaderboard?period=month');
  });

  it('mã hóa project trong query string của leaderboard', async () => {
    vi.mocked(taskClient.get).mockResolvedValue({ period: 'week', entries: [] });

    await reportsApi.leaderboardAll('week', 'project / 01');

    expect(taskClient.get).toHaveBeenCalledWith(
      '/api/v1/stats/leaderboard?period=week&projectId=project+%2F+01',
    );
  });

  it('nên gọi endpoint insights với kỳ và project đã chọn', async () => {
    vi.mocked(taskClient.get).mockResolvedValue({ period: 'week' });

    await reportsApi.insights('week', 'project-1');

    expect(taskClient.get).toHaveBeenCalledWith(
      '/api/v1/stats/insights?period=week&projectId=project-1',
    );
  });
});
