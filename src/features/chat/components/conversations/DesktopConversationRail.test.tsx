import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopConversationRail } from './DesktopConversationRail';

vi.mock('./ConversationList', () => ({
  ConversationList: ({ showDock }: { showDock?: boolean }) => (
    <aside data-testid="conversation-list" data-show-dock={String(showDock)} />
  ),
}));

vi.mock('./ConversationDock', () => ({
  ConversationDock: ({ variant }: { variant?: string }) => (
    <nav data-testid="conversation-dock" data-variant={variant} />
  ),
}));

describe('DesktopConversationRail', () => {
  it('tách danh sách và dock thành hai card sibling', () => {
    render(<DesktopConversationRail />);

    const rail = screen.getByTestId('desktop-conversation-rail');
    const listCard = screen.getByTestId('conversation-list').parentElement;
    const dock = screen.getByTestId('conversation-dock');

    expect(rail).toHaveClass('gap-3');
    expect(screen.getByTestId('conversation-list')).toHaveAttribute('data-show-dock', 'false');
    expect(dock).toHaveAttribute('data-variant', 'card');
    expect(listCard?.parentElement).toBe(rail);
    expect(dock.parentElement).toBe(rail);
    expect(listCard).not.toContainElement(dock);
  });
});
