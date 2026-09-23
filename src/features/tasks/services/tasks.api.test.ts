import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tasksApi } from './tasks.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({ success: true, data: { id: 'task-1' } }),
  });
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => vi.unstubAllGlobals());

describe('task dueDate request payload', () => {
  for (const operation of ['create', 'update'] as const) {
    it.each([
      ['2026-09-30', '2026-09-30T00:00:00.000Z'],
      ['2026-09-30T15:30:00+07:00', '2026-09-30T15:30:00+07:00'],
      [undefined, undefined],
    ])(`${operation} serializes %s as %s`, async (dueDate, expected) => {
      const input = { title: 'Fix API', columnId: 'column-1', dueDate };
      if (operation === 'create') {
        await tasksApi.createTask('project-1', input, 'idem-1');
      } else {
        await tasksApi.updateTask('task-1', input);
      }
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        title: 'Fix API', columnId: 'column-1',
        ...(expected === undefined ? {} : { dueDate: expected }),
      });
      expect(input.dueDate).toBe(dueDate);
    });
  }

  it('preserves null when clearing the due date', async () => {
    await tasksApi.updateTask('task-1', { dueDate: null });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ dueDate: null });
  });
});
