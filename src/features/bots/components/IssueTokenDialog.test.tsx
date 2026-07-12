import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { IssueTokenDialog } from './IssueTokenDialog';
import { ApiError } from '@/lib/api/client';

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { issue: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import { botTokensApi } from '@/services/bot-tokens.api';

const mockIssue = vi.mocked(botTokensApi.issue);

function renderDialog(onIssued = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <IssueTokenDialog botId="bot-1" open onOpenChange={vi.fn()} onIssued={onIssued} />
    </QueryClientProvider>,
  );
  return { onIssued };
}

describe('IssueTokenDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện đủ 4 checkbox scope', () => {
    renderDialog();
    expect(screen.getByRole('checkbox', { name: /gửi tin nhắn/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /gửi media/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /quản lý webhook/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /quản lý command/i })).toBeInTheDocument();
  });

  it('tick 1 scope rồi submit → gọi botTokensApi.issue với đúng scope + gọi onIssued', async () => {
    const user = userEvent.setup();
    mockIssue.mockResolvedValue({
      id: 'token-9',
      token: 'bot-1:newtoken',
      prefix: 'newtoken',
      scopes: ['messages:send'],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const { onIssued } = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: /gửi tin nhắn/i }));
    await user.click(screen.getByRole('button', { name: /cấp token/i }));

    expect(mockIssue).toHaveBeenCalledWith('bot-1', { scopes: ['messages:send'] });
    await vi.waitFor(() => expect(onIssued).toHaveBeenCalledWith('bot-1:newtoken'));
  });

  it('lỗi khi submit → không gọi onIssued, hiện toast lỗi', async () => {
    const user = userEvent.setup();
    mockIssue.mockRejectedValue(
      new ApiError(500, 'TOKEN_ISSUE_FAILED', 'Cấp token thất bại. Thử lại sau.'),
    );
    const { onIssued } = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: /gửi tin nhắn/i }));
    await user.click(screen.getByRole('button', { name: /cấp token/i }));

    await vi.waitFor(() => expect(mockIssue).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Cấp token thất bại. Thử lại sau.');
    expect(onIssued).not.toHaveBeenCalled();
  });
});
