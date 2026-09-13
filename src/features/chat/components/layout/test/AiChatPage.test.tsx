import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render } from '@/test/test-utils';
import { AiChatPage } from '../AiChatPage';
import { AiChatWindow } from '../AiChatWindow';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';
import { aiConversationsApi } from '@/services/ai-conversations.api';
import { aiApi } from '@/services/ai.api';

const routerReplace = vi.fn();
const routerPush = vi.fn();
let routeParams: { id?: string } = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useParams: () => routeParams,
  usePathname: () => '/ai',
}));

let isMobile = false;
vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

vi.mock('@/services/ai-conversations.api', () => ({
  aiConversationsApi: {
    list: vi.fn(),
    detail: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/services/ai.api', () => ({
  aiApi: {
    chat: vi.fn(),
    chatStream: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({ model: 'deepseek-v4-flash' }),
  },
}));

const RECENT_ID = 'conversation-recent';
const OLD_ID = 'conversation-old';
const NEW_ID = 'conversation-new';
const recentConversation = {
  id: RECENT_ID,
  title: 'Kế hoạch tuần',
  origin: 'CHAT' as const,
  context: null,
  updatedAt: new Date().toISOString(),
};
const oldConversation = {
  id: OLD_ID,
  title: 'Ghi chú cũ',
  origin: 'CHAT' as const,
  context: null,
  updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

function detailOf(id: string, content = 'Nội dung hội thoại đã lưu') {
  return {
    id,
    title: id === OLD_ID ? oldConversation.title : recentConversation.title,
    origin: 'CHAT' as const,
    context: null,
    messages: [{
      id: `message-${id}`,
      role: 'assistant' as const,
      content,
      status: null,
      toolNames: null,
      attachments: null,
      createdAt: new Date().toISOString(),
    }],
  };
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
});

describe('trang Halo AI dùng hội thoại hợp nhất', () => {
  beforeEach(() => {
    routeParams = {};
    isMobile = false;
    routerReplace.mockReset();
    routerPush.mockReset();
    useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } });
    vi.mocked(aiConversationsApi.list).mockReset();
    vi.mocked(aiConversationsApi.detail).mockReset();
    vi.mocked(aiConversationsApi.remove).mockReset();
    vi.mocked(aiApi.chatStream).mockReset();
    vi.mocked(aiConversationsApi.list).mockResolvedValue([recentConversation, oldConversation]);
    vi.mocked(aiConversationsApi.detail).mockImplementation(async (id) => detailOf(id));
    vi.mocked(aiConversationsApi.remove).mockResolvedValue();
  });

  it('nên hiển thị danh sách hội thoại CHAT lấy từ API', async () => {
    render(<AiChatPage />);

    expect(await screen.findByRole('button', { name: recentConversation.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: oldConversation.title })).toBeInTheDocument();
    expect(aiConversationsApi.list).toHaveBeenCalledWith({ origin: 'CHAT' });
  });

  it('nên tải chi tiết khi chọn một hội thoại', async () => {
    isMobile = true;
    render(<AiChatPage />);

    await userEvent.click(await screen.findByRole('button', { name: oldConversation.title }));

    expect(aiConversationsApi.detail).toHaveBeenCalledWith(OLD_ID);
    expect(await screen.findByText('Nội dung hội thoại đã lưu')).toBeInTheDocument();
    expect(routerReplace).toHaveBeenCalledWith(`/ai/${OLD_ID}`, { scroll: false });
  });

  it('nên gửi lượt mới kèm conversationId đang mở', async () => {
    routeParams = { id: RECENT_ID };
    vi.mocked(aiApi.chatStream).mockImplementation(async (_messages, _attachments, options) => {
      options.onDelta('Đây là câu trả lời mới');
      return 'Đây là câu trả lời mới';
    });
    render(<AiChatPage />);

    const textarea = await screen.findByPlaceholderText('Hỏi Halo AI bất cứ điều gì...');
    await userEvent.type(textarea, 'Tóm tắt giúp tôi');
    await userEvent.click(screen.getByLabelText('Gửi'));

    expect(await screen.findByText('Đây là câu trả lời mới')).toBeInTheDocument();
    expect(aiApi.chatStream).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ content: 'Tóm tắt giúp tôi' })]),
      undefined,
      expect.objectContaining({ onDelta: expect.any(Function) }),
      // BE bắt buộc today/timezone — gửi {} sẽ bị 400
      expect.objectContaining({ today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), timezone: expect.any(String) }),
      RECENT_ID,
    );
  });

  it('nên tạo hội thoại mới và làm mới danh sách sau lượt gửi đầu tiên', async () => {
    routeParams = { id: RECENT_ID };
    vi.mocked(aiConversationsApi.list)
      .mockResolvedValueOnce([recentConversation, oldConversation])
      .mockResolvedValue([{
        ...recentConversation,
        id: NEW_ID,
        title: 'Ý tưởng mới',
      }, recentConversation, oldConversation]);
    vi.mocked(aiApi.chatStream).mockImplementation(async (_messages, _attachments, options) => {
      options.onDelta('Đã ghi nhận');
      options.onDone?.({ conversationId: NEW_ID });
      return 'Đã ghi nhận';
    });
    render(<AiChatPage />);

    const main = within(screen.getByRole('main'));
    await userEvent.click(main.getByRole('button', { name: 'Trò chuyện mới' }));
    await userEvent.type(main.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...'), 'Ý tưởng mới');
    await userEvent.click(main.getByLabelText('Gửi'));

    expect(await screen.findByRole('button', { name: 'Ý tưởng mới' })).toBeInTheDocument();
    expect(routerReplace).toHaveBeenCalledWith('/ai', { scroll: false });
  });

  it('nên xoá hội thoại qua API rồi làm mới danh sách', async () => {
    vi.mocked(aiConversationsApi.list)
      .mockResolvedValueOnce([recentConversation, oldConversation])
      .mockResolvedValue([oldConversation]);
    render(<AiChatPage />);

    await waitFor(() => expect(aiConversationsApi.detail).toHaveBeenCalledWith(RECENT_ID));
    await userEvent.click(screen.getByLabelText('Xoá cuộc trò chuyện này'));

    await waitFor(() => expect(aiConversationsApi.remove).toHaveBeenCalledWith(RECENT_ID));
    await waitFor(() => expect(screen.queryByRole('button', { name: recentConversation.title })).not.toBeInTheDocument());
  });

  it('nên không chọn lại (tải detail) khi URL đổi sang id vừa được BE cấp sau lượt đầu', async () => {
    routeParams = { id: RECENT_ID };
    vi.mocked(aiApi.chatStream).mockImplementation(async (_messages, _attachments, options) => {
      options.onDelta('Đã ghi nhận');
      options.onDone?.({ conversationId: NEW_ID });
      return 'Đã ghi nhận';
    });
    render(<AiChatPage />);
    const main = within(screen.getByRole('main'));
    await userEvent.click(main.getByRole('button', { name: 'Trò chuyện mới' }));
    await userEvent.type(main.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...'), 'Ý tưởng mới');
    await userEvent.click(main.getByLabelText('Gửi'));
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith(`/ai/${NEW_ID}`, { scroll: false }));

    // Câu trả lời vẫn hiển thị liên tục; không có lượt select → không gọi detail cho NEW_ID
    expect(await main.findByText('Đã ghi nhận')).toBeInTheDocument();
    expect(aiConversationsApi.detail).not.toHaveBeenCalledWith(NEW_ID);
  });

  it('nên giữ trạng thái hội thoại mới sau khi bấm "+" — không tự chọn lại hội thoại gần nhất', async () => {
    render(<AiChatPage />);
    await waitFor(() => expect(aiConversationsApi.detail).toHaveBeenCalledWith(RECENT_ID));

    const main = within(screen.getByRole('main'));
    await userEvent.click(main.getByRole('button', { name: 'Trò chuyện mới' }));

    // Hội thoại gần nhất không còn được đánh dấu đang mở, và không tải lại chi tiết của nó.
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/ai', { scroll: false }));
    expect(aiConversationsApi.detail).toHaveBeenCalledTimes(1);
    expect(main.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...')).toBeInTheDocument();
  });

  it('nên khoá nút xoá và chỉ gọi API một lần khi bấm đúp lúc đang xoá', async () => {
    let finishRemove: (() => void) | undefined;
    vi.mocked(aiConversationsApi.remove).mockImplementation(
      () => new Promise<void>((resolve) => { finishRemove = resolve; }),
    );
    render(<AiChatPage />);
    await waitFor(() => expect(aiConversationsApi.detail).toHaveBeenCalledWith(RECENT_ID));

    const deleteButton = screen.getByLabelText('Xoá cuộc trò chuyện này');
    await userEvent.click(deleteButton);
    await userEvent.click(deleteButton);

    expect(aiConversationsApi.remove).toHaveBeenCalledTimes(1);
    finishRemove?.();
    await waitFor(() => expect(screen.queryByRole('button', { name: recentConversation.title })).not.toBeInTheDocument());
  });

  it('nên dùng chung query cache cho trang và popup', async () => {
    useAiWindowStore.getState().open();
    render(<><AiChatPage /><AiChatWindow /></>);

    await screen.findByRole('button', { name: recentConversation.title });
    await userEvent.click(screen.getByLabelText('Lịch sử hội thoại'));

    // Sidebar trang, tiêu đề trang và danh sách popup cùng phản ánh hội thoại đang có.
    expect(screen.getAllByText(recentConversation.title)).toHaveLength(3);
    expect(aiConversationsApi.list).toHaveBeenCalledTimes(1);
  });

  it('nên không đọc hoặc ghi kho localStorage cũ', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    render(<AiChatPage />);
    await screen.findByRole('button', { name: recentConversation.title });

    expect(getItem).not.toHaveBeenCalledWith('ai-sessions');
    expect(setItem).not.toHaveBeenCalledWith('ai-sessions', expect.any(String));
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('nên hiển thị thumbnail từ downloadUrl trong lịch sử', async () => {
    isMobile = true;
    vi.mocked(aiConversationsApi.detail).mockResolvedValue({
      ...detailOf(RECENT_ID),
      messages: [{
        id: 'message-image',
        role: 'user',
        content: 'Ảnh tham khảo',
        status: null,
        toolNames: null,
        attachments: [{
          name: 'minh-hoa.png',
          mimeType: 'image/png',
          size: 2048,
          downloadUrl: 'https://storage.test/minh-hoa.png',
        }],
        createdAt: new Date().toISOString(),
      }],
    });
    render(<AiChatPage />);

    await userEvent.click(await screen.findByRole('button', { name: recentConversation.title }));

    expect(await screen.findByRole('img', { name: 'minh-hoa.png' })).toHaveAttribute(
      'src',
      'https://storage.test/minh-hoa.png',
    );
  });
});
