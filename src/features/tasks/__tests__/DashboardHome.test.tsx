import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { MyTask, StatsOverview } from '../types';

const useProjectsInfiniteMock = vi.fn();
const useMyTasksMock = vi.fn();
const useStatsOverviewMock = vi.fn();
const useActivityFeedMock = vi.fn();

vi.mock('../hooks/useProjectsInfinite', () => ({
  useProjectsInfinite: () => useProjectsInfiniteMock(),
}));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));
vi.mock('../hooks/useMyTasks', () => ({ useMyTasks: () => useMyTasksMock() }));
vi.mock('../hooks/useReports', () => ({
  useStatsOverview: () => useStatsOverviewMock(),
  useReports: () => ({ stats: {}, leaderboard: {} }),
}));
vi.mock('../hooks/useActivityFeed', () => ({ useActivityFeed: () => useActivityFeedMock() }));

import { Dashboard } from '../components/dashboard/Dashboard';

const DAY = 24 * 60 * 60 * 1000;

function task(id: string, title: string, dueOffsetDays: number | null): MyTask {
  return {
    id,
    title,
    projectId: 'p1',
    projectName: 'Dự án A',
    columnId: 'c1',
    columnName: 'Todo',
    priority: 'P1',
    dueDate: dueOffsetDays === null ? null : new Date(Date.now() + dueOffsetDays * DAY).toISOString(),
    isPinned: false,
    updatedAt: new Date().toISOString(),
  };
}

const OVERVIEW: StatsOverview = {
  totalProjects: 3,
  totalTasks: 20,
  completedTasks: 8,
  overdueTasks: 2,
  projects: [
    {
      projectId: 'p1',
      projectName: 'Dự án A',
      totalTasks: 20,
      completedTasks: 8,
      inProgressTasks: 5,
      overdueTasks: 2,
      completionRate: 40,
    },
  ],
};

function emptyProjects() {
  return {
    data: { pages: [{ data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 1, hasNext: false, hasPrev: false } }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  };
}

describe('Dashboard — trang chủ Work', () => {
  beforeEach(() => {
    useProjectsInfiniteMock.mockReturnValue(emptyProjects());
    useMyTasksMock.mockReturnValue({ data: [], isPending: false, isError: false });
    useStatsOverviewMock.mockReturnValue({ data: OVERVIEW, isPending: false, isError: false });
    useActivityFeedMock.mockReturnValue({ data: { items: [], total: 0 }, isPending: false, isError: false });
  });

  it('dải chỉ số hiện đủ 4 ô từ stats overview', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Tổng việc')).toBeInTheDocument();
    expect(screen.getByText('trên 3 dự án')).toBeInTheDocument();
    expect(screen.getByText('40% tổng việc')).toBeInTheDocument();
    expect(screen.getByText('cần xử lý sớm')).toBeInTheDocument();
  });

  it('lỗi stats không làm hỏng phần còn lại của trang', () => {
    useStatsOverviewMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/không tải được số liệu tổng quan/i)).toBeInTheDocument();
    expect(screen.getByText('Việc của bạn')).toBeInTheDocument();
  });

  it('việc của bạn gom nhóm theo hạn và tóm tắt ở hero', () => {
    useMyTasksMock.mockReturnValue({
      data: [task('t1', 'Sửa login', -2), task('t2', 'Viết test', 0), task('t3', 'Dọn backlog', null)],
      isPending: false,
      isError: false,
    });
    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: /quá hạn/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hôm nay/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /chưa đặt hạn/i })).toBeInTheDocument();
    expect(screen.getByText('1 việc quá hạn và 1 việc đến hạn hôm nay.')).toBeInTheDocument();
  });

  it('không có việc nào thì hero nói rõ và panel hiện empty state', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Không có việc nào đến hạn hôm nay.')).toBeInTheDocument();
    expect(screen.getByText(/chưa có nhiệm vụ nào được giao/i)).toBeInTheDocument();
  });

  it('panel hoạt động hiện empty state khi feed rỗng', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/chưa có hoạt động nào/i)).toBeInTheDocument();
  });
});
