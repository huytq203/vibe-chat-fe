import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/chat', () => ({
  ChatLayout: () => <div data-testid="chat-shell" />,
}));

vi.mock('@/features/auth', () => ({
  AuthBootstrap: () => <div data-testid="auth-bootstrap" />,
}));

import AiSectionLayout from './layout';
import AiPage from './page';
import AiSessionPage from './[id]/page';

/** Cùng lý do như `chat/chat-route-shell.test.tsx`: khung phải ở layout, không ở page. */
describe('ai route shell', () => {
  it('renders the shell from the segment layout', () => {
    render(<AiSectionLayout>{null}</AiSectionLayout>);

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('auth-bootstrap')).toBeInTheDocument();
  });

  it('does not render the shell from /ai page (would remount on every switch)', () => {
    render(<div>{AiPage()}</div>);

    expect(screen.queryByTestId('chat-shell')).not.toBeInTheDocument();
  });

  it('does not render the shell from /ai/[id] page (would remount on every switch)', () => {
    render(<div>{AiSessionPage()}</div>);

    expect(screen.queryByTestId('chat-shell')).not.toBeInTheDocument();
  });
});
