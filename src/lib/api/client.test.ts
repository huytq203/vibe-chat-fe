import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://auth.test',
    NEXT_PUBLIC_VIBE_URL: 'http://vibe.test',
    NEXT_PUBLIC_BOT_URL: 'http://bot.test',
    NEXT_PUBLIC_AI_URL: 'http://ai.test',
    NEXT_PUBLIC_NOTION_URL: 'http://notion.test',
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

  it('nên route /api/v1/ai/chat sang NEXT_PUBLIC_AI_URL chứ không phải bot-service', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/ai/chat')).toBe('http://ai.test/api/v1/ai/chat');
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

  it('nên route notion-service sang NEXT_PUBLIC_NOTION_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/health', 'notion')).toBe(
      'http://notion.test/api/v1/health',
    );
  });
});

describe('resolveApiUrl khi dùng proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/config/env', () => ({
      env: {
        NEXT_PUBLIC_AUTH_URL: 'http://auth.test',
        NEXT_PUBLIC_VIBE_URL: 'http://vibe.test',
        NEXT_PUBLIC_BOT_URL: 'http://bot.test',
        NEXT_PUBLIC_AI_URL: 'http://ai.test',
        NEXT_PUBLIC_NOTION_URL: 'http://notion.test',
        NEXT_PUBLIC_WS_URL: 'http://vibe.test',
        NEXT_PUBLIC_CALL_WS_URL: 'http://vibe.test',
        NEXT_PUBLIC_USE_PROXY: true,
      },
    }));
  });

  it('nên route notion-service qua prefix proxy riêng', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/health', 'notion')).toBe(
      '/notion-proxy/api/v1/health',
    );
  });

  it('nên giữ nguyên proxy chung khi không truyền service', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/conversations')).toBe('/api/v1/conversations');
  });

  it('nên gọi thẳng NEXT_PUBLIC_NOTION_URL cho notion-service khi chạy server (không có window) — fetch() không tự suy ra origin từ path tương đối như trình duyệt', async () => {
    vi.stubGlobal('window', undefined);
    try {
      const { resolveApiUrl } = await import('./client');
      expect(resolveApiUrl('/api/v1/public/some-token', 'notion')).toBe(
        'http://notion.test/api/v1/public/some-token',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
