import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

const handlers: Record<string, Handler> = {};
const fakeSocket = {
  connected: false,
  auth: {} as unknown,
  on: vi.fn((event: string, fn: Handler) => {
    handlers[event] = fn;
    return fakeSocket;
  }),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({ io: vi.fn(() => fakeSocket) }));
vi.mock('@/config/env', () => ({ env: { NEXT_PUBLIC_WS_URL: 'ws://test' } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

async function loadSocketModule() {
  vi.resetModules();
  return import('./socket');
}

describe('socket force_logout / session revoked', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    for (const key of Object.keys(handlers)) delete handlers[key];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('force_logout → gọi handler và disconnect socket', async () => {
    const mod = await loadSocketModule();
    const onForceLogout = vi.fn();
    mod.setForceLogoutHandler(onForceLogout);
    mod.getSocket('token-1');

    handlers['force_logout']();

    expect(onForceLogout).toHaveBeenCalledTimes(1);
    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });

  it('sau force_logout → KHÔNG tự reconnect khi server disconnect', async () => {
    const mod = await loadSocketModule();
    mod.setTokenProvider(() => 'token-1');
    mod.setForceLogoutHandler(vi.fn());
    mod.getSocket('token-1');

    handlers['force_logout']();
    handlers['disconnect']('io server disconnect', undefined);
    vi.advanceTimersByTime(3000);

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('server disconnect bình thường → vẫn reconnect sau 2s', async () => {
    const mod = await loadSocketModule();
    mod.setTokenProvider(() => 'token-1');
    mod.getSocket('token-1');

    handlers['disconnect']('io server disconnect', undefined);
    vi.advanceTimersByTime(3000);

    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('connect_error với code AUTH_SESSION_REVOKED → gọi handler, không reconnect', async () => {
    const mod = await loadSocketModule();
    const onForceLogout = vi.fn();
    mod.setTokenProvider(() => 'token-1');
    mod.setForceLogoutHandler(onForceLogout);
    mod.getSocket('token-1');

    const err = Object.assign(new Error('Unauthorized'), {
      data: { code: 'AUTH_SESSION_REVOKED' },
    });
    handlers['connect_error'](err);

    expect(onForceLogout).toHaveBeenCalledTimes(1);
    expect(fakeSocket.disconnect).toHaveBeenCalled();

    handlers['disconnect']('io server disconnect', undefined);
    vi.advanceTimersByTime(3000);
    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('connect_error khác → không gọi handler', async () => {
    const mod = await loadSocketModule();
    const onForceLogout = vi.fn();
    mod.setForceLogoutHandler(onForceLogout);
    mod.getSocket('token-1');

    handlers['connect_error'](new Error('timeout'));

    expect(onForceLogout).not.toHaveBeenCalled();
  });
});
