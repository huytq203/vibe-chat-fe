import { QueryClient } from '@tanstack/react-query';
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
    const client = { invalidateQueries, isFetching: () => 0 } as unknown as QueryClient;
    const schedule = createInvalidateScheduler(client, 400);

    schedule(['tasks', 'board', 'project-1']);
    schedule(['tasks', 'board', 'project-1']);
    schedule(['tasks', 'board', 'project-1']);
    await vi.advanceTimersByTimeAsync(400);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidate riêng từng key khác nhau', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries, isFetching: () => 0 } as unknown as QueryClient;
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
    const client = { invalidateQueries, isFetching: () => 0 } as unknown as QueryClient;
    const schedule = createInvalidateScheduler(client, 400);

    schedule(['tasks', 'my']);
    await vi.advanceTimersByTimeAsync(400);

    expect(invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['tasks', 'my'] },
      { cancelRefetch: false },
    );
  });

  describe('khi query đang fetch', () => {
    const key = ['tasks', 'board', 'project-1'];

    it('nên hẹn invalidate lại sang cửa sổ sau khi query đang fetch', async () => {
      const client = new QueryClient();
      const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
      let resolveFetch: (value: string) => void = () => undefined;
      const fetching = client.fetchQuery({
        queryKey: key,
        queryFn: () => new Promise<string>((resolve) => (resolveFetch = resolve)),
      });
      const schedule = createInvalidateScheduler(client, 400);

      schedule(key);
      await vi.advanceTimersByTimeAsync(400);
      expect(invalidateQueries).not.toHaveBeenCalled();

      resolveFetch('xong');
      await fetching;
      await vi.advanceTimersByTimeAsync(400);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key }, { cancelRefetch: false });
    });

    it('nên invalidate ngay ở cửa sổ hiện tại khi query không fetch', async () => {
      const client = new QueryClient();
      client.setQueryData(key, 'cũ');
      const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
      const schedule = createInvalidateScheduler(client, 400);

      schedule(key);
      await vi.advanceTimersByTimeAsync(400);

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
    });

    it('nên chỉ hoãn key đang fetch và vẫn invalidate các key còn lại', async () => {
      const client = new QueryClient();
      const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
      void client.fetchQuery({ queryKey: key, queryFn: () => new Promise<string>(() => undefined) });
      const schedule = createInvalidateScheduler(client, 400);

      schedule(key);
      schedule(['tasks', 'feed']);
      await vi.advanceTimersByTimeAsync(400);

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith(
        { queryKey: ['tasks', 'feed'] },
        { cancelRefetch: false },
      );
    });
  });
});
