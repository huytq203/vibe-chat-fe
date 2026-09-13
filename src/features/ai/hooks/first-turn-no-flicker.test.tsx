import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useCallback } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConversationsApi } from '@/services/ai-conversations.api';
import { withPendingUser } from '@/features/ai/components/AiMessageList';
import { clearStream } from '@/features/ai/lib/ai-stream-runner';
import type { AiStreamFn } from '@/features/ai';
import type { AiStreamOptions } from '@/services/ai.api';
import { useAiConversation } from './useAiConversation';
import { useAiConversations } from './useAiConversations';

vi.mock('@/services/ai-conversations.api', () => ({
  aiConversationsApi: { list: vi.fn(), detail: vi.fn(), rename: vi.fn(), remove: vi.fn() },
}));
const list = vi.mocked(aiConversationsApi.list);
const detail = vi.mocked(aiConversationsApi.detail);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let onDelta: (t: string) => void = () => undefined;
let onDone: ((r: { conversationId: string }) => void) | undefined;
let resolveStream: (t: string) => void = () => undefined;
const stream = (_m: unknown, _a: unknown, options: AiStreamOptions): Promise<string> => {
  onDelta = options.onDelta; onDone = options.onDone;
  return new Promise((resolve) => { resolveStream = resolve; });
};

const trace: string[] = [];
function useCombined() {
  const conv = useAiConversations({ scope: 'chat' });
  const { session, actions, activeId, remember } = conv;
  const s = useCallback<AiStreamFn>((m, a, o) => stream(m, a, { ...o, onDone: (r: { conversationId: string }) => remember(r.conversationId) }), [remember]);
  const c = useAiConversation({ streamKey: `chat:${session.id}`, session, actions, stream: s, onSettled: () => undefined });
  const visible = withPendingUser(session.messages, c.pendingUser, c.loading);
  trace.push(`id=${session.id.slice(0,8)} active=${activeId ?? '-'} loading=${c.loading} msgs=${visible.length} streaming=${c.streaming ? 'y' : 'n'} isLoading=${conv.isLoading}`);
  return { conv, c };
}

beforeEach(() => {
  list.mockResolvedValue([]);
  detail.mockImplementation(async (id) => ({ id, title: null, origin: 'CHAT', context: null, messages: [
    { id: 'm1', role: 'user', content: 'hi', createdAt: '', status: null, toolNames: null, attachments: null },
    { id: 'm2', role: 'assistant', content: 'Chào', createdAt: '', status: null, toolNames: null, attachments: null },
  ] }));
});
afterEach(() => { clearStream('chat:x'); vi.clearAllMocks(); });

describe('lượt đầu tiên của hội thoại mới', () => {
  it('nên không nháy về trạng thái trống giữa lúc BE trả done và detail tải về', async () => {
    const { result } = renderHook(() => useCombined(), { wrapper });
    await waitFor(() => expect(result.current.conv.isLoading).toBe(false));
    trace.push('--- send');
    await act(async () => { void result.current.c.send('hi', []); });
    trace.push('--- delta');
    act(() => onDelta('Chào'));
    trace.push('--- done');
    await act(async () => { onDone?.({ conversationId: 'conv-1' }); resolveStream('Chào'); });
    trace.push('--- settle');
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    const afterSend = trace.slice(trace.indexOf('--- send') + 1).filter((l) => l.startsWith('id='));
    expect(afterSend.every((l) => !/msgs=0/.test(l))).toBe(true);
  });
});
