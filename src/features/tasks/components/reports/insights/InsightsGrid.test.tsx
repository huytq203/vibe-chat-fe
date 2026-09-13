import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cloneElement, isValidElement } from 'react';
import type { ResponsiveContainerProps } from 'recharts';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { reportsApi } from '@/services/reports.api';
import type { Insights } from '../../../types';
import { CompletionHeatmap } from './CompletionHeatmap';
import { GemHistogram } from './GemHistogram';
import { InsightsGrid } from './InsightsGrid';
import { MemberRadar } from './MemberRadar';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  const ResponsiveContainerMock = ({ children }: ResponsiveContainerProps) => (
    <div style={{ width: 800, height: 300 }}>
      {isValidElement<{ width?: number; height?: number }>(children)
        ? cloneElement(children, { width: 800, height: 300 })
        : children}
    </div>
  );
  return { ...actual, ResponsiveContainer: ResponsiveContainerMock };
});

vi.mock('@/services/reports.api', () => ({
  reportsApi: {
    insights: vi.fn(),
  },
}));

const workload: Insights['workload'] = [
  { userId: 'u1', displayName: 'An', open: 2, overdue: 0, gemsOpen: 20, completed: 8, gems: 90, onTimeRate: 90 },
  { userId: 'u2', displayName: 'Bình', open: 3, overdue: 1, gemsOpen: 30, completed: 7, gems: 80, onTimeRate: 80 },
  { userId: 'u3', displayName: 'Chi', open: 4, overdue: 1, gemsOpen: 40, completed: 6, gems: 70, onTimeRate: 70 },
  { userId: 'u4', displayName: 'Dũng', open: 5, overdue: 2, gemsOpen: 50, completed: 5, gems: 60, onTimeRate: 60 },
  { userId: 'u5', displayName: 'Hà', open: 6, overdue: 2, gemsOpen: 60, completed: 4, gems: 50, onTimeRate: 50 },
  { userId: 'u6', displayName: 'Lan', open: 7, overdue: 3, gemsOpen: 70, completed: 3, gems: 40, onTimeRate: 40 },
];

const weekdayHeat: Insights['weekdayHeat'] = Array.from({ length: 91 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 5, 1 + index)).toISOString().slice(0, 10),
  completed: index === 8 ? 4 : 0,
}));

const insights: Insights = {
  period: 'month',
  from: '2026-06-01',
  to: '2026-08-30',
  timeline: [{ date: '2026-06-01', created: 4, completed: 3, gems: 20, open: 8 }],
  byPriority: [{ priority: 'HIGH', total: 4, completed: 2, overdue: 1 }],
  byTag: [{ tagId: 'tag-1', name: 'Frontend', color: '#0ea5e9', total: 4, completed: 2 }],
  byColumn: [
    { columnId: 'column-1', name: 'Cần làm', position: 1, count: 8 },
    { columnId: 'column-2', name: 'Đã xong', position: 2, count: 3 },
  ],
  gemBuckets: [
    { bucket: 'none', total: 2, completed: 0 },
    { bucket: '1-20', total: 4, completed: 2 },
  ],
  avgGem: 18,
  dueBuckets: [{ bucket: 'overdue', count: 2 }],
  cycleTime: [{ taskId: 'task-1', title: 'Làm báo cáo', gem: 20, days: 2, onTime: true, projectName: 'Halo' }],
  workload,
  weekdayHeat,
};

describe('bộ biểu đồ Insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.insights).mockResolvedValue(insights);
  });

  it('nên hiện skeleton khi đang tải', () => {
    vi.mocked(reportsApi.insights).mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<InsightsGrid period="month" />);
    expect(screen.getByRole('status', { name: 'Đang tải biểu đồ insights' })).toBeInTheDocument();
  });

  it('nên hiện lỗi và thử tải lại khi API thất bại', async () => {
    const user = userEvent.setup();
    vi.mocked(reportsApi.insights).mockRejectedValue(new Error('Mất kết nối'));
    renderWithProviders(<InsightsGrid period="month" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bộ biểu đồ insights.');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(reportsApi.insights).toHaveBeenCalledTimes(2));
  });

  it('nên hiện đủ mười panel khi có dữ liệu', async () => {
    renderWithProviders(<InsightsGrid period="month" projectId="project-1" />);
    expect(await screen.findByRole('region', { name: 'Bộ biểu đồ insights' })).toBeInTheDocument();
    expect(screen.getAllByTestId('insight-panel')).toHaveLength(10);
    expect(reportsApi.insights).toHaveBeenCalledWith('month', 'project-1');
  });

  it('nên lấp đầy từng hàng của lưới desktop', async () => {
    renderWithProviders(<InsightsGrid period="month" />);
    await screen.findByRole('region', { name: 'Bộ biểu đồ insights' });

    const expectedSpans = [2, 4, 2, 4, 3, 3, 6, 4, 2, 6];
    screen.getAllByTestId('insight-panel').forEach((panel, index) => {
      expect(panel).toHaveClass(`lg:col-span-${expectedSpans[index]}`);
      expect(panel).toHaveClass('min-w-0');
    });
  });
});

describe('biểu đồ radar thành viên', () => {
  it('nên chọn mặc định ba người có gem cao nhất', () => {
    renderWithProviders(<MemberRadar data={workload} />);
    expect(screen.getByRole('button', { name: 'An' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Bình' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Chi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dũng' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('nên chặn chọn quá năm người', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MemberRadar data={workload} />);
    await user.click(screen.getByRole('button', { name: 'Dũng' }));
    await user.click(screen.getByRole('button', { name: 'Hà' }));
    expect(screen.getByRole('button', { name: 'Lan' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Lan' }));
    expect(screen.getByRole('button', { name: 'Lan' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('lưới hoàn thành', () => {
  it('nên render chín mươi mốt ô và đọc số việc đã hoàn thành', () => {
    const { container } = renderWithProviders(<CompletionHeatmap data={weekdayHeat} />);
    expect(container.querySelectorAll('[data-heat-cell]')).toHaveLength(91);
    expect(screen.getByLabelText('09/06: 4 việc xong')).toBeInTheDocument();
  });
});

describe('phân bổ gem', () => {
  it('nên đặt bucket chưa chấm ở cuối', () => {
    const { container } = renderWithProviders(
      <GemHistogram data={insights.gemBuckets} avgGem={insights.avgGem} />,
    );
    const buckets = Array.from(container.querySelectorAll('[data-gem-bucket]')).map(
      (element) => element.getAttribute('data-gem-bucket'),
    );
    expect(buckets).toEqual(['1-20', 'none']);
    expect(screen.getByText('Chưa chấm')).toBeInTheDocument();
  });
});
