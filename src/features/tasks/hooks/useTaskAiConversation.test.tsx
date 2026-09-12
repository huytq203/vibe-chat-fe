import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
