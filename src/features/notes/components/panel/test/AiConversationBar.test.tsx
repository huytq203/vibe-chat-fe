import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AiConversationBar } from '@/features/notes/components/panel/AiConversationBar';
import type { ConversationSummary } from '@/services/notion-ai-history.api';

const TODAY = new Date().toISOString();
const OLDER = new Date(Date.now() - 2 * 24 * 60 * 60 * 1_000).toISOString();

const conversations: ConversationSummary[] = [
  { id: 'today', title: 'Kế hoạch hôm nay', updatedAt: TODAY },
  { id: 'older', title: 'Ghi chú cũ', updatedAt: OLDER },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof AiConversationBar>> = {}) {
  const props: React.ComponentProps<typeof AiConversationBar> = {
    conversations,
    activeId: 'today',
    activeTitle: 'Kế hoạch hôm nay',
    isLoading: false,
    isError: false,
    onSelect: vi.fn(),
    onStartNew: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<AiConversationBar {...props} />);
  return props;
}

describe('thanh hội thoại AI của ghi chú', () => {
  it('nên hiện tiêu đề hội thoại đang mở khi đã có tiêu đề', () => {
    renderBar();

    expect(screen.getByRole('button', { name: /Kế hoạch hôm nay/ })).toBeInTheDocument();
  });

  it('nên mở danh sách nhóm theo Hôm nay và Cũ hơn khi bấm mũi tên', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole('button', { name: /Kế hoạch hôm nay/ }));

    expect(screen.getByRole('heading', { name: 'Hôm nay' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cũ hơn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghi chú cũ' })).toBeInTheDocument();
  });

  it('nên tạo hội thoại mới khi bấm nút tin nhắn mới', async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.click(screen.getByRole('button', { name: 'Tạo hội thoại mới' }));

    expect(props.onStartNew).toHaveBeenCalledOnce();
  });

  it('nên cho thử lại khi tải danh sách hội thoại thất bại', async () => {
    const user = userEvent.setup();
    const props = renderBar({ isError: true });

    await user.click(screen.getByRole('button', { name: /Kế hoạch hôm nay/ }));
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('nên báo ngắn gọn khi chưa có hội thoại nào', async () => {
    const user = userEvent.setup();
    renderBar({ conversations: [], activeId: null, activeTitle: null });

    await user.click(screen.getByRole('button', { name: /Cuộc trò chuyện mới/ }));

    expect(screen.getByText('Chưa có cuộc trò chuyện nào')).toBeInTheDocument();
  });
});
