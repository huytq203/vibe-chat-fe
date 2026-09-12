import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { aiApi } from '@/services/ai.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { TaskAiPanel } from './TaskAiPanel';

class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,PASTED_IMAGE`;
    setTimeout(() => this.onload?.(), 0);
  }
}

const sessionActions = {
  createSession: vi.fn(() => 'task-ai'),
  pushMessage: vi.fn(),
  dropLastAssistant: vi.fn(() => []),
  markLastUserFailed: vi.fn(),
  prepareResend: vi.fn(() => []),
  removeMessage: vi.fn(() => null),
};
const projectsMock = vi.hoisted(() => ({ name: 'Dự án Beam' }));

const remember = vi.fn();
let activeConversationId: string | null = null;

vi.mock('@/features/ai/hooks/useAiConversations', () => ({
  useAiConversations: () => ({
    conversations: [],
    activeId: activeConversationId,
    session: {
      id: activeConversationId ?? 'task-ai:project-1',
      title: 'Cuộc trò chuyện mới',
      messages: [],
      updatedAt: 0,
    },
    actions: sessionActions,
    isLoading: false,
    isError: false,
    select: vi.fn(),
    startNew: vi.fn(),
    remember,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/tasks/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [{ id: 'project-1', name: projectsMock.name }],
  }),
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
    activeConversationId = null;
    projectsMock.name = 'Dự án Beam';
    remember.mockReset();
    vi.mocked(aiApi.chatStream).mockReset().mockResolvedValue('Đã xong');
    useTasksUIStore.setState({
      activeView: 'board',
      selectedProjectId: 'project-1',
      selectedTaskId: null,
      subtaskPath: [],
      isAiPanelOpen: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('hiển thị tên project đang đứng bên ngoài composer và ẩn khi về home', async () => {
    renderWithProviders(<TaskAiPanel />);

    const projectName = screen.getByText('Dự án Beam');
    expect(projectName).toBeInTheDocument();
    expect(projectName.closest('.rounded-2xl')).toBeNull();

    act(() => useTasksUIStore.setState({ activeView: 'home' }));
    await waitFor(() => {
      expect(screen.queryByText('Dự án Beam')).not.toBeInTheDocument();
    });
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
      undefined,
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['tasks', 'board', 'project-1'],
      });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'my'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks', 'projects'] });
    });
  });

  it('tự mở rộng nội dung và giữ Shift + Enter để xuống dòng', async () => {
    renderWithProviders(<TaskAiPanel />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 88 });

    fireEvent.change(textarea, { target: { value: 'Dòng một\nDòng hai' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(textarea).toHaveStyle({ height: '88px' });
    expect(textarea).toHaveValue('Dòng một\nDòng hai');
    expect(aiApi.chatStream).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(aiApi.chatStream).toHaveBeenCalledOnce());
  });

  it('nhận ảnh được paste, hiển thị preview và gửi attachment vào AI', async () => {
    const NativeURL = URL;
    vi.stubGlobal('FileReader', MockFileReader);
    vi.stubGlobal('URL', class extends NativeURL {
      static createObjectURL = vi.fn(() => 'blob:pasted-image');
      static revokeObjectURL = vi.fn();
    });
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'pasted-image-id') });
    renderWithProviders(<TaskAiPanel />);
    const textarea = screen.getByRole('textbox');
    const image = new File(['image'], 'task-board.png', { type: 'image/png' });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [{
          kind: 'file',
          type: 'image/png',
          getAsFile: () => image,
        }],
        files: [image],
      },
    });

    expect(await screen.findByAltText('task-board.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(aiApi.chatStream).toHaveBeenCalledOnce());
    expect(aiApi.chatStream).toHaveBeenCalledWith(
      expect.any(Array),
      [expect.objectContaining({
        name: 'task-board.png',
        mimeType: 'image/png',
        data: 'PASTED_IMAGE',
      })],
      expect.any(Object),
      expect.objectContaining({ projectId: 'project-1' }),
      undefined,
    );
  });

  it('gửi conversationId khi đang tiếp tục hội thoại cũ', async () => {
    activeConversationId = 'conversation-old';
    renderWithProviders(<TaskAiPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Tiến độ project này' }));

    await waitFor(() => expect(aiApi.chatStream).toHaveBeenCalledOnce());
    expect(aiApi.chatStream).toHaveBeenCalledWith(
      expect.any(Array), undefined, expect.any(Object),
      expect.objectContaining({ projectId: 'project-1' }),
      'conversation-old',
    );
  });

  it('ghi nhớ conversationId mới khi stream hoàn tất', async () => {
    vi.mocked(aiApi.chatStream).mockImplementation(async (
      _messages, _attachments, options,
    ) => {
      options.onDone?.({ conversationId: 'conversation-new' });
      options.onDelta('Đã xong');
      return 'Đã xong';
    });
    renderWithProviders(<TaskAiPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Việc của tôi đang mở' }));

    await waitFor(() => expect(remember).toHaveBeenCalledWith('conversation-new'));
  });
});
