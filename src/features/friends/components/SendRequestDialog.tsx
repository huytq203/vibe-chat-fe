"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/Dialog";
import { Input } from "@/components/ui/input/Input";
import { Button } from "@/components/ui/button/Button";
import { Avatar } from "@/features/chat/components/common/Avatar";
import type { UserSearchItem } from "../types";

type Props = {
  user: UserSearchItem | null;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: { nickname?: string }) => void;
};

export function SendRequestDialog({
  user,
  isPending,
  onClose,
  onSubmit,
}: Props) {
  const lastUserRef = useRef(user);
  if (user) lastUserRef.current = user;
  const displayUser = lastUserRef.current;

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(v) => (!v ? onClose() : undefined)}
    >
      <DialogContent className="max-w-md">
        {displayUser && (
          <SendRequestForm
            key={displayUser.id}
            user={displayUser}
            isPending={isPending}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = {
  user: UserSearchItem;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (input: { nickname?: string }) => void;
};

function SendRequestForm({ user, isPending, onClose, onSubmit }: FormProps) {
  const [nickname, setNickname] = useState("");
  const name = user?.displayName || user?.username;

  const handleSubmit = () => {
    const trimmed = nickname.trim();
    onSubmit({ nickname: trimmed ? trimmed : undefined });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gửi lời mời kết bạn</DialogTitle>
        <DialogDescription>
          Thêm biệt danh để dễ nhận diện (chỉ bạn nhìn thấy).
        </DialogDescription>
      </DialogHeader>
      <div className="my-2">
        <div className="my-2 flex items-center gap-3 rounded-lg border border-border bg-accent/30 p-3">
          <Avatar name={name} src={user?.avatarUrl} seed={user?.id} size="md" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">
              @{user?.username}
            </div>
          </div>
        </div>

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
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Huỷ
        </Button>
        <Button variant="solid" onClick={handleSubmit} isLoading={isPending}>
          Gửi lời mời
        </Button>
      </DialogFooter>
    </>
  );
}
