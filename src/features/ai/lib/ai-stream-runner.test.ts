import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearStream,
  getSnapshot,
  startStream,
  stopStream,
  subscribe,
} from './ai-stream-runner';
import type { AiStreamResult } from './ai-stream-runner';

const usedKeys = new Set<string>();

function key(name: string): string {
  usedKeys.add(name);
  return name;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  usedKeys.forEach(clearStream);
  usedKeys.clear();
});

describe('ai-stream-runner', () => {
  it('nên gọi onFinish với đủ text khi stream chạy xong', async () => {
    const onFinish = vi.fn<(result: AiStreamResult) => void>();

    await startStream(key('done'), {
      run: async (onDelta) => {
        onDelta('Xin ');
        onDelta('chào');
        return 'Xin chào';
      },
      onFinish,
    });

    expect(onFinish).toHaveBeenCalledWith({ text: 'Xin chào', status: 'done' });
  });

  it("nên gọi onFinish với text dở và status 'aborted' khi bị dừng giữa chừng", async () => {
    const onFinish = vi.fn<(result: AiStreamResult) => void>();
    const streamKey = key('aborted');
    const running = startStream(streamKey, {
      run: (onDelta, signal) => {
        onDelta('Một phần');
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Đã dừng')));
        });
      },
      onFinish,
    });

    stopStream(streamKey);
    await running;

    expect(onFinish).toHaveBeenCalledWith({ text: 'Một phần', status: 'aborted' });
  });

  it("nên gọi onFinish với status 'error' khi stream lỗi", async () => {
    const error = new Error('Mất kết nối');
    const onFinish = vi.fn<(result: AiStreamResult) => void>();

    await startStream(key('error'), {
      run: async (onDelta) => {
        onDelta('Dở');
        throw error;
      },
      onFinish,
    });

    expect(onFinish).toHaveBeenCalledWith({ text: 'Dở', status: 'error', error });
  });

  it('nên giữ hai luồng tách biệt khi chạy song song hai key khác nhau', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const firstFinish = vi.fn<(result: AiStreamResult) => void>();
    const secondFinish = vi.fn<(result: AiStreamResult) => void>();
    const firstRun = startStream(key('first'), {
      run: (onDelta) => { onDelta('A'); return first.promise; },
      onFinish: firstFinish,
    });
    const secondRun = startStream(key('second'), {
      run: (onDelta) => { onDelta('B'); return second.promise; },
      onFinish: secondFinish,
    });

    second.resolve('BB');
    first.resolve('AA');
    await Promise.all([firstRun, secondRun]);

    expect(firstFinish).toHaveBeenCalledWith({ text: 'AA', status: 'done' });
    expect(secondFinish).toHaveBeenCalledWith({ text: 'BB', status: 'done' });
  });

  it('nên báo cho subscriber khi có delta mới', async () => {
    const streamKey = key('subscriber');
    const subscriber = vi.fn();
    subscribe(streamKey, subscriber);

    await startStream(streamKey, {
      run: async (onDelta) => { onDelta('Mới'); return 'Mới'; },
      onFinish: vi.fn(),
    });

    expect(subscriber).toHaveBeenCalled();
    expect(getSnapshot(streamKey).text).toBe('Mới');
  });

  it('nên trả về cùng một tham chiếu snapshot khi không có gì thay đổi', () => {
    const streamKey = key('stable');
    const first = getSnapshot(streamKey);

    expect(getSnapshot(streamKey)).toBe(first);
  });
});
