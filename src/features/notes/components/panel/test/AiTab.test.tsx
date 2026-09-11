import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notionAiApi } from '@/services/notion-ai.api';
import { AiTab } from '@/features/notes/components/panel/AiTab';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

vi.mock('@/services/ai.api', () => ({
  aiApi: { chat: vi.fn().mockResolvedValue('Tiêu đề') },
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
vi.mock('@/services/notion-ai-history.api', () => ({
  notionAiHistoryApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
    detail: vi.fn(),
    appendTurn: vi.fn().mockResolvedValue({ ok: true }),
    rename: vi.fn(),
    remove: vi.fn(),
    uploadAttachment: vi.fn(),
  },
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

const chatStream = vi.mocked(notionAiApi.chatStream);

function renderAiTab(pageId = 'page-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AiTab pageId={pageId} workspaceId="workspace-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  chatStream.mockReset();
  notionMocks.listVersions.mockReset().mockResolvedValue([]);
  useNotesUiStore.getState().setAiComposerDraft(null);
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

  it('nên hiện "Đang đọc trang…" khi luồng phát công cụ read_page', async () => {
    let finishStream: ((value: string) => void) | undefined;
    chatStream.mockImplementation((_messages, _context, options) => {
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

  it('nên gửi pageId của trang đang mở khi người dùng đặt câu hỏi', async () => {
    chatStream.mockResolvedValue('Đã xong');
    const user = userEvent.setup();
    renderAiTab('page-42');

    await user.type(screen.getByRole('textbox'), 'Trang này nói gì?');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(chatStream).toHaveBeenCalled());
    expect(chatStream.mock.calls[0]?.[1]).toEqual({
      workspaceId: 'workspace-1',
      pageId: 'page-42',
    });
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

  it('nên ẩn nút kẹp giấy khi không truyền prop đính kèm', () => {
    renderAiTab();

    expect(screen.queryByRole('button', { name: 'Đính kèm file' })).not.toBeInTheDocument();
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
