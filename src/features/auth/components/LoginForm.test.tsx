import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { ApiError } from '@/lib/api/client';

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://test',
    NEXT_PUBLIC_VIBE_URL: 'http://test',
    NEXT_PUBLIC_WS_URL: 'http://test',
    NEXT_PUBLIC_CALL_WS_URL: 'http://test',
    NEXT_PUBLIC_USE_PROXY: true,
  },
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const mutateAsync = vi.fn();
vi.mock('@/features/auth/hooks/use-mutations', () => ({
  useLogin: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Email and Mật khẩu labeled fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  });

  it('submits credentials and redirects to /chat on success', async () => {
    mutateAsync.mockResolvedValueOnce(undefined);
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'nguyenvana');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      username: 'nguyenvana',
      password: 'Secret123',
      rememberMe: false,
    });
    expect(push).toHaveBeenCalledWith('/chat');
  });

  it('redirects to /verify-email when the account has not verified its email', async () => {
    mutateAsync.mockRejectedValueOnce(
      new ApiError(401, 'AUTH_EMAIL_NOT_VERIFIED', 'chưa xác thực')
    );
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(push).toHaveBeenCalledWith('/verify-email?email=a%40example.com');
  });

  it('renders the disabled social login placeholder buttons', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Đăng nhập với Google' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đăng nhập với GitHub' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đăng nhập với Facebook' })).toBeDisabled();
  });
});
