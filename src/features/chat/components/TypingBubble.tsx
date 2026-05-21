'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from './Avatar';

type TypingBubbleProps = {
  userId: string;
  showAvatar: boolean;
  senderName?: string | null;
};

export function TypingBubble({ userId, showAvatar, senderName }: TypingBubbleProps) {
  return (
    <div className="flex items-end gap-1.5 justify-start">
      <div className="w-7 shrink-0">
        {showAvatar && (
          <Avatar
            name={senderName ?? null}
            seed={userId}
            size="sm"
            className="!h-7 !w-7 !rounded-lg !text-[9px]"
          />
        )}
      </div>
      <div className="max-w-[65%]">
        <div
          className={cn(
            'relative rounded-2xl rounded-bl-md border border-border bg-muted px-3.5 py-2.5',
            'text-foreground',
          )}
          aria-label="Đang nhập"
        >
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground [animation-delay:300ms]" />
            <span className="ml-1 text-[11px] text-muted-foreground">đang nhập…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
