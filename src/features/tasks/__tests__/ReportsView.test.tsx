import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { reportsApi } from '@/services/reports.api';
import { ReportsView } from '../components/reports/ReportsView';

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      { id: 'project-1', name: 'Halo' },
      { id: 'project-2', name: 'Trạm sáng tạo' },
    ],
    isPending: false,
  }),
}));

vi.mock('../services/tasks.api', () => ({
  tasksApi: {
    getStatsOverview: vi.fn().mockResolvedValue({
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      projects: [],
    }),
  },
}));

vi.mock('../lib/current-user', () => ({
  getCurrentUser: () => ({
    userId: 'user-1',
    displayName: 'An',
    avatarUrl: null,
  }),
}));

vi.mock('@/services/reports.api', () => ({
  reportsApi: {
    leaderboardAll: vi.fn(),
    myPerformance: vi.fn(),
    insights: vi.fn(),
  },
}));

const performanceData = {
  period: 'month' as const,
  completedTasks: 5,
  gems: 120,
  onTimeRate: 80,
  byProject: [
    { projectId: 'project-1', projectName: 'Halo', completedTasks: 3, gems: 90 },
    {
      projectId: 'project-2',
      projectName: 'Trạm sáng tạo',
      completedTasks: 2,
      gems: 30,
    },
  ],
};

const leaderboardData = {
  period: 'month' as const,
  entries: [
    {
      userId: 'user-2',
      displayName: 'Bình',
      completedTasks: 4,
      totalAssigned: 5,
      gems: 40,
      onTimeRate: null,
    },
    {
      userId: 'user-1',
      displayName: 'An',
      completedTasks: 5,
      totalAssigned: 6,
      gems: 120,
      onTimeRate: 80,
    },
  ],
};

const insightsData = {
  period: 'month' as const,
  from: '2026-08-01',
  to: '2026-08-31',
  timeline: [],
  byPriority: [],
  byTag: [],
  byColumn: [],
  gemBuckets: [],
  avgGem: null,
  dueBuckets: [],
  cycleTime: [],
  workload: [],
  weekdayHeat: [],
};

describe('màn hình Báo cáo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.leaderboardAll).mockResolvedValue(leaderboardData);
    vi.mocked(reportsApi.myPerformance).mockResolvedValue(performanceData);
    vi.mocked(reportsApi.insights).mockResolvedValue(insightsData);
  });

  it('gọi đúng API khi đổi kỳ và project', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsView />);

    await waitFor(() => {
      expect(reportsApi.leaderboardAll).toHaveBeenCalledWith('month', undefined);
      expect(reportsApi.myPerformance).toHaveBeenCalledWith('month');
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Tuần' }));
    await waitFor(() => {
      expect(reportsApi.leaderboardAll).toHaveBeenCalledWith('week', undefined);
      expect(reportsApi.myPerformance).toHaveBeenCalledWith('week');
    });

    const projectCombobox = screen.getByRole('combobox', { name: 'Project' });
    await user.click(projectCombobox);
    await user.click(await screen.findByRole('option', { name: 'Halo' }));

    await waitFor(() => {
      expect(reportsApi.leaderboardAll).toHaveBeenCalledWith('week', 'project-1');
    });
  });

  it('có lựa chọn Tất cả project và đánh dấu hàng của tôi', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsView />);

    const projectCombobox = screen.getByRole('combobox', { name: 'Project' });
    await user.click(projectCombobox);
    expect(await screen.findByRole('option', { name: 'Tất cả project' })).toBeInTheDocument();
    expect(await screen.findByText('Bạn')).toBeInTheDocument();
  });

  it('hiển thị hướng dẫn khi bảng thành viên rỗng', async () => {
    vi.mocked(reportsApi.leaderboardAll).mockResolvedValue({
      period: 'month',
      entries: [],
    });

    renderWithProviders(<ReportsView />);

    expect(
      await screen.findByText(
        'Chưa có task nào hoàn thành trong kỳ này. Đổi kỳ báo cáo hoặc tạo task đầu tiên.',
      ),
    ).toBeInTheDocument();
  });

  it('hiển thị lỗi và cho phép thử lại', async () => {
    vi.mocked(reportsApi.leaderboardAll).mockRejectedValue(new Error('Mất kết nối'));

    renderWithProviders(<ReportsView />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không tải được khối lượng theo thành viên.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(reportsApi.leaderboardAll).toHaveBeenCalledTimes(2));
  });
});
