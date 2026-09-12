import { act, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiSession, AiSessionActions } from '@/features/ai';
import { useTasksUIStore } from '@/features/tasks/stores/tasks-ui.store';
import { taskAiHistoryApi } from '@/services/task-ai-history.api';
import { useTaskAiConversation } from './useTaskAiConversation';

vi.mock('@/services/task-ai-history.api', () => ({
  taskAiHistoryApi: {
    list: vi.fn(), create: vi.fn(), detail: vi.fn(), appendTurn: vi.fn(),
    rename: vi.fn(), remove: vi.fn(),
  },
}));

const list = vi.mocked(taskAiHistoryApi.list);
const detail = vi.mocked(taskAiHistoryApi.detail);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createWrapper(client = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  list.mockResolvedValue([]);
  detail.mockImplementation(async (id) => ({ id, title: null, messages: [] }));
  useTasksUIStore.setState({ aiConversationByProjectId: {} });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('lịch sử hội thoại AI của công việc', () => {
  it('nên tải danh sách hội thoại khi mở panel', async () => {
    list.mockResolvedValue([{
      id: 'conversation-1',
      title: 'Tiến độ dự án',
      projectId: 'project-1',
      updatedAt: '2026-09-12T08:00:00.000Z',
    }, {
      id: 'conversation-2',
      title: 'Dự án khác',
      projectId: 'project-2',
      updatedAt: '2026-09-11T08:00:00.000Z',
    }]);

    const { result } = renderHook(() => useTaskAiConversation('project-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(result.current.conversations[0]?.id).toBe('conversation-1');
    expect(list).toHaveBeenCalledOnce();
  });

  it('nên chọn và tải chi tiết một hội thoại', async () => {
    detail.mockResolvedValue({
      id: 'conversation-1',
      title: 'Tiến độ dự án',
      messages: [{
        id: 'message-1',
        role: 'user',
        content: 'Dự án đang tiến triển thế nào?',
        createdAt: '2026-09-12T08:00:00.000Z',
      }],
    });
    const { result } = renderHook(() => useTaskAiConversation('project-1'), {
      wrapper: createWrapper(),
    });

    act(() => result.current.select('conversation-1'));

    expect(result.current.activeId).toBe('conversation-1');
    await waitFor(() => expect(result.current.session.messages).toEqual([
      expect.objectContaining({ role: 'user', content: 'Dự án đang tiến triển thế nào?' }),
    ]));
    expect(detail).toHaveBeenCalledWith('conversation-1');
  });

  it('nên giữ lịch sử cũ khi gửi thêm một lượt vào hội thoại đã chọn', async () => {
    const oldConversation = {
      id: 'conversation-1',
      title: 'Tiến độ dự án',
      messages: [{
        id: 'message-1',
        role: 'user' as const,
        content: 'Câu hỏi cũ',
        createdAt: '2026-09-12T08:00:00.000Z',
      }, {
        id: 'message-2',
        role: 'assistant' as const,
        content: 'Câu trả lời cũ',
        createdAt: '2026-09-12T08:00:01.000Z',
      }],
    };
    vi.mocked(taskAiHistoryApi.appendTurn).mockResolvedValue({ ok: true });
    let resolveDetail!: (value: typeof oldConversation) => void;
    detail.mockImplementation(() => new Promise((resolve) => { resolveDetail = resolve; }));
    let currentMessages: AiSession['messages'] = [];
    let selectConversation: ((id: string) => void) | undefined;
    let sent = false;
    function SendBeforePassiveEffect({
      session,
      actions,
    }: {
      session: AiSession;
      actions: AiSessionActions;
    }) {
      useEffect(() => {
        if (sent) return;
        sent = true;
        actions.pushMessage(session.id, { role: 'user', content: 'Câu hỏi mới' });
        actions.pushMessage(session.id, { role: 'assistant', content: 'Câu trả lời mới' });
      }, [actions, session.id]);
      return null;
    }
    function Harness() {
      const task = useTaskAiConversation('project-1');
      currentMessages = task.session.messages;
      selectConversation = task.select;
      return <>
        {task.activeId === 'conversation-1' && task.session.messages.length === 2
          ? <SendBeforePassiveEffect session={task.session} actions={task.actions} /> : null}
      </>;
    }
    render(<Harness />, { wrapper: createWrapper() });

    act(() => selectConversation?.('conversation-1'));
    await waitFor(() => expect(detail).toHaveBeenCalledWith('conversation-1'));
    await act(async () => {
      resolveDetail(oldConversation);
      await Promise.resolve();
    });

    await waitFor(() => expect(currentMessages).toEqual([
      expect.objectContaining({ role: 'user', content: 'Câu hỏi cũ' }),
      expect.objectContaining({ role: 'assistant', content: 'Câu trả lời cũ' }),
      expect.objectContaining({ role: 'user', content: 'Câu hỏi mới' }),
      expect.objectContaining({ role: 'assistant', content: 'Câu trả lời mới' }),
    ]));
  });

  it('nên tạo lại phiên nháp mà chưa ghi lên máy chủ', async () => {
    const create = vi.mocked(taskAiHistoryApi.create);
    const appendTurn = vi.mocked(taskAiHistoryApi.appendTurn);
    const { result } = renderHook(() => useTaskAiConversation('project-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.select('conversation-1'));

    act(() => result.current.startNew());

    expect(result.current.activeId).toBeNull();
    expect(result.current.session.messages).toEqual([]);
    expect(create).not.toHaveBeenCalled();
    expect(appendTurn).not.toHaveBeenCalled();
  });
});
