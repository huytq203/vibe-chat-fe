'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useFriends } from '@/features/friends/hooks/use-query';
import type { FriendRequest } from '@/features/friends/types';

export type ContactSnapshot = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

type ContactPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chọn 1 bạn bè để chia sẻ danh thiếp. */
  onPick: (contact: ContactSnapshot) => void;
};

/** Dialog chọn bạn bè để gửi danh thiếp (type=CONTACT) vào conversation hiện tại. */
export function ContactPickerDialog({ open, onOpenChange, onPick }: ContactPickerDialogProps) {
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
    onPick({
      id: friend.user.id,
      displayName: friend.user.displayName ?? friend.user.username,
      username: friend.user.username,
      avatarUrl: friend.user.avatarUrl,
    });
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
          <DialogTitle>Chia sẻ danh thiếp</DialogTitle>
        </DialogHeader>
        <div className="relative mt-3">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong danh sách bạn bè"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <PickerBody
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

type PickerBodyProps = {
  isLoading: boolean;
  isError: boolean;
  items: FriendRequest[];
  hasSearch: boolean;
  onPick: (friend: FriendRequest) => void;
};

function PickerBody({ isLoading, isError, items, hasSearch, onPick }: PickerBodyProps) {
  const hint = 'py-8 text-center text-[13px] text-muted-foreground';
  if (isLoading) return <p className={hint}>Đang tải…</p>;
  if (isError) return <p className={hint}>Không tải được danh sách bạn bè. Thử lại sau.</p>;
  if (items.length === 0)
    return <p className={hint}>{hasSearch ? 'Không tìm thấy bạn bè phù hợp.' : 'Bạn chưa có bạn bè nào.'}</p>;
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
              <p className="truncate text-[11.5px] text-muted-foreground">@{friend.user.username}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
