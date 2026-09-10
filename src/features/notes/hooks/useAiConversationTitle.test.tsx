import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiConversationTitle } from '@/features/notes/hooks/useAiConversationTitle';
import { aiApi } from '@/services/ai.api';
import { notionAiHistoryApi } from '@/services/notion-ai-history.api';

vi.mock('@/services/ai.api', () => ({ aiApi: { chat: vi.fn() } }));
vi.mock('@/services/notion-ai-history.api', () => ({
  notionAiHistoryApi: { rename: vi.fn() },
}));

const chat = vi.mocked(aiApi.chat);
const rename = vi.mocked(notionAiHistoryApi.rename);

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const base = {
  workspaceId: 'workspace-1',
  activeId: 'conversation-1',
  conversations: [{ id: 'conversation-1', title: null, updatedAt: new Date().toISOString() }],
  messages: [
    { role: 'user' as const, content: 'Hãy tóm tắt kế hoạch quý này' },
    { role: 'assistant' as const, content: 'Đây là nội dung tóm tắt' },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
  rename.mockImplementation(async (id, title) => ({ id, title }));
});

describe('đặt tiêu đề hội thoại AI của ghi chú', () => {
  it('nên đặt tiêu đề bằng AI sau lượt đầu tiên khi hội thoại chưa có tiêu đề', async () => {
    chat.mockResolvedValue('Kế hoạch quý');

    renderHook(() => useAiConversationTitle(base), { wrapper: wrapper() });

    await waitFor(() => expect(rename).toHaveBeenCalledWith('conversation-1', 'Kế hoạch quý'));
    expect(chat).toHaveBeenCalledOnce();
  });

  it('nên lùi về 40 ký tự đầu của câu hỏi khi gọi đặt tiêu đề thất bại', async () => {
    const question = 'Đây là câu hỏi đầu tiên rất dài để dùng làm tiêu đề dự phòng';
    chat.mockRejectedValue(new Error('AI lỗi'));

    renderHook(() => useAiConversationTitle({
      ...base,
      messages: [base.messages[0]!, base.messages[1]!,].map((message, index) =>
        index === 0 ? { ...message, content: question } : message),
    }), { wrapper: wrapper() });

    await waitFor(() => expect(rename).toHaveBeenCalledWith(
      'conversation-1', question.slice(0, 40),
    ));
  });

  it('nên chỉ gọi đặt tiêu đề một lần cho mỗi hội thoại', async () => {
    chat.mockResolvedValue('Kế hoạch quý');
    const { rerender } = renderHook(
      ({ messages }) => useAiConversationTitle({ ...base, messages }),
      { initialProps: { messages: base.messages }, wrapper: wrapper() },
    );

    await waitFor(() => expect(rename).toHaveBeenCalledOnce());
    rerender({ messages: [...base.messages, { role: 'user', content: 'Câu tiếp theo' }] });

    expect(chat).toHaveBeenCalledOnce();
  });
});
