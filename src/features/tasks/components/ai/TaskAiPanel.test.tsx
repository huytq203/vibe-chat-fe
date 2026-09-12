import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { aiApi } from '@/services/ai.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { TaskAiPanel } from './TaskAiPanel';

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

describe('TaskAiPanel', () => {
  beforeEach(() => {
    vi.mocked(aiApi.chatStream).mockReset().mockResolvedValue('Đã xong');
    useTasksUIStore.setState({ selectedProjectId: 'project-1', isAiPanelOpen: true });
  });

  it('hiển thị đủ ba gợi ý khi chưa có hội thoại', () => {
    renderWithProviders(<TaskAiPanel />);

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
