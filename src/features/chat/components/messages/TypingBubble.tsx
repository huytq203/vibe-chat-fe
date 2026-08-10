'use client';

import { Avatar } from '@/features/chat/components/common/Avatar';
import { TypingDots } from '@/features/chat/components/common/TypingDots';

type TypingBubbleProps = {
  showAvatar: boolean;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
};

export function TypingBubble({ showAvatar, senderName, senderAvatarUrl }: TypingBubbleProps) {
  return (
    <div className="flex items-end gap-1.5 justify-start">
      <div className="w-7 shrink-0">
        {showAvatar && (
          <Avatar
            name={senderName ?? null}
            src={senderAvatarUrl}
            size="sm"
            className="!h-7 !w-7 !rounded-lg"
          />
        )}
      </div>
      <div className="max-w-[65%]">
        <div className="relative rounded-2xl rounded-bl-md border border-border bg-muted px-3.5 py-2.5 text-muted-foreground">
          <TypingDots />
        </div>
      </div>
    </div>
  );
}
