import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavSidebar } from './NavSidebar';

vi.mock('@/features/chat/hooks/useNavUnread', () => ({
  useNavUnread: () => ({ messageCount: 0, notifCount: 0, total: 0 }),
}));

describe('NavSidebar', () => {
  it('renders as a rounded floating card without a border seam', () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('rounded-2xl');
    expect(nav.className).not.toMatch(/\bborder-r\b/);
  });

  it('still renders all four nav items', () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kho của tôi' })).toBeInTheDocument();
  });
});
