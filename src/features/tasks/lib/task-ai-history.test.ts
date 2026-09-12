import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taskAiHistoryApi } from '@/services/task-ai-history.api';
import { persistTaskAiTurn } from './task-ai-history';

vi.mock('@/services/task-ai-history.api', () => ({
  taskAiHistoryApi: {
    list: vi.fn(), create: vi.fn(), detail: vi.fn(), appendTurn: vi.fn(),
    rename: vi.fn(), remove: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(taskAiHistoryApi.create).mockResolvedValue({ id: 'conversation-new' });
  vi.mocked(taskAiHistoryApi.appendTurn).mockResolvedValue({ ok: true });
});

describe('lưu lượt hội thoại AI của công việc', () => {
  it('nên tạo hội thoại ở lượt đầu, lưu đúng nội dung và làm mới cache', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const id = await persistTaskAiTurn(
      { projectId: 'project-1', activeId: null, queryClient },
      { role: 'user', content: 'Tóm tắt tiến độ' },
      { status: 'done', text: 'Dự án đang đúng hạn' },
    );

    expect(taskAiHistoryApi.create).toHaveBeenCalledWith('project-1');
    expect(taskAiHistoryApi.appendTurn).toHaveBeenCalledWith('conversation-new', {
      user: { role: 'user', content: 'Tóm tắt tiến độ' },
      assistant: { role: 'assistant', content: 'Dự án đang đúng hạn' },
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['tasks', 'ai-conversations'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['tasks', 'ai-conversation', 'conversation-new'],
    });
    expect(id).toBe('conversation-new');
  });

  it('nên không tạo hội thoại khi AI chưa trả lời', async () => {
    const id = await persistTaskAiTurn(
      { projectId: null, activeId: null, queryClient: new QueryClient() },
      { role: 'user', content: 'Câu hỏi' },
      { status: 'aborted', text: '' },
    );

    expect(id).toBeNull();
    expect(taskAiHistoryApi.create).not.toHaveBeenCalled();
    expect(taskAiHistoryApi.appendTurn).not.toHaveBeenCalled();
  });
});
