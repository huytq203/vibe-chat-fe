import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientApi } from './client.api';
import { tasksApi } from './tasks.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('tasksApi.addMember', () => {
  it('nên giữ mã lỗi BE để hiển thị thông báo phù hợp', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 409, text: async () => JSON.stringify({ success: false, error: { code: 'CLIENT_CONTACT_ALREADY_LINKED', message: 'Conflict' } }) });
    await expect(tasksApi.addMember('proj-1', 'user-2', { role: 'CLIENT', contactId: 'c1' }))
      .rejects.toMatchObject({ code: 'CLIENT_CONTACT_ALREADY_LINKED' });
  });
  it('nên giữ body cũ khi không truyền options', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await tasksApi.addMember('proj-1', 'user-2');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ userId: 'user-2' });
  });

  it('nên gửi role CLIENT và contactId khi có options', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await tasksApi.addMember('proj-1', 'user-2', { role: 'CLIENT', contactId: 'c1' });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ userId: 'user-2', role: 'CLIENT', contactId: 'c1' });
  });
});

function okResponse(data: unknown) {
  return { ok: true, text: async () => JSON.stringify({ success: true, data }) };
}

describe('clientApi', () => {
  it('get() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await clientApi.get('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/client');
  });

  it('upsert() gửi PUT với đúng body', async () => {
    mockFetch.mockResolvedValue(okResponse({ projectId: 'proj-1', name: 'ACME', contacts: [] }));
    await clientApi.upsert('proj-1', 'ACME');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'ACME' });
  });

  it('addContact() gửi đúng path/body', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'c1', userId: null, name: 'Alex', email: null, title: null, isPrimary: false, isDeleted: false }),
    );
    await clientApi.addContact('proj-1', { name: 'Alex' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Alex' });
  });

  it('updateContact() gửi PATCH với đúng path', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'c1', userId: null, name: 'Alex 2', email: null, title: null, isPrimary: false, isDeleted: false }),
    );
    await clientApi.updateContact('proj-1', 'c1', { name: 'Alex 2' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts/c1');
    expect(init.method).toBe('PATCH');
  });

  it('removeContact() gửi DELETE với đúng path', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await clientApi.removeContact('proj-1', 'c1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts/c1');
    expect(init.method).toBe('DELETE');
  });
});
