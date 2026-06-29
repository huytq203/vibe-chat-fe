import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppSidebar } from './AppSidebar';

vi.mock('../lib/current-user', () => ({
  getCurrentUser: () => null,
}));

describe('AppSidebar', () => {
  it('render đủ 4 mục điều hướng', () => {
    renderWithProviders(<AppSidebar activeView="home" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dự án' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhiệm vụ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Báo cáo' })).toBeInTheDocument();
  });

  it('bấm mục gọi onNavigate đúng view', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<AppSidebar activeView="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(onNavigate).toHaveBeenCalledWith('reports');
  });
});
