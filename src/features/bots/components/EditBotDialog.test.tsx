import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditBotDialog } from './EditBotDialog';
import type { Bot } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { update: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockUpdate = vi.mocked(botsApi.update);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  description: 'Cũ',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <EditBotDialog bot={BOT} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('EditBotDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefill đúng displayName/description hiện tại', () => {
    renderDialog();
    expect(screen.getByLabelText(/tên hiển thị/i)).toHaveValue('Weather Bot');
    expect(screen.getByLabelText(/mô tả/i)).toHaveValue('Cũ');
  });

  it('submit gọi botsApi.update với đúng botId + dữ liệu mới rồi đóng dialog', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({ ...BOT, displayName: 'New Name' });
    const { onOpenChange } = renderDialog();

    await user.clear(screen.getByLabelText(/tên hiển thị/i));
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'New Name');
    await user.click(screen.getByRole('button', { name: /lưu/i }));

    expect(mockUpdate).toHaveBeenCalledWith('bot-1', expect.objectContaining({
      displayName: 'New Name',
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
