import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConversationsApi } from '@/services/ai-conversations.api';
import { aiApi } from '@/services/ai.api';
import { notionAiApi } from '@/services/notion-ai.api';
import { AiTab } from '@/features/notes/components/panel/AiTab';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,NOTION_IMAGE`;
    setTimeout(() => this.onload?.(), 0);
  }
}

const aiConversationMocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/services/ai.api', () => ({
  aiApi: { chatStream: vi.fn() },
}));
vi.mock('@/services/ai-conversations.api', () => ({
  aiConversationsApi: aiConversationMocks,
}));

const notionMocks = vi.hoisted(() => ({
  detailPage: vi.fn().mockResolvedValue({ title: 'Kế hoạch quý' }),
  detailVersion: vi.fn(),
  listVersions: vi.fn().mockResolvedValue([]),
  restoreVersion: vi.fn(),
}));
const exportMocks = vi.hoisted(() => ({ markdown: vi.fn() }));

vi.mock('@/services/notion-ai.api', () => ({
  notionAiApi: { chatStream: vi.fn() },
}));
vi.mock('@/services/notion.api', () => ({
  pagesApi: { detail: notionMocks.detailPage },
  versionsApi: {
    detail: notionMocks.detailVersion,
    list: notionMocks.listVersions,
    restore: notionMocks.restoreVersion,
  },
}));
vi.mock('@/services/notion-export.api', () => ({
  exportApi: { markdown: exportMocks.markdown },
}));
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 72,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      start: index * 72,
    })),
    measureElement: undefined,
    scrollToIndex: vi.fn(),
  }),
}));

const chatStream = vi.mocked(aiApi.chatStream);
const notionChatStream = vi.mocked(notionAiApi.chatStream);

function renderAiTab(pageId = 'page-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AiTab pageId={pageId} workspaceId="workspace-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  chatStream.mockReset();
  notionChatStream.mockReset();
  aiConversationMocks.list.mockReset().mockResolvedValue([]);
  aiConversationMocks.detail.mockReset();
  aiConversationMocks.remove.mockReset().mockResolvedValue(undefined);
  notionMocks.listVersions.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  useNotesUiStore.getState().setAiComposerDraft(null);
  useNotesUiStore.getState().setAiConversation('workspace-1', null);
  vi.unstubAllGlobals();
});

describe('tab AI của ghi chú', () => {
  it('nên xoá aiComposerDraft khỏi store sau khi AiTab đã đổ vào input', async () => {
    useNotesUiStore.getState().setAiComposerDraft('> Nội dung khối\n\n');
    expect(localStorage.getItem('halo-notes-ui')).not.toContain('aiComposerDraft');
    renderAiTab();

    expect(await screen.findByRole('textbox')).toHaveValue('> Nội dung khối\n\n');
    await waitFor(() => expect(useNotesUiStore.getState().aiComposerDraft).toBeNull());
  });

  it('nên hiện gợi ý mở đầu khi chưa có tin nhắn nào', () => {
    renderAiTab();

    expect(screen.getByRole('button', { name: 'Tóm tắt trang này' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuẩn hoá định dạng' })).toBeInTheDocument();
  });

  it('nên hiện tên page đang mở phía trên ô nhập', async () => {
    renderAiTab();

    const pageName = await screen.findByText('Kế hoạch quý');
    expect(pageName).toBeInTheDocument();
    expect(pageName.closest('.rounded-2xl')).toBeNull();
  });

  it('nên hiện "Đang đọc trang…" khi luồng phát công cụ read_page', async () => {
    let finishStream: ((value: string) => void) | undefined;
    chatStream.mockImplementation((_messages, _attachments, options) => {
      options.onTool?.('read_page');
      return new Promise((resolve) => { finishStream = resolve; });
    });
    const user = userEvent.setup();
    renderAiTab();

    await user.type(screen.getByRole('textbox'), 'Đọc nội dung');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(await screen.findByText('Đang đọc trang…')).toBeInTheDocument();
    await act(async () => finishStream?.('Đã đọc'));
  });

  it('nên lấy mọi hội thoại và chỉ lọc NOTES khi bật tuỳ chọn', async () => {
    aiConversationMocks.list.mockResolvedValue([
      {
        id: 'conversation-notes', title: 'Ghi chú đang mở', origin: 'NOTES',
        context: { workspaceId: 'workspace-1', pageId: 'page-1' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conversation-chat', title: 'Trao đổi chung', origin: 'CHAT',
        context: {},
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conversation-tasks', title: 'Tiến độ công việc', origin: 'TASKS',
        context: { projectId: 'project-1' },
        updatedAt: new Date().toISOString(),
      },
    ]);
    const user = userEvent.setup();
    renderAiTab();

    await waitFor(() => expect(aiConversationsApi.list).toHaveBeenCalledWith({ origin: undefined }));
    await user.click(screen.getByRole('button', { name: /Cuộc trò chuyện mới/ }));

    expect(screen.getByText('📝 NOTES Ghi chú đang mở')).toBeInTheDocument();
    expect(screen.getByText('💬 CHAT Trao đổi chung')).toBeInTheDocument();
    expect(screen.getByText('📋 TASKS Tiến độ công việc')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Chỉ app này' }));

    expect(screen.getByText('📝 NOTES Ghi chú đang mở')).toBeInTheDocument();
    expect(screen.queryByText('💬 CHAT Trao đổi chung')).not.toBeInTheDocument();
    expect(screen.queryByText('📋 TASKS Tiến độ công việc')).not.toBeInTheDocument();
  });

  it('nên gửi conversationId và context đầy đủ qua ai-service', async () => {
    aiConversationMocks.list.mockResolvedValue([{
      id: 'conversation-page-42', title: 'Trao đổi trang', origin: 'NOTES',
      context: { workspaceId: 'workspace-1', pageId: 'page-42' },
      updatedAt: new Date().toISOString(),
    }]);
    aiConversationMocks.detail.mockResolvedValue({
      id: 'conversation-page-42', title: 'Trao đổi trang', origin: 'NOTES',
      context: { workspaceId: 'workspace-1', pageId: 'page-42' }, messages: [],
    });
    chatStream.mockImplementation(async (_messages, _attachments, options) => {
      options.onDelta('Đã xong');
      options.onDone?.({ conversationId: 'conversation-page-42' });
      return 'Đã xong';
    });
    const user = userEvent.setup();
    renderAiTab('page-42');

    await waitFor(() => expect(aiConversationsApi.list).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Cuộc trò chuyện mới/ }));
    await user.click(screen.getByRole('button', { name: '📝 NOTES Trao đổi trang' }));
    await waitFor(() => expect(aiConversationsApi.detail).toHaveBeenCalledWith('conversation-page-42'));

    await user.type(screen.getByRole('textbox'), 'Trang này nói gì?');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(chatStream).toHaveBeenCalled());
    expect(chatStream.mock.calls[0]?.[3]).toEqual(expect.objectContaining({
      workspaceId: 'workspace-1', pageId: 'page-42',
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      timezone: expect.any(String),
    }));
    expect(chatStream.mock.calls[0]?.[4]).toBe('conversation-page-42');
    expect(notionChatStream).not.toHaveBeenCalled();
  });

  it('nên tạo hội thoại mới và xoá hội thoại qua ai-service', async () => {
    aiConversationMocks.list.mockResolvedValue([{
      id: 'conversation-old', title: 'Hội thoại cần xoá', origin: 'NOTES',
      context: { workspaceId: 'workspace-1', pageId: 'page-1' },
      updatedAt: new Date().toISOString(),
    }]);
    aiConversationMocks.detail.mockResolvedValue({
      id: 'conversation-new', title: 'Bắt đầu mới', origin: 'NOTES',
      context: { workspaceId: 'workspace-1', pageId: 'page-1' }, messages: [],
    });
    chatStream.mockImplementation(async (_messages, _attachments, options) => {
      options.onDelta('Đã tạo');
      options.onDone?.({ conversationId: 'conversation-new' });
      return 'Đã tạo';
    });
    const user = userEvent.setup();
    renderAiTab();

    await waitFor(() => expect(aiConversationsApi.list).toHaveBeenCalled());
    await user.type(screen.getByRole('textbox'), 'Bắt đầu mới');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(chatStream).toHaveBeenCalled());
    expect(chatStream.mock.calls[0]?.[4]).toBeUndefined();

    await user.click(screen.getByRole('button', { name: /Bắt đầu mới|Cuộc trò chuyện mới/ }));
    await user.click(screen.getByRole('button', {
      name: 'Xoá cuộc trò chuyện Hội thoại cần xoá',
    }));
    await waitFor(() => expect(aiConversationsApi.remove).toHaveBeenCalledWith('conversation-old'));
    expect(notionChatStream).not.toHaveBeenCalled();
  });

  it('nên hiện thông báo lỗi khi lượt trả lời thất bại', async () => {
    chatStream.mockRejectedValue(new Error('Không đọc được trang'));
    const user = userEvent.setup();
    renderAiTab();

    await user.type(screen.getByRole('textbox'), 'Hãy tóm tắt');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không đọc được trang');
    expect(screen.getByRole('button', { name: 'Gửi lại' })).toBeInTheDocument();
  });

  it('nên hiện nút kẹp giấy để đính kèm nội dung', () => {
    renderAiTab();

    expect(screen.getByRole('button', { name: 'Đính kèm file' })).toBeInTheDocument();
  });

  it('nên tự mở rộng và giữ Shift + Enter để xuống dòng', async () => {
    chatStream.mockResolvedValue('Đã xong');
    renderAiTab();
    const textarea = screen.getByRole('textbox');
    await waitFor(() => expect(textarea).toBeEnabled());
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 96 });

    fireEvent.change(textarea, { target: { value: 'Dòng một\nDòng hai' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(textarea).toHaveStyle({ height: '96px' });
    expect(textarea).toHaveValue('Dòng một\nDòng hai');
    expect(chatStream).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(chatStream).toHaveBeenCalledOnce());
  });

  it('nên preview và gửi ảnh được paste vào Notion AI', async () => {
    const NativeURL = URL;
    vi.stubGlobal('FileReader', MockFileReader);
    vi.stubGlobal('URL', class extends NativeURL {
      static createObjectURL = vi.fn(() => 'blob:notion-image');
      static revokeObjectURL = vi.fn();
    });
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'notion-image-id') });
    chatStream.mockResolvedValue('Đã xem ảnh');
    renderAiTab();
    const image = new File(['image'], 'ghi-chu.png', { type: 'image/png' });

    fireEvent.paste(screen.getByRole('textbox'), {
      clipboardData: {
        items: [{
          kind: 'file',
          type: 'image/png',
          getAsFile: () => image,
        }],
        files: [image],
      },
    });

    expect(await screen.findByAltText('ghi-chu.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(chatStream).toHaveBeenCalledOnce());
    expect(chatStream.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({
        name: 'ghi-chu.png',
        mimeType: 'image/png',
        data: 'NOTION_IMAGE',
      }),
    ]);
  });

  it('nên giữ danh sách tin nhắn trong vùng cuộn có chiều cao xác định khi nội dung dài', async () => {
    const longResponse = 'Nội dung trả lời dài '.repeat(100);
    chatStream.mockResolvedValue(longResponse);
    const user = userEvent.setup();
    renderAiTab();

    await user.type(screen.getByRole('textbox'), 'Hãy trả lời thật chi tiết');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(await screen.findByText(/^Nội dung trả lời dài/)).toBeInTheDocument();
    const aiTab = screen.getByRole('region', { name: 'Trợ lý AI' });
    expect(aiTab).toHaveClass('h-full', 'min-w-0');
    expect(aiTab).not.toHaveClass('flex-1');
  });

  it('nên hiện thẻ thay đổi khi lượt AI tạo version BEFORE_AI mới', async () => {
    const version = {
      id: 'version-ai', pageId: 'page-1', kind: 'BEFORE_AI' as const,
      label: null, sizeBytes: 42, preview: '', createdBy: 'ai',
      createdAt: new Date(Date.now() + 60_000).toISOString(),
    };
    notionMocks.listVersions.mockResolvedValueOnce([]).mockResolvedValueOnce([version]);
    chatStream.mockResolvedValue('Đã cập nhật trang');
    const user = userEvent.setup();
    renderAiTab();

    await user.type(screen.getByRole('textbox'), 'Sửa nội dung');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(await screen.findByText('Đã sửa trang Kế hoạch quý')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem thay đổi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeInTheDocument();
  });
});
