'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useUserSearch } from '@/features/friends/hooks/use-query';
import { useDebouncedValue } from '@/features/friends/hooks/useDebounce';
import type { UserSearchItem } from '@/features/friends/types';

type ContactPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chọn 1 user để chia sẻ danh thiếp (contactUserId = keycloakId). */
  onPick: (contactUserId: string) => void;
};

/** Dialog tìm + chọn người dùng để gửi danh thiếp (type=CONTACT). */
export function ContactPickerDialog({ open, onOpenChange, onPick }: ContactPickerDialogProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const trimmed = debounced.trim();
  const { data, isFetching, isError } = useUserSearch(debounced);
  const items = data?.items ?? [];

  function handlePick(user: UserSearchItem) {
    onPick(user.id);
    onOpenChange(false);
    setQuery('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Chia sẻ danh thiếp</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm người dùng theo tên hoặc @username"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <PickerBody
            trimmed={trimmed}
            isFetching={isFetching}
            isError={isError}
            items={items}
            onPick={handlePick}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PickerBodyProps = {
  trimmed: string;
  isFetching: boolean;
  isError: boolean;
  items: UserSearchItem[];
  onPick: (user: UserSearchItem) => void;
};

/** 4 trạng thái: nhập-quá-ngắn/loading/error/empty/data. */
function PickerBody({ trimmed, isFetching, isError, items, onPick }: PickerBodyProps) {
  const hint = 'py-8 text-center text-[13px] text-muted-foreground';
  if (trimmed.length < 2) return <p className={hint}>Nhập tối thiểu 2 ký tự để tìm.</p>;
  if (isFetching) return <p className={hint}>Đang tìm…</p>;
  if (isError) return <p className={hint}>Không tải được kết quả. Thử lại sau.</p>;
  if (items.length === 0) return <p className={hint}>Không tìm thấy người dùng phù hợp.</p>;
  return (
    <ul className="flex flex-col">
      {items.map((user) => (
        <li key={user.id}>
          <button
            type="button"
            onClick={() => onPick(user)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
          >
            <Avatar name={user.displayName ?? user.username} src={user.avatarUrl} seed={user.id} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">
                {user.displayName ?? user.username}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">@{user.username}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
