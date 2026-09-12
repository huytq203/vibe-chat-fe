import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { reportsApi } from '@/services/reports.api';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import { ReportsView } from '../components/reports/ReportsView';

vi.mock('../services/tasks.api', () => ({
  tasksApi: {
    getStatsOverview: vi.fn().mockResolvedValue({
      totalProjects: 1,
      totalTasks: 3,
      completedTasks: 2,
      overdueTasks: 0,
      projects: [{
        projectId: 'project-1',
        projectName: 'Halo',
        totalTasks: 3,
        completedTasks: 2,
        inProgressTasks: 1,
        overdueTasks: 0,
        completionRate: 67,
      }],
    }),
    getProjectStats: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/reports.api', () => ({
  reportsApi: {
    leaderboard: vi.fn(),
    myPerformance: vi.fn(),
  },
}));

describe('báo cáo theo gem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTasksUIStore.setState({ selectedProjectId: 'project-1' });
    vi.mocked(reportsApi.leaderboard).mockResolvedValue({
      entries: [{
        userId: 'user-1',
        displayName: 'An',
        completedTasks: 2,
        totalAssigned: 3,
        gems: 85,
        onTimeRate: 50,
      }],
    });
    vi.mocked(reportsApi.myPerformance).mockResolvedValue({
      period: 'month',
      completedTasks: 2,
      gems: 85,
      onTimeRate: null,
      byProject: [{
        projectId: 'project-1',
        projectName: 'Halo',
        completedTasks: 2,
        gems: 85,
      }],
    });
  });

  it('hiện cột gem, đúng hạn và tải lại khi đổi kỳ', async () => {
    renderWithProviders(<ReportsView />);

    expect(await screen.findByText('Gem')).toBeInTheDocument();
    expect(screen.getAllByText('Đúng hạn')).toHaveLength(2);
    expect(screen.getAllByText('85')).not.toHaveLength(0);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(reportsApi.leaderboard).toHaveBeenCalledWith('project-1', 'month');

    fireEvent.change(screen.getByRole('combobox', { name: 'Kỳ báo cáo' }), {
      target: { value: 'week' },
    });

    await waitFor(() => {
      expect(reportsApi.leaderboard).toHaveBeenCalledWith('project-1', 'week');
      expect(reportsApi.myPerformance).toHaveBeenCalledWith('week');
    });
  });
});
