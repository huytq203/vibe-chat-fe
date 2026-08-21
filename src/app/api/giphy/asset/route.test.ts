// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimit } from '@/lib/rate-limit/memory';
import { GET } from './route';

const detailPayload = {
  data: {
    images: {
      downsized_medium: { url: 'https://media.giphy.com/media/abc123/giphy.gif' },
      original: { url: 'https://media.giphy.com/media/abc123/original.gif' },
    },
  },
};

function makeRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/giphy/asset${queryString}`, {
    headers: { 'x-forwarded-for': '203.0.113.8' },
  });
}

function mockTwoHop(assetHeaders: Record<string, string>): void {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(detailPayload), { status: 200 }))
    .mockResolvedValueOnce(new Response('GIF89a-bytes', { status: 200, headers: assetHeaders }));
  vi.stubGlobal('fetch', fetchMock);
}

describe('GET /api/giphy/asset', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv('GIPHY_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('từ chối id chứa ký tự ngoài [A-Za-z0-9] để chặn SSRF', async () => {
    mockTwoHop({ 'content-type': 'image/gif' });

    const response = await GET(makeRequest('?id=https%3A%2F%2Fevil.test%2Fx'));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stream bytes GIF với content-type ảnh', async () => {
    mockTwoHop({ 'content-type': 'image/gif', 'content-length': '12' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/gif');
    await expect(response.text()).resolves.toBe('GIF89a-bytes');
  });

  it('từ chối khi upstream không phải ảnh', async () => {
    mockTwoHop({ 'content-type': 'text/html' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(502);
  });

  it('từ chối file vượt 8MB', async () => {
    mockTwoHop({ 'content-type': 'image/gif', 'content-length': String(9 * 1024 * 1024) });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(413);
  });

  it('trả 503 khi chưa cấu hình key', async () => {
    vi.stubEnv('GIPHY_API_KEY', '');
    mockTwoHop({ 'content-type': 'image/gif' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(503);
  });
});
