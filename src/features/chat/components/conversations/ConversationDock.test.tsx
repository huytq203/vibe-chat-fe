import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDock } from './ConversationDock';

vi.mock('@/features/chat/hooks/useSelectedConversation', () => ({
  useSelectedConversation: () => ({ setSelected: vi.fn() }),
}));
vi.mock('@/lib/hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('@/features/friends', () => ({
  useIncomingFriendRequests: () => ({ data: { items: [] } }),
  FindFriendsPanel: () => null,
}));
vi.mock('@/features/notifications', () => ({
  useSystemNotifCount: () => ({ data: { unreadCount: 0 } }),
  NotificationPanel: () => null,
}));
vi.mock('@/features/chat/components/common/UserMenu', () => ({
  UserMenu: ({ variant }: { variant?: string }) => (
    <button type="button" aria-label="Tài khoản" data-variant={variant} />
  ),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('ConversationDock', () => {
  it('render Framework7 bottom toolbar với active state rõ và trigger tài khoản đồng bộ', () => {
    render(<ConversationDock />, { wrapper: Wrapper });

    const nav = screen.getByRole('navigation', { name: 'Điều hướng trò chuyện' });
    expect(nav.parentElement).toHaveClass(
      'toolbar',
      'toolbar-bottom',
      'halo-conversation-toolbar',
    );
    expect(nav).not.toHaveClass('rounded-2xl');
    expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Tài khoản' })).toHaveAttribute(
      'data-variant',
      'dock',
    );
  });

  it('render thành card độc lập trên desktop', () => {
    render(<ConversationDock variant="card" />, { wrapper: Wrapper });

    const nav = screen.getByRole('navigation', { name: 'Điều hướng trò chuyện' });
    expect(nav.parentElement).toHaveClass(
      'rounded-2xl',
      'border',
      'bg-sidebar/75',
      'shadow-subtle',
    );
    expect(nav.parentElement).not.toHaveClass('toolbar', 'toolbar-bottom');
    expect(nav).toHaveClass('rounded-xl');
  });

  it('chỉ giữ các tab hội thoại, không lặp lại menu khu vực của radial hub', () => {
    render(<ConversationDock />, { wrapper: Wrapper });

    expect(screen.queryByRole('button', { name: 'Thêm' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AI Chat' })).not.toBeInTheDocument();
  });
});
