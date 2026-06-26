'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useSetNickname } from '@/features/chat/hooks/use-mutations';

interface NicknameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
  displayName: string;
  currentNickname: string | null;
  avatarUrl?: string | null;
}

export function NicknameDialog({
  open,
  onOpenChange,
  conversationId,
  userId,
  displayName,
  currentNickname,
  avatarUrl,
}: NicknameDialogProps) {
  const [value, setValue] = useState(currentNickname ?? '');
  // Reset input mỗi lần dialog mở (sync-during-render thay vì setState trong effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(currentNickname ?? '');
  }
  // Biệt danh per-conversation: PUT /conversations/{id}/members/{userId}/nickname (xem 03-conversations.md).
  const setNickname = useSetNickname();
  const isPending = setNickname.isPending;

  const handleConfirm = () => {
    setNickname.mutate(
      { conversationId, userId, nickname: value.trim() || null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-base font-bold">Đặt tên gợi nhớ</DialogTitle>

        <div className="flex flex-col items-center gap-3 py-1">
          <Avatar name={displayName} src={avatarUrl} size="lg" />
          <p className="text-center text-sm leading-relaxed">
            Hãy đặt cho <span className="font-semibold">{displayName}</span> một cái tên dễ nhớ.{' '}
            <span className="text-muted-foreground">
              Lưu ý: Tên gợi nhớ sẽ chỉ hiển thị riêng với bạn.
            </span>
          </p>
        </div>

        <Input
          value={value}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
          placeholder={displayName}
          maxLength={100}
          onKeyDown={(e) => { if (e.key === 'Enter' && !isPending) handleConfirm(); }}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleConfirm}
            isLoading={isPending}
          >
            Xác nhận
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
