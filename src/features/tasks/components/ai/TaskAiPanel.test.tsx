import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { aiApi } from '@/services/ai.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { TaskAiPanel } from './TaskAiPanel';

const sessionActions = {
  createSession: vi.fn(() => 'task-ai'),
  pushMessage: vi.fn(),
  dropLastAssistant: vi.fn(() => []),
  markLastUserFailed: vi.fn(),
  prepareResend: vi.fn(() => []),
  removeMessage: vi.fn(() => null),
};

vi.mock('@/features/tasks/hooks/useTaskAiConversation', () => ({
  useTaskAiConversation: () => ({
    conversations: [],
    activeId: null,
    session: {
      id: 'task-ai',
      title: 'Cuộc trò chuyện mới',
      messages: [],
      updatedAt: 0,
    },
    actions: sessionActions,
    isLoading: false,
    isError: false,
    select: vi.fn(),
    startNew: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/tasks/hooks/useTaskAiConversationTitle', () => ({
  useTaskAiConversationTitle: () => null,
}));

vi.mock('@/services/ai.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ai.api')>();
  return {
    ...actual,
    aiApi: {
      ...actual.aiApi,
      chatStream: vi.fn().mockResolvedValue('Đã xong'),
    },
  };
});

describe('panel trợ lý AI cho công việc', () => {
  beforeEach(() => {
    vi.mocked(aiApi.chatStream).mockReset().mockResolvedValue('Đã xong');
    useTasksUIStore.setState({ selectedProjectId: 'project-1', isAiPanelOpen: true });
  });

  it('hiển thị đủ ba gợi ý khi chưa có hội thoại', () => {
    renderWithProviders(<TaskAiPanel />);

    expect(screen.getByRole('button', {
      name: 'Cuộc trò chuyện mới, mở lịch sử hội thoại',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo hội thoại mới' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Việc của tôi đang mở' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiến độ project này' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo task mới giao cho…' })).toBeInTheDocument();
  });

  it('gửi context task và làm mới cache sau khi công cụ thay đổi task chạy xong', async () => {
    vi.mocked(aiApi.chatStream).mockImplementation(async (_messages, _attachments, options) => {
      options.onTool?.('create_task');
      options.onDelta('Đã tạo');
      return 'Đã tạo';
    });
    const { queryClient } = renderWithProviders(<TaskAiPanel />);
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByRole('button', { name: 'Tạo task mới giao cho…' }));

    await waitFor(() => expect(aiApi.chatStream).toHaveBeenCalledOnce());
    expect(aiApi.chatStream).toHaveBeenCalledWith(
      expect.any(Array),
      undefined,
      expect.any(Object),
      expect.objectContaining({ projectId: 'project-1' }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['tasks', 'board', 'project-1'],
      });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'my'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'projects'] });
    });
  });
});
