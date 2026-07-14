import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateGroupDialog } from './CreateGroupDialog';
import { useAuthStore } from '@/features/auth';

vi.mock('@/services/friends.api', () => ({
  friendsApi: { listFriends: vi.fn() },
}));

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn() },
}));

vi.mock('@/services/chat.api', () => ({
  chatApi: { createGroup: vi.fn() },
}));

import { friendsApi } from '@/services/friends.api';
import { botsApi } from '@/services/bots.api';
import { chatApi } from '@/services/chat.api';

const mockListFriends = vi.mocked(friendsApi.listFriends);
const mockListBots = vi.mocked(botsApi.list);
const mockCreateGroup = vi.mocked(chatApi.createGroup);

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CreateGroupDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('CreateGroupDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    mockCreateGroup.mockResolvedValue({ id: 'conv-1' } as never);
    mockListFriends.mockResolvedValue({
      items: [
        {
          user: { id: 'friend-1', username: 'friend1', displayName: 'Bạn A', avatarUrl: null },
          status: 'ACCEPTED',
          nickname: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          acceptedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      nextCursor: null,
    });
    mockListBots.mockResolvedValue({
      items: [
        {
          id: 'bot-1',
          botKeycloakId: 'bot-kc-1',
          username: 'mybot',
          displayName: 'Bot test',
          status: 'ACTIVE',
          provisioned: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('hiện bot đã provision và gửi botKeycloakId khi tạo nhóm', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByPlaceholderText('Nhập tên nhóm...'), 'Nhóm bot');
    await user.click(await screen.findByText('Bạn A'));
    await user.click(await screen.findByText('Bot test'));
    await user.click(screen.getByRole('button', { name: /tạo nhóm/i }));

    await waitFor(() =>
      expect(mockCreateGroup).toHaveBeenCalledWith({
        name: 'Nhóm bot',
        memberIds: expect.arrayContaining(['friend-1', 'bot-kc-1']),
      }),
    );
  });
});
