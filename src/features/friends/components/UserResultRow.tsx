'use client';

import { Check, MessageSquare, ShieldOff, UserPlus, X } from 'lucide-react';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { cn } from '@/lib/utils/cn';
import type { UserSearchItem } from '@/features/friends/types';

type Props = {
  user: UserSearchItem;
  isPending?: boolean;
  onSend: (user: UserSearchItem) => void;
  onCancel: (user: UserSearchItem) => void;
  onAccept: (user: UserSearchItem) => void;
  onReject: (user: UserSearchItem) => void;
  onMessage?: (user: UserSearchItem) => void;
  variant?: 'row' | 'card';
};

export function UserResultRow({
  user,
  isPending,
  onSend,
  onCancel,
  onAccept,
  onReject,
  onMessage,
  variant = 'row',
}: Props) {
  const name = user.displayName || user.username;
  const subtitle = `@${user.username}`

  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <Avatar name={name} src={user.avatarUrl} size="md" />
        <div className="mt-1 line-clamp-1 text-center text-sm font-semibold">
          {name}
        </div>
        <div className="line-clamp-1 text-center text-[11px] text-muted-foreground">
          {subtitle}
        </div>
        {typeof user.mutualFriendsCount === 'number' && user.mutualFriendsCount > 0 && (
          <Badge variant="secondary" size="sm" className="mt-1">
            {user.mutualFriendsCount} bạn chung
          </Badge>
        )}
        <div className="mt-2 w-full">
          <PrimaryAction
            user={user}
            isPending={isPending}
            onSend={onSend}
            onCancel={onCancel}
            onAccept={onAccept}
            onReject={onReject}
            onMessage={onMessage}
            full
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40">
      <button
        type="button"
        onClick={() => onMessage?.(user)}
        disabled={!onMessage}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        aria-label={`Nhắn tin với ${name}`}>
        <Avatar name={name} src={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            {typeof user.mutualFriendsCount === 'number' && user.mutualFriendsCount > 0 && (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {user.mutualFriendsCount} bạn chung
              </span>
            )}
          </div>
        </div>
      </button>
      <PrimaryAction
        user={user}
        isPending={isPending}
        onSend={onSend}
        onCancel={onCancel}
        onAccept={onAccept}
        onReject={onReject}
        onMessage={onMessage}
      />
    </div>
  );
}

function PrimaryAction({
  user,
  isPending,
  onSend,
  onCancel,
  onAccept,
  onReject,
  onMessage,
  full,
}: Props & { full?: boolean }) {
  const widthCls = full ? 'w-full' : '';
  switch (user.friendship) {
    case 'NONE':
      return (
        <Button
          size="sm"
          variant="solid"
          leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          onClick={() => onSend(user)}
          isLoading={isPending}
          className={cn(widthCls)}
        >
          Kết bạn
        </Button>
      );
    case 'PENDING_OUT':
      return (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<X className="h-3.5 w-3.5" />}
          onClick={() => onCancel(user)}
          isLoading={isPending}
          className={cn(widthCls)}
        >
          Huỷ lời mời
        </Button>
      );
    case 'PENDING_IN':
      return (
        <div className={cn('flex gap-1.5', widthCls)}>
          <Button
            size="sm"
            variant="solid"
            onClick={() => onAccept(user)}
            isLoading={isPending}
            className={cn('flex-1')}
          >
            <Check className="h-3.5 w-3.5" /> Chấp nhận
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReject(user)}
            isLoading={isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    case 'ACCEPTED':
      return (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
          onClick={() => onMessage?.(user)}
          className={cn(widthCls)}
        >
          Nhắn tin
        </Button>
      );
    case 'BLOCKED_BY_ME':
      return (
        <Button
          size="sm"
          variant="danger-outline"
          leftIcon={<ShieldOff className="h-3.5 w-3.5" />}
          disabled
          className={cn(widthCls)}
        >
          Đã chặn
        </Button>
      );
    default:
      return null;
  }
}
