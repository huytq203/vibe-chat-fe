import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotsTab } from './BotsTab';
import type { BotListPage } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockList = vi.mocked(botsApi.list);

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotsTab />
    </QueryClientProvider>,
  );
}

const PAGE: BotListPage = {
  items: [
    {
      id: 'bot-1',
      username: 'weather_bot',
      displayName: 'Weather Bot',
      status: 'ACTIVE',
      provisioned: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

describe('BotsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện skeleton khi loading', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(screen.getAllByTestId('bot-skeleton').length).toBeGreaterThan(0);
  });

  it('hiện empty state khi không có bot', async () => {
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    renderTab();
    expect(await screen.findByText(/chưa có bot nào/i)).toBeInTheDocument();
  });

  it('hiện lỗi khi load thất bại', async () => {
    mockList.mockRejectedValue(new Error('network error'));
    renderTab();
    expect(await screen.findByText(/không tải được danh sách bot/i)).toBeInTheDocument();
  });

  it('hiện danh sách bot khi có data', async () => {
    mockList.mockResolvedValue(PAGE);
    renderTab();
    expect(await screen.findByText('weather_bot')).toBeInTheDocument();
    expect(screen.getByText('Weather Bot')).toBeInTheDocument();
  });

  it('mở CreateBotDialog khi click nút Tạo bot mới', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    renderTab();

    await user.click(await screen.findByRole('button', { name: /tạo bot mới/i }));

    // Dialog mở xong thì section phía sau (chứa nút "Tạo bot mới") bị đánh dấu
    // aria-hidden bởi Base UI, nên từ đây chỉ còn nút submit "Tạo bot" khớp role.
    // Điền username hợp lệ về format nhưng không chứa "bot" để kích hoạt đúng
    // lỗi validate (giống pattern đã dùng ở CreateBotDialog.test.tsx).
    await user.type(screen.getByLabelText(/username/i), 'weather_service');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText(/username phải chứa/i)).toBeInTheDocument();
  });
});
