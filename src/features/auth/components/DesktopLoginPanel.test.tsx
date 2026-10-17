import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const electron = vi.hoisted(() => ({ startElectronBrowserLogin: vi.fn(), cancelElectronBrowserLogin: vi.fn() }));
vi.mock('@/lib/electron', () => electron);
const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/hooks/use-login-mutations', () => ({
  useExchangeHandoff: () => ({ mutateAsync: exchange, isPending: false }),
}));

import { toast } from 'sonner';
import { DesktopLoginPanel } from './DesktopLoginPanel';

describe('DesktopLoginPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('đổi mã nhận từ trình duyệt rồi vào /chat', async () => {
    electron.startElectronBrowserLogin.mockResolvedValue({ code: 'c', codeVerifier: 'v' });
    exchange.mockResolvedValue({ status: 'AUTHENTICATED' });
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(exchange).toHaveBeenCalledWith({ code: 'c', codeVerifier: 'v' });
    expect(push).toHaveBeenCalledWith('/chat');
  });

  it('không báo lỗi khi người dùng tự huỷ', async () => {
    electron.startElectronBrowserLogin.mockRejectedValue(new Error("Error invoking remote method 'auth:start-browser-login': Error: cancelled"));
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' })).toBeInTheDocument();
  });

  it('báo hết thời gian chờ', async () => {
    electron.startElectronBrowserLogin.mockRejectedValue(new Error('Error: timeout'));
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(toast.error).toHaveBeenCalledWith('Quá thời gian chờ đăng nhập, vui lòng thử lại');
  });
});
