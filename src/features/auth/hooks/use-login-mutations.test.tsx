import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGoogleLogin, useVerifyLoginCode } from './use-login-mutations';

const api = vi.hoisted(() => ({
  verifyLoginCode: vi.fn(),
  loginWithGoogle: vi.fn(),
  fetchMe: vi.fn(),
}));
vi.mock('@/services/auth.api', () => ({ authApi: api }));
vi.mock('@/lib/device/device-info', () => ({ getDeviceType: () => 'WEB', getDeviceName: () => 'Chrome' }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const authenticated = {
  status: 'AUTHENTICATED' as const,
  tokens: { accessToken: 'jwt', refreshToken: '', expiresIn: 900, tokenType: 'Bearer' },
  user: { id: 'kc-1', username: 'huytq' },
};

describe('use-login-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchMe.mockResolvedValue(authenticated.user);
    useAuthStore.getState().clear();
  });

  it('áp phiên khi AUTHENTICATED và gửi kèm thiết bị hiện tại', async () => {
    api.verifyLoginCode.mockResolvedValue(authenticated);
    const { result } = renderHook(() => useVerifyLoginCode(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'a@b.com', code: '123456', handoff: null }));

    expect(api.verifyLoginCode).toHaveBeenCalledWith({ email: 'a@b.com', code: '123456', deviceType: 'WEB', deviceName: 'Chrome' });
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  });

  it('không áp phiên khi SIGNUP_REQUIRED hoặc HANDOFF', async () => {
    api.loginWithGoogle.mockResolvedValue({ status: 'HANDOFF', redirectUrl: 'halo://auth/callback?code=c&state=s' });
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };

    const outcome = await act(() => result.current.mutateAsync({ idToken: 't'.repeat(30), handoff }));

    expect(outcome.status).toBe('HANDOFF');
    expect(api.loginWithGoogle).toHaveBeenCalledWith({ idToken: 't'.repeat(30), deviceType: 'DESKTOP', handoff });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
