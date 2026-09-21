import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taskClient } from './task-client';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('taskClient', () => {
  it('post() gộp header tuỳ chỉnh vào request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, data: { id: 'c1' } }),
    });

    await taskClient.post('/api/v1/commitments', { title: 'X' }, {
      'Idempotency-Key': 'idem-key-1',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idem-key-1',
    });
  });
});
