// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import browserLogin from '../../../electron/browser-login.js';

const { buildLoginUrl, createBrowserLoginCoordinator, createPkcePair, findDeepLink, parseCallback } = browserLogin;

describe('electron browser-login', () => {
  afterEach(() => vi.useRealTimers());

  it('sinh PKCE S256 đúng chuẩn và URL login chế độ desktop', () => {
    const pkce = createPkcePair();
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(pkce.challenge).toBe(createHash('sha256').update(pkce.verifier).digest('base64url'));

    const url = new URL(buildLoginUrl('https://chat.krux.io.vn', pkce));
    expect(url.pathname).toBe('/login');
    expect(Object.fromEntries(url.searchParams)).toEqual({ client: 'desktop', state: pkce.state, code_challenge: pkce.challenge });
  });

  it('chỉ chấp nhận đúng halo://auth/callback có code và state', () => {
    expect(parseCallback('halo://auth/callback?code=c&state=s')).toEqual({ code: 'c', state: 's' });
    expect(parseCallback('halo://other/callback?code=c&state=s')).toBeNull();
    expect(parseCallback('https://evil.test/callback?code=c&state=s')).toBeNull();
    expect(parseCallback('halo://auth/callback?code=c')).toBeNull();
    expect(findDeepLink(['/opt/halo', '--flag', 'halo://auth/callback?code=c&state=s'])).toBe('halo://auth/callback?code=c&state=s');
  });

  it('trả code + verifier khi callback khớp state đang chờ', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const coordinator = createBrowserLoginCoordinator({ openExternal, webUrl: 'https://chat.krux.io.vn' });

    const pending = coordinator.start();
    const state = new URL(openExternal.mock.calls[0][0]).searchParams.get('state');

    expect(coordinator.handleCallback(`halo://auth/callback?code=abc&state=${state}`)).toBe(true);
    const result = await pending;
    expect(result.code).toBe('abc');
    expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });

  it('bỏ qua callback sai state hoặc khi không có phiên chờ', () => {
    const coordinator = createBrowserLoginCoordinator({ openExternal: vi.fn().mockResolvedValue(undefined), webUrl: 'https://x.test' });

    expect(coordinator.handleCallback('halo://auth/callback?code=a&state=nope')).toBe(false);
    void coordinator.start().catch(() => undefined);
    expect(coordinator.handleCallback('halo://auth/callback?code=a&state=wrong')).toBe(false);
  });

  it('hết hạn sau 5 phút và cho phép huỷ', async () => {
    vi.useFakeTimers();
    const coordinator = createBrowserLoginCoordinator({ openExternal: vi.fn().mockResolvedValue(undefined), webUrl: 'https://x.test' });

    const timedOut = coordinator.start();
    vi.advanceTimersByTime(5 * 60 * 1000);
    await expect(timedOut).rejects.toThrow('timeout');

    const cancelled = coordinator.start();
    coordinator.cancel();
    await expect(cancelled).rejects.toThrow('cancelled');
  });
});
