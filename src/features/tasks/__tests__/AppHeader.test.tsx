import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppHeader } from '../components/layout/AppHeader';

describe('AppHeader', () => {
  it('nút Tạo mới gọi onCreateProject', () => {
    const onCreate = vi.fn();
    renderWithProviders(<AppHeader onCreateProject={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /tạo mới/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});
