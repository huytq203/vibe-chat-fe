import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotsTab } from './BotsTab';
import type { BotListPage } from '../types';
import type { Conversation } from '@/features/chat/types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));
vi.mock('@/services/users.api', () => ({
  usersApi: { search: vi.fn() },
}));
vi.mock('@/services/chat.api', () => ({
  chatApi: { createDirect: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useParams: () => ({}),
}));

import { botsApi } from '@/services/bots.api';
import { usersApi } from '@/services/users.api';
import { chatApi } from '@/services/chat.api';

const mockList = vi.mocked(botsApi.list);
const mockSearch = vi.mocked(usersApi.search);
const mockCreateDirect = vi.mocked(chatApi.createDirect);

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'me',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 0,
    memberIds: ['me', 'bf-1'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderTab(onClose?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotsTab onClose={onClose} />
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

  it('mở chat với BotFather và gọi onClose khi click nút', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    mockSearch.mockResolvedValue({
      items: [
        {
          id: 'bf-1',
          username: 'botfather',
          displayName: 'BotFather',
          avatarUrl: null,
          friendship: 'NONE',
        },
      ],
      nextCursor: null,
    });
    mockCreateDirect.mockResolvedValue(buildConversation());
    renderTab(onClose);

    await user.click(await screen.findByRole('button', { name: /chat với botfather/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSearch).toHaveBeenCalledWith({ q: '@botfather', limit: 5 });
    expect(mockCreateDirect).toHaveBeenCalledWith('bf-1');
  });
});
