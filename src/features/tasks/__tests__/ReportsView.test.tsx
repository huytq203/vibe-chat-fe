import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ReportsView } from '../components/reports/ReportsView';

describe('ReportsView', () => {
  it('hiển thị header + trạng thái đang tải khi chưa có số liệu', () => {
    // Không mock API → overview query pending → view hiện loading state
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Báo cáo')).toBeInTheDocument();
    expect(screen.getByText(/đang tải số liệu báo cáo/i)).toBeInTheDocument();
  });

  it('hiển thị card leaderboard với gợi ý khi chưa chọn dự án', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Khối lượng theo thành viên')).toBeInTheDocument();
    expect(
      screen.getByText(/mở một dự án để xem thống kê theo thành viên/i),
    ).toBeInTheDocument();
  });
});
