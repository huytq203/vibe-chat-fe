import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotTokensPanel } from './BotTokensPanel';
import type { Bot, BotTokenListItem } from '../types';

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));

import { botTokensApi } from '@/services/bot-tokens.api';

const mockList = vi.mocked(botTokensApi.list);
const mockRotate = vi.mocked(botTokensApi.rotate);
const mockRevoke = vi.mocked(botTokensApi.revoke);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ACTIVE_TOKEN: BotTokenListItem = {
  id: 'token-1',
  prefix: 'abc123',
  scopes: ['messages:send'],
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotTokensPanel bot={BOT} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BotTokensPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Không test nào ở đây bấm nút Copy của TokenRevealCard, nên không cần
    // stub navigator.clipboard — bản gốc dùng Object.assign(navigator, ...)
    // nhưng `clipboard` là accessor chỉ-đọc trong jsdom của repo này (chỉ được
    // tạo lười khi userEvent.setup() chạy, xem TokenRevealCard.test.tsx), nên
    // Object.assign ném lỗi ngay ở beforeEach khi 1 test trước đó đã gọi
    // userEvent.setup() (xem CreateBotDialog.test.tsx cùng deviation).
  });

  it('hiện empty state khi bot chưa có token nào', async () => {
    mockList.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/chưa có token nào/i)).toBeInTheDocument();
  });

  it('hiện danh sách token với badge "Đã thu hồi" khi revokedAt != null', async () => {
    mockList.mockResolvedValue([
      { ...ACTIVE_TOKEN, id: 'token-2', revokedAt: '2026-02-01T00:00:00.000Z' },
    ]);
    renderPanel();
    expect(await screen.findByText(/đã thu hồi/i)).toBeInTheDocument();
  });

  it('rotate token → hiện lại TokenRevealCard với token mới', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ACTIVE_TOKEN]);
    mockRotate.mockResolvedValue({
      id: 'token-3',
      token: 'bot-1:newsecret',
      prefix: 'newsecret',
      scopes: ['messages:send'],
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    renderPanel();

    await screen.findByText('abc123••••');
    await user.click(screen.getByRole('button', { name: /rotate/i }));
    await user.click(screen.getByRole('button', { name: /xác nhận rotate/i }));

    expect(mockRotate).toHaveBeenCalledWith('bot-1', 'token-1', {});
    expect(await screen.findByText('bot-1:newsecret')).toBeInTheDocument();
  });

  it('revoke token → gọi botTokensApi.revoke', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ACTIVE_TOKEN]);
    mockRevoke.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByText('abc123••••');
    await user.click(screen.getByRole('button', { name: /^revoke$/i }));
    await user.click(screen.getByRole('button', { name: /xác nhận revoke/i }));

    expect(mockRevoke).toHaveBeenCalledWith('bot-1', 'token-1');
  });
});
