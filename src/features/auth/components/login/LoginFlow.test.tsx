import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (t: string) => void }) => (
    <button type="button" onClick={() => onCredential('google-id-token')}>Google</button>
  ),
}));
vi.mock('@/features/app-update', () => ({ DownloadDesktopApp: () => null }));
vi.mock('@/features/auth/components/RestoreAccountDialog', () => ({
  RestoreAccountDialog: ({ restoreToken }: { restoreToken: string }) => <div>restore:{restoreToken}</div>,
}));

const m = vi.hoisted(() => ({
  requestCode: vi.fn(),
  verify: vi.fn(),
  google: vi.fn(),
  signup: vi.fn(),
}));
vi.mock('@/features/auth/hooks/use-login-mutations', () => ({
  useRequestLoginCode: () => ({ mutateAsync: m.requestCode, isPending: false }),
  useVerifyLoginCode: () => ({ mutateAsync: m.verify, isPending: false }),
  useGoogleLogin: () => ({ mutateAsync: m.google, isPending: false }),
  useCompleteSignup: () => ({ mutateAsync: m.signup, isPending: false }),
}));

import { toast } from 'sonner';
import { LoginFlow } from './LoginFlow';

async function submitEmailAndCode(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Email'), 'Huy@Gmail.com');
  await userEvent.click(screen.getByRole('button', { name: 'Gửi mã đăng nhập' }));
  await userEvent.type(await screen.findByLabelText('Chữ số 1'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('LoginFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requestCode.mockResolvedValue({ message: 'ok' });
  });

  it('email → mã → vào /chat khi AUTHENTICATED (email đã chuẩn hoá)', async () => {
    m.verify.mockResolvedValue({ status: 'AUTHENTICATED' });
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(m.requestCode).toHaveBeenCalledWith('huy@gmail.com');
    expect(m.verify).toHaveBeenCalledWith({ email: 'huy@gmail.com', code: '123456', handoff: null });
    expect(push).toHaveBeenCalledWith('/chat');
  });

  it('chuyển sang hoàn tất hồ sơ khi SIGNUP_REQUIRED', async () => {
    m.verify.mockResolvedValue({ status: 'SIGNUP_REQUIRED', signupTicket: 't', prefill: { email: 'huy@gmail.com', displayName: 'huy' } });
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(await screen.findByRole('button', { name: 'Hoàn tất' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('hiện hướng dẫn dùng Google khi admin nhập mã email', async () => {
    m.verify.mockRejectedValue(new ApiError(403, 'AUTH_ADMIN_GOOGLE_REQUIRED', 'x'));
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('chỉ đăng nhập bằng Google'));
  });

  it('mở luồng khôi phục khi Google trả AUTH_ACCOUNT_DELETED', async () => {
    m.google.mockRejectedValue(new ApiError(403, 'AUTH_ACCOUNT_DELETED', 'x', { restoreToken: 'r-1', email: 'h**@gmail.com' }));
    render(<LoginFlow handoff={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Google' }));

    expect(await screen.findByText('restore:r-1')).toBeInTheDocument();
  });

  it('gửi handoff và hiện màn quay lại app khi HANDOFF', async () => {
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };
    m.google.mockResolvedValue({ status: 'HANDOFF', redirectUrl: 'halo://auth/callback?code=c&state=s' });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    render(<LoginFlow handoff={handoff} />);

    await userEvent.click(screen.getByRole('button', { name: 'Google' }));

    expect(m.google).toHaveBeenCalledWith({ idToken: 'google-id-token', handoff });
    expect(await screen.findByText('Đã xác thực')).toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith('halo://auth/callback?code=c&state=s');
  });
});
