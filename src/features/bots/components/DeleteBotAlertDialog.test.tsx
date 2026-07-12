import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteBotAlertDialog } from './DeleteBotAlertDialog';
import type { Bot } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { remove: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockRemove = vi.mocked(botsApi.remove);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderDialog(onDeleted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteBotAlertDialog bot={BOT} onDeleted={onDeleted} />
    </QueryClientProvider>,
  );
  return { onDeleted };
}

describe('DeleteBotAlertDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện cảnh báo thu hồi toàn bộ token trước khi xoá', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /xoá bot/i }));
    expect(screen.getByText(/thu hồi toàn bộ token/i)).toBeInTheDocument();
  });

  it('xác nhận xoá → gọi botsApi.remove + onDeleted', async () => {
    const user = userEvent.setup();
    mockRemove.mockResolvedValue(undefined);
    const { onDeleted } = renderDialog();

    await user.click(screen.getByRole('button', { name: /xoá bot/i }));
    await user.click(screen.getByRole('button', { name: /^xoá$/i }));

    expect(mockRemove).toHaveBeenCalledWith('bot-1');
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});
