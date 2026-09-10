import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiConversation, type AiStreamFn } from '@/features/ai';
import { clearStream } from '@/features/ai/lib/ai-stream-runner';
import { useNoteAiConversation } from '@/features/notes/hooks/useNoteAiConversation';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { notionAiHistoryApi } from '@/services/notion-ai-history.api';

vi.mock('@/services/notion-ai-history.api', () => ({
  notionAiHistoryApi: {
    list: vi.fn(), create: vi.fn(), detail: vi.fn(), appendTurn: vi.fn(),
    rename: vi.fn(), remove: vi.fn(), uploadAttachment: vi.fn(),
  },
}));

const list = vi.mocked(notionAiHistoryApi.list);
const create = vi.mocked(notionAiHistoryApi.create);
const detail = vi.mocked(notionAiHistoryApi.detail);
const appendTurn = vi.mocked(notionAiHistoryApi.appendTurn);
const usedKeys = new Set<string>();

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function controlledStream(): {
  stream: AiStreamFn;
  emit: (text: string) => void;
  finish: (text: string) => void;
  fail: (error: Error) => void;
} {
  let onDelta: (text: string) => void = () => undefined;
  let resolveStream: (text: string) => void = () => undefined;
  let rejectStream: (error: Error) => void = () => undefined;
  const stream: AiStreamFn = (_messages, _attachments, options) => {
    onDelta = options.onDelta;
    options.signal?.addEventListener('abort', () => rejectStream(new Error('Đã dừng')));
    return new Promise<string>((resolve, reject) => {
      resolveStream = resolve;
      rejectStream = reject;
    });
  };
  return {
    stream,
    emit: (text) => onDelta(text),
    finish: (text) => resolveStream(text),
    fail: (error) => rejectStream(error),
  };
}

function useHarness(stream: AiStreamFn, onSettled = vi.fn()) {
  const note = useNoteAiConversation('workspace-1', 'page-1');
  const conversation = useAiConversation({
    streamKey: 'notes:workspace-1',
    session: note.session,
    actions: note.actions,
    stream,
    onSettled,
  });
  return { note, conversation };
}

beforeEach(() => {
  list.mockResolvedValue([]);
  create.mockResolvedValue({ id: 'conversation-new' });
  detail.mockImplementation(async (id) => ({ id, title: null, messages: [] }));
  appendTurn.mockResolvedValue({ ok: true });
  usedKeys.add('notes:workspace-1');
});

afterEach(() => {
  usedKeys.forEach(clearStream);
  usedKeys.clear();
  vi.clearAllMocks();
  useNotesUiStore.setState({ aiConversationByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
});

describe('lưu lượt chat AI ngoài vòng đời component', () => {
  it('nên vẫn lưu lượt chat khi component bị gỡ giữa lúc đang stream', async () => {
    const controlled = controlledStream();
    const onSettled = vi.fn();
    const view = renderHook(() => useHarness(controlled.stream, onSettled), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(view.result.current.note.isLoading).toBe(false));
    let running = Promise.resolve();
    act(() => { running = view.result.current.conversation.send('Câu hỏi', []); });

    view.unmount();
    controlled.finish('Câu trả lời');
    await running;

    await waitFor(() => expect(appendTurn).toHaveBeenCalledWith('conversation-new', {
      user: { role: 'user', content: 'Câu hỏi' },
      assistant: { role: 'assistant', content: 'Câu trả lời' },
    }));
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('nên lưu phần trả lời dở kèm trạng thái incomplete khi luồng lỗi giữa chừng', async () => {
    const controlled = controlledStream();
    const { result } = renderHook(() => useHarness(controlled.stream), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.note.isLoading).toBe(false));
    let running = Promise.resolve();
    act(() => { running = result.current.conversation.send('Câu hỏi', []); });
    act(() => controlled.emit('Trả lời dở'));
    controlled.fail(new Error('Mất mạng'));
    await act(async () => running);

    await waitFor(() => expect(appendTurn).toHaveBeenCalledWith('conversation-new', {
      user: { role: 'user', content: 'Câu hỏi' },
      assistant: { role: 'assistant', content: 'Trả lời dở', status: 'incomplete' },
    }));
  });

  it('nên KHÔNG để lại hội thoại rỗng khi luồng bị ngắt trước khi AI kịp trả lời', async () => {
    const controlled = controlledStream();
    const { result } = renderHook(() => useHarness(controlled.stream), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.note.isLoading).toBe(false));
    let running = Promise.resolve();
    act(() => { running = result.current.conversation.send('Câu hỏi', []); });

    act(() => result.current.conversation.stop());
    await act(async () => running);

    expect(create).not.toHaveBeenCalled();
    expect(appendTurn).not.toHaveBeenCalled();
    expect(result.current.note.session.messages[0]?.status).toBe('failed');
  });

  it('nên vẫn lưu được tin người dùng khi AI chưa trả lời xong', async () => {
    const controlled = controlledStream();
    const { result } = renderHook(() => useHarness(controlled.stream), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.note.isLoading).toBe(false));
    let running = Promise.resolve();
    act(() => { running = result.current.conversation.send('Câu hỏi đang chờ', []); });
    act(() => controlled.emit('Một phần'));

    act(() => result.current.conversation.stop());
    await act(async () => running);

    await waitFor(() => expect(appendTurn).toHaveBeenCalledWith('conversation-new', {
      user: { role: 'user', content: 'Câu hỏi đang chờ' },
      assistant: { role: 'assistant', content: 'Một phần' },
    }));
  });
});
