'use client';

import { MessageSquare, UserRound } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { FriendRequest, UserSearchItem } from '@/features/friends/types';
import { EmptyState } from './EmptyState';

type Props = {
  items: FriendRequest[];
  isLoading: boolean;
  isError: boolean;
  isFetchingMore: boolean;
  /** Mở/tạo cuộc trò chuyện trực tiếp với bạn này. */
  onMessage: (user: UserSearchItem) => void;
};

export function FriendsPane({ items, isLoading, isError, isFetchingMore, onMessage }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={<UserRound className="h-9 w-9" />}
        title="Không tải được danh sách bạn bè"
        hint="Vui lòng thử lại sau"
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<UserRound className="h-9 w-9" />}
        title="Chưa có bạn bè"
        hint="Tìm và kết bạn để bắt đầu trò chuyện"
      />
    );
  }

  return (
    <div className="px-2">
      <div className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {items.length} bạn bè
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((r) => (
          <FriendRow key={r.user.id} request={r} onMessage={onMessage} />
        ))}
      </div>
      {isFetchingMore && (
        <div className="flex items-center justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}

function FriendRow({
  request,
  onMessage,
}: {
  request: FriendRequest;
  onMessage: (user: UserSearchItem) => void;
}) {
  const { user, nickname } = request;
  const name = nickname || user.displayName || user.username;
  const item: UserSearchItem = { ...user, friendship: 'ACCEPTED' };

  return (
    <button
      type="button"
      onClick={() => onMessage(item)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/50"
    >
      <Avatar name={name} src={user.avatarUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">@{user.username}</span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
      </span>
    </button>
  );
}
