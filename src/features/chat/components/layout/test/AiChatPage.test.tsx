import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// AiChatHeader dùng useAiConfig (TanStack Query) → cần QueryClientProvider.
import { renderWithProviders as render } from '@/test/test-utils';
import { AiChatPage } from '../AiChatPage';
import { aiApi } from '@/services/ai.api';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';

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

vi.mock('@/services/ai.api', () => ({
  aiApi: {
    chat: vi.fn(),
    chatStream: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({ model: 'deepseek-v4-flash' }),
  },
}));

const DAY = 24 * 60 * 60 * 1000;
const RECENT_ID = 'session-recent';
const OLD_ID = 'session-old';

function seedSessions(): void {
  const sessions: AiSession[] = [
    {
      id: RECENT_ID,
      title: 'Kế hoạch tuần',
      messages: [{ role: 'user', content: 'Lên kế hoạch giúp tôi' }],
      updatedAt: Date.now(),
    },
    {
      id: OLD_ID,
      title: 'Ghi chú cũ',
      messages: [{ role: 'assistant', content: 'Đây là ghi chú cũ' }],
      updatedAt: Date.now() - 30 * DAY,
    },
  ];
  localStorage.setItem('ai-sessions', JSON.stringify(sessions));
}

// AiMessageList dùng @tanstack/react-virtual: jsdom không layout thật nên
// offsetHeight/offsetWidth luôn = 0 và virtualizer không render message nào.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
});

describe('AiChatPage', () => {
  beforeEach(() => {
    localStorage.clear();
    routerReplace.mockReset();
    routerPush.mockReset();
    routeParams = {};
    isMobile = false;
    vi.mocked(aiApi.chatStream).mockReset();
    seedSessions();
  });

  it('desktop hiển thị cả cột lịch sử lẫn khung hội thoại', () => {
    routeParams = { id: RECENT_ID };
    render(<AiChatPage />);

    expect(screen.getByLabelText('Lịch sử trò chuyện với AI')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...')).toBeInTheDocument();
  });

  it('gom nhóm lịch sử theo mốc thời gian', () => {
    render(<AiChatPage />);

    expect(screen.getByRole('heading', { name: 'Hôm nay' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cũ hơn' })).toBeInTheDocument();
  });

  it('desktop tự mở session gần nhất khi vào /ai trống', () => {
    render(<AiChatPage />);
    expect(routerReplace).toHaveBeenCalledWith(`/ai/${RECENT_ID}`, { scroll: false });
  });

  it('ô tìm kiếm lọc lịch sử theo tiêu đề', async () => {
    render(<AiChatPage />);

    await userEvent.type(screen.getByLabelText('Tìm trong lịch sử'), 'ghi chú');

    expect(screen.getByRole('button', { name: 'Ghi chú cũ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kế hoạch tuần' })).not.toBeInTheDocument();
  });

  it('mobile chưa chọn session thì chỉ hiện danh sách', () => {
    isMobile = true;
    render(<AiChatPage />);

    expect(screen.getByLabelText('Lịch sử trò chuyện với AI')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Hỏi Halo AI bất cứ điều gì...')).not.toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('mobile có nút rời khu vực AI về tin nhắn', async () => {
    isMobile = true;
    render(<AiChatPage />);

    await userEvent.click(screen.getByLabelText('Quay lại tin nhắn'));
    expect(routerPush).toHaveBeenCalledWith('/chat');
  });

  it('mobile đã chọn session thì chỉ hiện khung hội thoại', () => {
    isMobile = true;
    routeParams = { id: RECENT_ID };
    render(<AiChatPage />);

    expect(screen.queryByLabelText('Lịch sử trò chuyện với AI')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...')).toBeInTheDocument();
    expect(screen.getByLabelText('Quay lại')).toBeInTheDocument();
  });

  it('desktop thu gọn rồi mở lại cột lịch sử', async () => {
    routeParams = { id: RECENT_ID };
    render(<AiChatPage />);

    await userEvent.click(screen.getByLabelText('Thu gọn lịch sử'));
    expect(screen.queryByLabelText('Lịch sử trò chuyện với AI')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Hiện lịch sử'));
    expect(screen.getByLabelText('Lịch sử trò chuyện với AI')).toBeInTheDocument();
  });

  it('session trống hiện màn hình chào kèm gợi ý bấm được', () => {
    localStorage.setItem(
      'ai-sessions',
      JSON.stringify([{ id: RECENT_ID, title: 'Mới', messages: [], updatedAt: Date.now() }]),
    );
    routeParams = { id: RECENT_ID };
    render(<AiChatPage />);

    expect(screen.getByText('Halo AI có thể giúp gì cho bạn?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Soạn giúp tôi tin nhắn xin nghỉ phép lịch sự' }),
    ).toBeInTheDocument();
  });

  it('hiện tên model lấy từ backend ở header', async () => {
    routeParams = { id: RECENT_ID };
    render(<AiChatPage />);

    expect(await screen.findByText(/deepseek-v4-flash/i)).toBeInTheDocument();
  });

  it('tin gửi hỏng nêu lý do ngay dưới bong bóng và gửi lại được', async () => {
    routeParams = { id: RECENT_ID };
    const chat = vi.mocked(aiApi.chatStream);
    chat.mockRejectedValueOnce(new Error('Hết hạn mức truy vấn'));
    render(<AiChatPage />);

    await userEvent.type(
      screen.getByPlaceholderText('Hỏi Halo AI bất cứ điều gì...'),
      'Tóm tắt giúp tôi',
    );
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Cột lịch sử cũng hiện tin cuối làm preview → chỉ tìm trong khung hội thoại.
    const conversation = within(screen.getByRole('main'));

    expect(await conversation.findByText('Hết hạn mức truy vấn')).toBeInTheDocument();
    expect(conversation.getByText('Tóm tắt giúp tôi')).toBeInTheDocument();

    chat.mockResolvedValueOnce('Đây là tóm tắt');
    await userEvent.click(conversation.getByRole('button', { name: 'Gửi lại' }));

    expect(await conversation.findByText('Đây là tóm tắt')).toBeInTheDocument();
    expect(conversation.queryByText('Hết hạn mức truy vấn')).not.toBeInTheDocument();
  });
});
