import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateBotDialog } from './CreateBotDialog';
import { ApiError } from '@/lib/api/client';

vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockCreate = vi.mocked(botsApi.create);

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CreateBotDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('CreateBotDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Không test nào ở đây bấm nút Copy của TokenRevealCard, nên không cần
    // stub navigator.clipboard — bản gốc dùng Object.assign(navigator, ...)
    // nhưng `clipboard` là accessor chỉ-đọc trong jsdom của repo này (chỉ được
    // tạo lười khi userEvent.setup() chạy, xem TokenRevealCard.test.tsx), nên
    // Object.assign ném lỗi ngay ở beforeEach.
  });

  it('hiện lỗi validate khi username không chứa "bot"', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_service');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText(/phải chứa "bot"/i)).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submit hợp lệ → gọi create → chuyển sang màn hiện token', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      bot: {
        id: 'bot-1',
        username: 'weather_bot',
        displayName: 'Weather Bot',
        status: 'ACTIVE',
        provisioned: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: {
        id: 'token-1',
        token: 'bot-1:secret',
        prefix: 'secret',
        scopes: ['messages:send'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText('bot-1:secret')).toBeInTheDocument();
  });

  it('lỗi 409 BOT_USERNAME_TAKEN → hiện lỗi ở field username', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(
      new ApiError(409, 'BOT_USERNAME_TAKEN', 'Username "weather_bot" đã được sử dụng'),
    );
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText(/đã được sử dụng/i)).toBeInTheDocument();
  });

  it('đóng dialog sau khi bấm Đóng ở màn hiện token → gọi onOpenChange(false)', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      bot: {
        id: 'bot-1',
        username: 'weather_bot',
        displayName: 'Weather Bot',
        status: 'ACTIVE',
        provisioned: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: {
        id: 'token-1',
        token: 'bot-1:secret',
        prefix: 'secret',
        scopes: ['messages:send'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    await screen.findByText('bot-1:secret');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /đóng/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('bấm ESC hoặc nút X ở màn hiện token → KHÔNG đóng dialog (chỉ đóng qua nút Đóng)', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      bot: {
        id: 'bot-1',
        username: 'weather_bot',
        displayName: 'Weather Bot',
        status: 'ACTIVE',
        provisioned: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: {
        id: 'token-1',
        token: 'bot-1:secret',
        prefix: 'secret',
        scopes: ['messages:send'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    await screen.findByText('bot-1:secret');

    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('bot-1:secret')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('bot-1:secret')).toBeInTheDocument();
  });

  it('bấm ESC ở màn form (chưa tạo bot) → đóng dialog bình thường', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
