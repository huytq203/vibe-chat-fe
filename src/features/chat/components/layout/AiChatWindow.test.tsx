import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatWindow } from './AiChatWindow';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useParams: () => ({}),
}));

const callGemini = vi.fn();
vi.mock('@/lib/gemini', () => ({
  callGemini: (...args: unknown[]) => callGemini(...args),
}));

// AiMessageList dùng @tanstack/react-virtual (không sửa được — reuse unchanged).
// jsdom không layout thật nên offsetHeight/offsetWidth luôn = 0, khiến virtualizer
// tính "visible range" rỗng và không render message nào. Stub 2 thuộc tính này
// (chỉ trong file test) để virtualizer đo được kích thước container như môi trường thật.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 360,
  });
});

describe('AiChatWindow', () => {
  beforeEach(() => {
    localStorage.clear();
    useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } });
    callGemini.mockReset();
  });

  it('renders nothing when the store is closed', () => {
    render(<AiChatWindow />);
    expect(screen.queryByText('Halo AI')).not.toBeInTheDocument();
  });

  it('renders the popup when the store is open', () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    expect(screen.getByText('Halo AI')).toBeInTheDocument();
  });

  it('close button closes the store without a "back" navigation', async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText('Đóng cửa sổ AI'));
    expect(useAiWindowStore.getState().isOpen).toBe(false);
  });

  it('history toggle shows the empty history state', async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText('Lịch sử hội thoại'));
    expect(screen.getByText('Chưa có cuộc trò chuyện nào')).toBeInTheDocument();
  });

  it('sends a message and renders the Gemini reply', async () => {
    callGemini.mockResolvedValue('Xin chào');
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    const textarea = screen.getByPlaceholderText('Nhắn tin với AI...');
    await userEvent.type(textarea, 'Chào bạn');
    await userEvent.click(screen.getByLabelText('Gửi'));

    await waitFor(() => expect(screen.getByText('Xin chào')).toBeInTheDocument());
    expect(callGemini).toHaveBeenCalledOnce();
  });
});
