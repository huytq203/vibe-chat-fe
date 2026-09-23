import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taskClient } from './task-client';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('taskClient', () => {
  it('nên giữ mã trạng thái HTTP khi yêu cầu bị xung đột', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 409, text: async () => JSON.stringify({ success: false, error: { code: 'VERSION_CONFLICT', message: 'Conflict' } }) });
    await expect(taskClient.patch('/api/v1/tasks/task-1', { version: 7 })).rejects.toMatchObject({ status: 409 });
  });
  it('post() gộp header tuỳ chỉnh vào request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, data: { id: 'c1' } }),
    });

    await taskClient.post('/api/v1/projects/project-1/tasks', { title: 'X' }, {
      'Idempotency-Key': 'idem-key-1',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idem-key-1',
    });
  });
});
