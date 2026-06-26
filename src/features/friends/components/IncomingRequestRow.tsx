'use client';

import { Avatar } from '@/features/chat/components/common/Avatar';
import { Button } from '@/components/ui/button/Button';
import { formatListTime } from '@/features/chat/utils';
import type { FriendRequest } from '@/features/friends/types';

type Props = {
  request: FriendRequest;
  isPending?: boolean;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
};

export function IncomingRequestRow({
  request,
  isPending,
  onAccept,
  onReject,
}: Props) {
  const name = request.user.displayName || request.user.username;
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40">
      <Avatar name={name} src={request.user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          @{request.user.username}
        </div>
        <div className="text-[11px] text-muted-foreground/80">
          {formatListTime(request.createdAt)}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <Button
          size="xs"
          variant="solid"
          onClick={() => onAccept(request.user.id)}
          isLoading={isPending}
        >
          Chấp nhận
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => onReject(request.user.id)}
          isLoading={isPending}
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
}
