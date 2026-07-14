import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserResultRow } from './UserResultRow';
import type { UserSearchItem } from '@/features/friends/types';

const BOT: UserSearchItem = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  avatarUrl: null,
  friendship: 'NONE',
};

describe('UserResultRow', () => {
  it('ẩn nút kết bạn khi kết quả search là bot', () => {
    render(
      <UserResultRow
        user={BOT}
        onSend={vi.fn()}
        onCancel={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onMessage={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /kết bạn/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^nhắn tin$/i })).toBeInTheDocument();
  });
});
