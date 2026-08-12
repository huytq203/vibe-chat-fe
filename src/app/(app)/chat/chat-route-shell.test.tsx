import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/chat', () => ({
  ChatLayout: () => <div data-testid="chat-shell" />,
}));

vi.mock('@/features/auth', () => ({
  AuthBootstrap: () => <div data-testid="auth-bootstrap" />,
}));

import ChatSectionLayout from './layout';
import ChatPage from './page';
import ChatConversationPage from './[id]/page';

/**
 * Khung chat (ChatLayout) phải sống ở LAYOUT của segment `chat`, không phải ở page.
 *
 * Lý do: App Router key mỗi segment theo giá trị param (`createRouterCacheKey`), nên
 * `/chat/A` → `/chat/B` sẽ unmount + mount lại toàn bộ cây của segment `[id]`. Nếu
 * ChatLayout nằm trong page, mỗi lần đổi hội thoại sẽ remount cả khung (sidebar, danh
 * sách hội thoại, socket…) → màn hình nháy như tải lại. Đặt ở layout — nằm TRÊN segment
 * `[id]` — thì key giữ nguyên là `chat`, khung không remount.
 */
describe('chat route shell', () => {
  it('renders the chat shell from the segment layout', () => {
    render(<ChatSectionLayout>{null}</ChatSectionLayout>);

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('auth-bootstrap')).toBeInTheDocument();
  });

  it('does not render the shell from /chat page (would remount on every switch)', () => {
    render(<div>{ChatPage()}</div>);

    expect(screen.queryByTestId('chat-shell')).not.toBeInTheDocument();
  });

  it('does not render the shell from /chat/[id] page (would remount on every switch)', () => {
    render(<div>{ChatConversationPage()}</div>);

    expect(screen.queryByTestId('chat-shell')).not.toBeInTheDocument();
  });
});
