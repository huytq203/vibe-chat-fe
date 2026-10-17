import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

const listIdentities = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth.api', () => ({ authApi: { listIdentities } }));

import { LoginMethodsSection } from './LoginMethodsSection';

describe('LoginMethodsSection', () => {
  it('liệt kê phương thức đăng nhập đã gắn', async () => {
    listIdentities.mockResolvedValue([
      { provider: 'GOOGLE', email: 'huy@gmail.com', createdAt: '2026-10-17T00:00:00Z', lastUsedAt: null },
      { provider: 'EMAIL', email: 'huy@gmail.com', createdAt: '2026-10-17T00:00:00Z', lastUsedAt: null },
    ]);

    renderWithProviders(<LoginMethodsSection />);

    expect(await screen.findByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Mã qua email')).toBeInTheDocument();
  });

  it('báo lỗi khi không tải được', async () => {
    listIdentities.mockRejectedValue(new Error('x'));

    renderWithProviders(<LoginMethodsSection />);

    expect(await screen.findByText('Không tải được phương thức đăng nhập.')).toBeInTheDocument();
  });
});
