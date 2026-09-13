import type { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvalidateScheduler } from './invalidate-scheduler';

describe('hàng đợi invalidate task', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gom nhiều lần gọi cùng key thành một lần invalidate', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;
    const schedule = createInvalidateScheduler(client, 400);

    schedule(['tasks', 'board', 'project-1']);
    schedule(['tasks', 'board', 'project-1']);
    schedule(['tasks', 'board', 'project-1']);
    await vi.advanceTimersByTimeAsync(400);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidate riêng từng key khác nhau', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;
    const schedule = createInvalidateScheduler(client, 400);

    schedule(['tasks', 'board', 'project-1']);
    schedule(['tasks', 'feed']);
    await vi.advanceTimersByTimeAsync(400);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['tasks', 'board', 'project-1'] },
      { cancelRefetch: false },
    );
    expect(invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['tasks', 'feed'] },
      { cancelRefetch: false },
    );
  });

  it('không huỷ request đang chạy khi flush', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;
    const schedule = createInvalidateScheduler(client, 400);

    schedule(['tasks', 'my']);
    await vi.advanceTimersByTimeAsync(400);

    expect(invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['tasks', 'my'] },
      { cancelRefetch: false },
    );
  });
});
