import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppHeader, headerTitle } from './AppHeader';

describe('headerTitle', () => {
  it('home → Trang chủ', () => {
    expect(headerTitle('home').title).toBe('Trang chủ');
  });
  it('reports → Báo cáo', () => {
    expect(headerTitle('reports').title).toBe('Báo cáo');
  });
  it('board lấy tên project', () => {
    const p = { id: 'p1', name: 'Dự án A' } as never;
    expect(headerTitle('board', p).title).toBe('Dự án A');
  });
});

describe('AppHeader', () => {
  it('nút Tạo mới gọi onCreateProject', () => {
    const onCreate = vi.fn();
    renderWithProviders(<AppHeader activeView="home" onCreateProject={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /tạo mới/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});
