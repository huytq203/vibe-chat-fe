import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changeRequestsApi, commitmentsApi } from './commitments.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

function okResponse(data: unknown) {
  return {
    ok: true,
    text: async () => JSON.stringify({ success: true, data }),
  };
}

describe('commitmentsApi', () => {
  it('create() gửi đúng path/body và header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'c1', title: 'X', deliveryStatus: 'PLANNED' }),
    );

    await commitmentsApi.create(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      'idem-key-1',
    );

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/commitments');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'idem-key-1',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'X',
      scopeStatus: 'UNCLEAR',
    });
  });

  it('linkSourceRef() KHÔNG gửi header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));

    await commitmentsApi.linkSourceRef('c1', {
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1'],
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(
      (init.headers as Record<string, string>)['Idempotency-Key'],
    ).toBeUndefined();
  });

  it('linkTask() gọi đúng path với taskId trong body', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));
    await commitmentsApi.linkTask('c1', 't1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/tasks');
    expect(JSON.parse(init.body as string)).toEqual({ taskId: 't1' });
  });

  it('list() gọi đúng path với limit=100', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
    });
    await commitmentsApi.list('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(
      '/api/v1/projects/proj-1/commitments?limit=100',
    );
  });

  it('listPaged() gửi đúng query filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
    });
    await commitmentsApi.listPaged('proj-1', {
      page: 2,
      limit: 20,
      deliveryStatus: 'IN_PROGRESS',
      risk: 'OVERDUE',
    });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/commitments?');
    expect(url).toContain('page=2');
    expect(url).toContain('deliveryStatus=IN_PROGRESS');
    expect(url).toContain('risk=OVERDUE');
  });

  it('getDetail() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
    await commitmentsApi.getDetail('c1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/commitments/c1');
  });

  it('getSourceRefContent() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await commitmentsApi.getSourceRefContent('c1', 'ref1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(
      '/api/v1/commitments/c1/source-refs/ref1/content',
    );
  });

  it('nên gửi PATCH với đúng path/body khi update()', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
    await commitmentsApi.update('c1', { title: 'X mới', version: 3 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'X mới',
      version: 3,
    });
  });

  it('nên gửi DELETE với đúng path khi unlinkTask()', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await commitmentsApi.unlinkTask('c1', 't1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/tasks/t1');
    expect(init.method).toBe('DELETE');
  });

  it('nên gửi đúng path/body khi addEvidence()', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'e1' }));
    await commitmentsApi.addEvidence('c1', {
      milestone: 'TESTED',
      type: 'NOTE',
      note: 'ok',
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/evidence');
    expect(JSON.parse(init.body as string)).toEqual({
      milestone: 'TESTED',
      type: 'NOTE',
      note: 'ok',
    });
  });

  it('nên gửi POST với đúng path/body khi transition()', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
    await commitmentsApi.transition('c1', {
      to: 'DELIVERED',
      evidenceId: 'e1',
      version: 3,
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/transition');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      to: 'DELIVERED',
      evidenceId: 'e1',
      version: 3,
    });
  });

  it('nên gửi DELETE với đúng path khi removeSourceRef()', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await commitmentsApi.removeSourceRef('c1', 'ref1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/source-refs/ref1');
    expect(init.method).toBe('DELETE');
  });
});

describe('changeRequestsApi', () => {
  it('create() gửi đúng path/body và header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'cr1', title: 'X', status: 'DRAFT' }),
    );

    await changeRequestsApi.create(
      'proj-1',
      { title: 'X', impact: 'Ảnh hưởng lớn' },
      'idem-key-2',
    );

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/change-requests');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'idem-key-2',
    );
  });

  it('listPaged() gửi đúng query filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
    });
    await changeRequestsApi.listPaged('proj-1', {
      page: 1,
      status: 'DRAFT',
    });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/change-requests?');
    expect(url).toContain('status=DRAFT');
  });

  it('getDetail() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
    await changeRequestsApi.getDetail('cr1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/change-requests/cr1');
  });

  it('update() gửi PATCH với đúng body', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
    await changeRequestsApi.update('cr1', { title: 'X mới', version: 2 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/change-requests/cr1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'X mới',
      version: 2,
    });
  });

  it('transition() gửi POST với đúng body', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
    await changeRequestsApi.transition('cr1', {
      to: 'REJECTED',
      reason: 'Không khả thi',
      version: 2,
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/change-requests/cr1/transition');
    expect(JSON.parse(init.body as string)).toEqual({
      to: 'REJECTED',
      reason: 'Không khả thi',
      version: 2,
    });
  });

  it('removeSourceRef() gửi DELETE với đúng path', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await changeRequestsApi.removeSourceRef('cr1', 'ref1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/change-requests/cr1/source-refs/ref1');
    expect(init.method).toBe('DELETE');
  });

  it('getSourceRefContent() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await changeRequestsApi.getSourceRefContent('cr1', 'ref1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(
      '/api/v1/change-requests/cr1/source-refs/ref1/content',
    );
  });
});
