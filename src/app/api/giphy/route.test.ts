// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimit } from '@/lib/rate-limit/memory';
import { GET } from './route';

const upstreamPayload = {
  data: [
    {
      id: 'abc123',
      title: 'mèo nhảy',
      images: {
        fixed_width_small: {
          url: 'https://media.giphy.com/media/abc123/100w.gif',
          webp: 'https://media.giphy.com/media/abc123/100w.webp',
          width: '100',
          height: '80',
        },
      },
    },
  ],
  pagination: { total_count: 50, count: 1, offset: 0 },
};

function makeRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/giphy${queryString}`, {
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });
}

function mockUpstream(payload: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(payload), { status: ok ? 200 : 500 })),
  );
}

describe('GET /api/giphy', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv('GIPHY_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('trả 503 khi chưa cấu hình GIPHY_API_KEY', async () => {
    vi.stubEnv('GIPHY_API_KEY', '');
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'GIPHY_NOT_CONFIGURED' },
    });
  });

  it('trả 400 khi kind=search mà thiếu q', async () => {
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=search'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'INVALID_QUERY' } });
  });

  it('map payload Giphy về shape rút gọn và không lộ URL gốc', async () => {
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=trending'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      items: [
        {
          id: 'abc123',
          title: 'mèo nhảy',
          previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
          previewWidth: 100,
          previewHeight: 80,
        },
      ],
      nextOffset: 1,
    });
  });

  it('gửi rating=g và limit cố định lên Giphy', async () => {
    mockUpstream(upstreamPayload);

    await GET(makeRequest('?kind=search&q=m%C3%A8o'));

    const calledWith = vi.mocked(fetch).mock.calls[0]?.[0];
    const url = new URL(String(calledWith));
    expect(url.pathname).toBe('/v1/gifs/search');
    expect(url.searchParams.get('rating')).toBe('g');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(url.searchParams.get('q')).toBe('mèo');
  });

  it('nextOffset = null khi đã hết trang', async () => {
    mockUpstream({ ...upstreamPayload, pagination: { total_count: 1, count: 1, offset: 0 } });

    const body = await (await GET(makeRequest('?kind=trending'))).json();

    expect(body.nextOffset).toBeNull();
  });

  it('trả 429 khi vượt rate limit', async () => {
    mockUpstream(upstreamPayload);
    for (let index = 0; index < 60; index += 1) {
      await GET(makeRequest('?kind=trending'));
    }

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });

  it('trả 502 khi Giphy lỗi', async () => {
    mockUpstream({ message: 'boom' }, false);

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(502);
  });
});
