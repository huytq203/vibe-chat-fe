import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://auth.test',
    NEXT_PUBLIC_VIBE_URL: 'http://vibe.test',
    NEXT_PUBLIC_BOT_URL: 'http://bot.test',
    NEXT_PUBLIC_WS_URL: 'http://vibe.test',
    NEXT_PUBLIC_CALL_WS_URL: 'http://vibe.test',
    NEXT_PUBLIC_USE_PROXY: false,
  },
}));

describe('resolveApiUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('nên route /api/v1/bots sang NEXT_PUBLIC_BOT_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/bots')).toBe('http://bot.test/api/v1/bots');
  });

  it('nên route /api/v1/bot/messages sang NEXT_PUBLIC_BOT_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/bot/messages')).toBe(
      'http://bot.test/api/v1/bot/messages',
    );
  });

  it('nên route /api/v1/auth/login sang NEXT_PUBLIC_AUTH_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/auth/login')).toBe(
      'http://auth.test/api/v1/auth/login',
    );
  });

  it('nên route path khác sang NEXT_PUBLIC_VIBE_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/conversations')).toBe(
      'http://vibe.test/api/v1/conversations',
    );
  });
});
