import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneralTab } from './GeneralTab';

const { logoutMutate } = vi.hoisted(() => ({
  logoutMutate: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  DeleteAccountDialog: () => null,
  useLogout: () => ({ mutate: logoutMutate, isPending: false }),
}));

describe('GeneralTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị đăng xuất trong nhóm phiên đăng nhập', () => {
    render(<GeneralTab />);

    expect(screen.getByText('Phiên đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Đăng xuất khỏi thiết bị này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('yêu cầu xác nhận trước khi đăng xuất', async () => {
    const user = userEvent.setup();
    render(<GeneralTab />);

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Đăng xuất khỏi HaloChat?')).toBeInTheDocument();
    expect(logoutMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(logoutMutate).toHaveBeenCalledTimes(1);
  });

  it('không đăng xuất khi huỷ xác nhận', async () => {
    const user = userEvent.setup();
    render(<GeneralTab />);

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(logoutMutate).not.toHaveBeenCalled();
    expect(screen.queryByText('Đăng xuất khỏi HaloChat?')).not.toBeInTheDocument();
  });
});
