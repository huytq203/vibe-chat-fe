import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ReportsView } from './ReportsView';

describe('ReportsView', () => {
  it('hiển thị 4 stat card', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Tổng việc')).toBeInTheDocument();
    expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Đang làm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
  });

  it('hiển thị tiêu đề biểu đồ', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText(/hoàn thành theo ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/phân bổ trạng thái/i)).toBeInTheDocument();
  });
});
