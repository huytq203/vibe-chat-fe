import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppSidebar } from '../components/layout/AppSidebar';

vi.mock('../lib/current-user', () => ({
  getCurrentUser: () => null,
}));

describe('AppSidebar', () => {
  it('dock ẩn mặc định, chỉ hiện sau khi bấm nút home ảo', () => {
    renderWithProviders(<AppSidebar activeView="home" onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Trang chủ' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở thanh điều hướng' }));

    expect(screen.getByRole('button', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dự án' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhiệm vụ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Báo cáo' })).toBeInTheDocument();
  });

  it('bấm mục gọi onNavigate đúng view', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<AppSidebar activeView="home" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở thanh điều hướng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));

    expect(onNavigate).toHaveBeenCalledWith('reports');
  });
});
