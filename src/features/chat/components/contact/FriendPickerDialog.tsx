'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useFriends } from '@/features/friends/hooks/use-query';
import type { FriendRequest } from '@/features/friends/types';

type FriendPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (friendId: string) => void;
};

export function FriendPickerDialog({ open, onOpenChange, onPick }: FriendPickerDialogProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useFriends();

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(({ user }) =>
      (user.displayName ?? '').toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q),
    );
  }, [data, search]);

  function handlePick(friend: FriendRequest) {
    onPick(friend.user.id);
    onOpenChange(false);
    setSearch('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSearch('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gửi danh thiếp tới</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong danh sách bạn bè"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <FriendList
            isLoading={isLoading}
            isError={isError}
            items={filtered}
            hasSearch={search.trim().length > 0}
            onPick={handlePick}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FriendListProps = {
  isLoading: boolean;
  isError: boolean;
  items: FriendRequest[];
  hasSearch: boolean;
  onPick: (friend: FriendRequest) => void;
};

function FriendList({ isLoading, isError, items, hasSearch, onPick }: FriendListProps) {
  const hint = 'py-8 text-center text-[13px] text-muted-foreground';

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-1 py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (isError) return <p className={hint}>Không tải được danh sách bạn bè. Thử lại sau.</p>;

  if (items.length === 0) {
    return (
      <p className={hint}>
        {hasSearch ? 'Không tìm thấy bạn bè phù hợp.' : 'Bạn chưa có bạn bè nào.'}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((friend) => (
        <li key={friend.user.id}>
          <button
            type="button"
            onClick={() => onPick(friend)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
          >
            <Avatar
              name={friend.user.displayName ?? friend.user.username}
              src={friend.user.avatarUrl}
              seed={friend.user.id}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">
                {friend.user.displayName ?? friend.user.username}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                @{friend.user.username}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
