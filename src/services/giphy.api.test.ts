import { afterEach, describe, expect, it, vi } from 'vitest';
import { GiphyError, giphyApi } from './giphy.api';

const page = {
  items: [
    {
      id: 'abc123',
      title: 'mèo nhảy',
      previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
      previewWidth: 100,
      previewHeight: 80,
    },
  ],
  nextOffset: 24,
};

afterEach(() => vi.unstubAllGlobals());

describe('giphyApi.list', () => {
  it('gọi kind=trending khi q rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(page)));

    await giphyApi.list({ q: '', offset: 0 });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]), 'http://localhost');
    expect(url.searchParams.get('kind')).toBe('trending');
    expect(url.searchParams.get('q')).toBeNull();
  });

  it('gọi kind=search kèm q và offset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(page)));

    const result = await giphyApi.list({ q: 'mèo', offset: 24 });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]), 'http://localhost');
    expect(url.searchParams.get('kind')).toBe('search');
    expect(url.searchParams.get('q')).toBe('mèo');
    expect(url.searchParams.get('offset')).toBe('24');
    expect(result).toEqual(page);
  });

  it('ném GiphyError mang đúng code khi route trả lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'GIPHY_NOT_CONFIGURED', message: 'chưa cấu hình' } },
          { status: 503 },
        ),
      ),
    );

    await expect(giphyApi.list({ q: '', offset: 0 })).rejects.toMatchObject({
      code: 'GIPHY_NOT_CONFIGURED',
    });
  });

  it('ném lỗi khi payload sai schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [{ id: 1 }] })));

    await expect(giphyApi.list({ q: '', offset: 0 })).rejects.toThrow();
  });
});

describe('giphyApi.fetchAsset', () => {
  it('trả Blob khi thành công', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('bytes', { status: 200, headers: { 'content-type': 'image/gif' } }),
      ),
    );

    const blob = await giphyApi.fetchAsset('abc123');

    expect(blob.size).toBeGreaterThan(0);
  });

  it('ném GiphyError khi route trả lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'GIF_TOO_LARGE', message: 'quá lớn' } },
          { status: 413 },
        ),
      ),
    );

    await expect(giphyApi.fetchAsset('abc123')).rejects.toBeInstanceOf(GiphyError);
  });
});
