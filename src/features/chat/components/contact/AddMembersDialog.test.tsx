import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddMembersDialog } from './AddMembersDialog';
import { useAuthStore } from '@/features/auth';

vi.mock('@/services/friends.api', () => ({
  friendsApi: { listFriends: vi.fn() },
}));

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn() },
}));

vi.mock('@/services/chat-member.api', () => ({
  memberApi: { addMembers: vi.fn(), removeMember: vi.fn(), banMember: vi.fn() },
}));

import { friendsApi } from '@/services/friends.api';
import { botsApi } from '@/services/bots.api';
import { memberApi } from '@/services/chat-member.api';

const mockListFriends = vi.mocked(friendsApi.listFriends);
const mockListBots = vi.mocked(botsApi.list);
const mockAddMembers = vi.mocked(memberApi.addMembers);

function renderDialog(existingMemberIds: string[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AddMembersDialog
        open
        onOpenChange={onOpenChange}
        conversationId="conv-1"
        existingMemberIds={existingMemberIds}
      />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('AddMembersDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
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

  it('hiện cả bạn bè và bot làm ứng viên, bot có badge riêng', async () => {
    renderDialog();
    expect(await screen.findByText('Bạn A')).toBeInTheDocument();
    expect(await screen.findByText('Bot test')).toBeInTheDocument();
    expect(screen.getByText('Bot')).toBeInTheDocument();
  });

  it('loại ứng viên đã ở trong nhóm', async () => {
    renderDialog(['bot-kc-1']);
    await screen.findByText('Bạn A');
    expect(screen.queryByText('Bot test')).not.toBeInTheDocument();
  });

  it('chọn 1 bạn + 1 bot rồi thêm → gọi addMembers với đúng userIds', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText('Bạn A');
    await user.click(screen.getByText('Bạn A'));
    await user.click(screen.getByText('Bot test'));
    await user.click(screen.getByRole('button', { name: /thêm \(2\)/i }));

    expect(mockAddMembers).toHaveBeenCalledWith('conv-1', expect.arrayContaining(['friend-1', 'bot-kc-1']));
  });
});
