import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConversationsApi } from '@/services/ai-conversations.api';
import { useAiConversations } from './useAiConversations';

vi.mock('@/services/ai-conversations.api', () => ({
  aiConversationsApi: {
    list: vi.fn(), detail: vi.fn(), rename: vi.fn(), remove: vi.fn(),
  },
}));

const list = vi.mocked(aiConversationsApi.list);
const detail = vi.mocked(aiConversationsApi.detail);

function createWrapper(client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  list.mockResolvedValue([]);
  detail.mockImplementation(async (id) => ({
    id, title: null, origin: 'TASKS', context: null, messages: [],
  }));
});

afterEach(() => vi.clearAllMocks());

describe('lịch sử hội thoại AI hợp nhất', () => {
  it('chọn hội thoại và tải chi tiết', async () => {
    detail.mockResolvedValue({
      id: 'conversation-1', title: 'Tiến độ', origin: 'TASKS',
      context: { projectId: 'project-1' },
      messages: [{
        id: 'message-1', role: 'user', content: 'Câu hỏi cũ', status: null,
        toolNames: null, attachments: null, createdAt: '2026-09-12T08:00:00.000Z',
      }],
    });
    const { result } = renderHook(
      () => useAiConversations({ scope: 'project-1' }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.select('conversation-1'));

    expect(result.current.activeId).toBe('conversation-1');
    await waitFor(() => expect(result.current.session.messages).toEqual([
      expect.objectContaining({ role: 'user', content: 'Câu hỏi cũ' }),
    ]));
  });

  it('tạo phiên nháp mới mà không gọi API ghi lịch sử', async () => {
    const { result } = renderHook(
      () => useAiConversations({ scope: 'project-1' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.select('conversation-1'));

    act(() => result.current.startNew());

    expect(result.current.activeId).toBeNull();
    expect(result.current.session.messages).toEqual([]);
  });

  it('ghi nhớ ID do BE trả về chỉ khi đang ở phiên nháp và làm mới cache', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () => useAiConversations({ scope: 'project-1' }),
      { wrapper: createWrapper(client) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.remember('conversation-new'));

    expect(result.current.activeId).toBe('conversation-new');
    expect(result.current.session.id).toBe('conversation-new');
    expect(invalidateQueries).toHaveBeenCalledTimes(2);

    act(() => result.current.remember('conversation-other'));
    expect(result.current.activeId).toBe('conversation-new');
  });

  it('vẫn nhận tin nhắn mới ngay sau lượt đầu khi chi tiết hội thoại còn đang tải', async () => {
    let resolveDetail: ((value: never) => void) | undefined;
    detail.mockImplementation(() => new Promise((resolve) => { resolveDetail = resolve as never; }));
    const { result } = renderHook(
      () => useAiConversations({ scope: 'project-1' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.actions.pushMessage(result.current.session.id, { role: 'user', content: 'hi' }));
    act(() => result.current.remember('conversation-new'));
    // detail đang pending (chưa resolve) — câu trả lời stream xong phải được ghi vào phiên cục bộ
    act(() => result.current.actions.pushMessage('conversation-new', { role: 'assistant', content: 'Chào bạn' }));

    expect(result.current.session.messages.map((m) => m.content)).toEqual(['hi', 'Chào bạn']);
    expect(resolveDetail).toBeDefined();
  });

  it('giữ lịch sử cũ khi gửi thêm lượt vào hội thoại đã chọn', async () => {
    detail.mockResolvedValue({
      id: 'conversation-1', title: 'Tiến độ', origin: 'TASKS', context: null,
      messages: [
        {
          id: 'message-1', role: 'user', content: 'Câu hỏi cũ', status: null,
          toolNames: null, attachments: null, createdAt: '2026-09-12T08:00:00.000Z',
        },
        {
          id: 'message-2', role: 'assistant', content: 'Câu trả lời cũ', status: null,
          toolNames: null, attachments: null, createdAt: '2026-09-12T08:00:01.000Z',
        },
      ],
    });
    const { result } = renderHook(
      () => useAiConversations({ scope: 'project-1' }),
      { wrapper: createWrapper() },
    );
    act(() => result.current.select('conversation-1'));
    await waitFor(() => expect(result.current.session.messages).toHaveLength(2));

    act(() => {
      result.current.actions.pushMessage('conversation-1', {
        role: 'user', content: 'Câu hỏi mới',
      });
      result.current.actions.pushMessage('conversation-1', {
        role: 'assistant', content: 'Câu trả lời mới',
      });
    });

    expect(result.current.session.messages.map(({ content }) => content)).toEqual([
      'Câu hỏi cũ', 'Câu trả lời cũ', 'Câu hỏi mới', 'Câu trả lời mới',
    ]);
  });
});
