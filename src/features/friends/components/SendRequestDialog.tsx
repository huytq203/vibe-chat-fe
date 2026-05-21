'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/Avatar';
import type { UserSearchItem } from '../types';

type Props = {
  user: UserSearchItem | null;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: { nickname?: string }) => void;
};

export function SendRequestDialog({ user, isPending, onClose, onSubmit }: Props) {
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (user) setNickname('');
  }, [user]);

  const open = Boolean(user);
  const name = user ? user.displayName || user.username : '';

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi lời mời kết bạn</DialogTitle>
          <DialogDescription>
            Thêm biệt danh để dễ nhận diện (chỉ bạn nhìn thấy).
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="my-2 flex items-center gap-3 rounded-lg border border-border bg-accent/30 p-3">
            <Avatar
              name={name}
              src={user.avatarUrl}
              seed={user.id}
              size="md"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-xs text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Biệt danh (không bắt buộc)
          </label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ví dụ: Lan ở công ty"
            maxLength={50}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button
            variant="solid"
            onClick={() =>
              onSubmit({ nickname: nickname.trim() ? nickname.trim() : undefined })
            }
            isLoading={isPending}
          >
            Gửi lời mời
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
