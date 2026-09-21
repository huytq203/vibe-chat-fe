import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scopeApi } from './scope.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

function okResponse(data: unknown) {
  return { ok: true, text: async () => JSON.stringify({ success: true, data }) };
}

const SCOPE = { projectId: 'proj-1', rawDocument: null, version: 0, items: [] };

describe('scopeApi', () => {
  it('get() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.get('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/scope');
  });

  it('updateDocument() gửi PUT với rawDocument + version', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.updateDocument('proj-1', 'Nội dung SOW', 3);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/document');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      rawDocument: 'Nội dung SOW',
      version: 3,
    });
  });

  it('addItem() gửi đúng path/body', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.addItem('proj-1', { title: 'Đăng nhập', version: 2 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Đăng nhập',
      version: 2,
    });
  });

  it('updateItem() gửi PATCH với đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.updateItem('proj-1', 'item-1', {
      status: 'PHASE_2',
      version: 2,
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items/item-1');
    expect(init.method).toBe('PATCH');
  });

  it('removeItem() gửi DELETE kèm body version', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.removeItem('proj-1', 'item-1', 2);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items/item-1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ version: 2 });
  });
});
