import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatPage } from '../AiChatPage';
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

vi.mock('@/lib/gemini', () => ({
  callGemini: vi.fn(),
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
});
