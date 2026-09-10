import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiConversation } from '@/features/ai';
import { clearStream } from '@/features/ai/lib/ai-stream-runner';
import type { AiSession, AiSessionActions, AiStreamFn } from '@/features/ai';

const usedKeys = new Set<string>();

function streamKey(value: string): string {
  usedKeys.add(value);
  return value;
}

function createActions(): AiSessionActions {
  return {
    createSession: vi.fn(() => 'session-1'),
    pushMessage: vi.fn(),
    dropLastAssistant: vi.fn(() => []),
    markLastUserFailed: vi.fn(),
    prepareResend: vi.fn(() => []),
    removeMessage: vi.fn(() => null),
  };
}

function createSession(id = 'session-1'): AiSession {
  return { id, title: 'Phiên test', messages: [], updatedAt: 0 };
}

function holdStream(): {
  stream: AiStreamFn;
  emit: (text: string) => void;
  finish: (text: string) => void;
  signal: () => AbortSignal;
} {
  let onDelta: (text: string) => void = () => undefined;
  let resolveStream: (text: string) => void = () => undefined;
  let rejectStream: (reason?: unknown) => void = () => undefined;
  let capturedSignal: AbortSignal | undefined;
  const stream: AiStreamFn = (_messages, _attachments, options) => {
    onDelta = options.onDelta;
    capturedSignal = options.signal;
    options.signal?.addEventListener('abort', () => {
      rejectStream(new DOMException('Aborted', 'AbortError'));
    });
    return new Promise<string>((resolve, reject) => {
      resolveStream = resolve;
      rejectStream = reject;
    });
  };

  return {
    stream,
    emit: (text) => onDelta(text),
    finish: (text) => resolveStream(text),
    signal: () => {
      if (!capturedSignal) throw new Error('Stream chưa bắt đầu');
      return capturedSignal;
    },
  };
}

afterEach(() => {
  usedKeys.forEach(clearStream);
  usedKeys.clear();
});

describe('useAiConversation', () => {
  it('nên dùng hàm stream được truyền vào khi có tham số stream', async () => {
    const stream: AiStreamFn = vi.fn().mockResolvedValue('Xong');
    const actions = createActions();
    const { result } = renderHook(() =>
      useAiConversation({
        streamKey: streamKey('chat:custom-stream'),
        session: null,
        actions,
        onSettled: vi.fn(),
        stream,
      }),
    );

    await act(async () => result.current.send('Xin chào', []));

    expect(stream).toHaveBeenCalledOnce();
    expect(actions.pushMessage).toHaveBeenLastCalledWith('session-1', {
      role: 'assistant',
      content: 'Xong',
    });
  });

  it('nên chuyển tiếp tên công cụ khi đường truyền phát sự kiện tool', async () => {
    const stream: AiStreamFn = async (_messages, _attachments, options) => {
      options.onTool?.('read_page');
      options.onDelta('xong');
      return 'xong';
    };
    const onTool = vi.fn();
    const { result } = renderHook(() =>
      useAiConversation({
        streamKey: streamKey('chat:tool'),
        session: null,
        actions: createActions(),
        onSettled: vi.fn(),
        stream,
        onTool,
      }),
    );

    await act(async () => result.current.send('Đọc trang', []));

    expect(onTool).toHaveBeenCalledOnce();
    expect(onTool).toHaveBeenCalledWith('read_page');
  });

  it('nên KHÔNG ngắt luồng khi component bị gỡ', async () => {
    const controlled = holdStream();
    const key = streamKey('chat:unmount');
    const { result, unmount } = renderHook(() =>
      useAiConversation({
        streamKey: key,
        session: createSession('unmount'),
        actions: createActions(),
        onSettled: vi.fn(),
        stream: controlled.stream,
      }),
    );
    let running = Promise.resolve();
    act(() => { running = result.current.send('Xin chào', []); });

    unmount();

    expect(controlled.signal().aborted).toBe(false);
    controlled.finish('Xong');
    await running;
  });

  it('nên hiện lại text đang chạy khi dựng lại component', async () => {
    const controlled = holdStream();
    const key = streamKey('chat:remount');
    const options = {
      streamKey: key,
      session: createSession('remount'),
      actions: createActions(),
      onSettled: vi.fn(),
      stream: controlled.stream,
    };
    const first = renderHook(() => useAiConversation(options));
    let running = Promise.resolve();
    act(() => { running = first.result.current.send('Xin chào', []); });
    act(() => controlled.emit('Phần đang chạy'));
    await waitFor(() => expect(first.result.current.streaming).toBe('Phần đang chạy'));

    first.unmount();
    const second = renderHook(() => useAiConversation(options));

    expect(second.result.current.streaming).toBe('Phần đang chạy');
    controlled.finish('Phần đang chạy đầy đủ');
    await act(async () => running);
  });

  it('nên vẫn dừng được luồng khi bấm nút Dừng', async () => {
    const controlled = holdStream();
    const key = streamKey('chat:existing');
    const { result } = renderHook(() =>
      useAiConversation({
        streamKey: key,
        session: createSession('existing'),
        actions: createActions(),
        onSettled: vi.fn(),
        stream: controlled.stream,
      }),
    );
    let running = Promise.resolve();
    act(() => { running = result.current.send('Xin chào', []); });

    act(() => result.current.stop());

    expect(controlled.signal().aborted).toBe(true);
    await act(async () => running);
  });

  it('nên dừng được luồng của phiên vừa tạo khi bấm Dừng ngay sau tin nhắn đầu tiên', async () => {
    const controlled = holdStream();
    const initialKey = streamKey('chat:');
    streamKey('chat:session-1');
    const { result } = renderHook(() =>
      useAiConversation({
        streamKey: initialKey,
        session: null,
        actions: createActions(),
        onSettled: vi.fn(),
        stream: controlled.stream,
      }),
    );
    let running = Promise.resolve();
    act(() => { running = result.current.send('Tin đầu tiên', []); });

    act(() => result.current.stop());
    const wasAbortedImmediately = controlled.signal().aborted;
    if (!wasAbortedImmediately) controlled.finish('Không bị dừng');
    await act(async () => running);

    expect(wasAbortedImmediately).toBe(true);
  });
});
