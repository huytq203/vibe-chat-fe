'use client';

import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import { useToggleReaction } from '@/features/chat/hooks/useReactions';
import { REACTION_EMOJI, REACTION_LABEL } from '@/features/chat/reactions';
import type { Message } from '@/features/chat/types';

type MessageReactionsProps = {
  message: Message;
  isMe: boolean;
};

/** Hàng chip cảm xúc dưới bong bóng tin. Tự ẩn khi tin chưa có reaction nào. */
export function MessageReactions({ message, isMe }: MessageReactionsProps) {
  const toggle = useToggleReaction(message.conversationId);
  const reactions = message.reactions ?? [];
  const myReaction = message.myReaction ?? null;
  if (reactions.length === 0) return null;

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', isMe ? 'justify-end' : 'justify-start')}>
      {reactions.map((r) => {
        const mine = myReaction === r.type;
        return (
          <button
            key={r.type}
            type="button"
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate({ messageId: message.id, type: r.type, current: myReaction })
            }
            title={mine ? 'Bỏ cảm xúc' : REACTION_LABEL[r.type]}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
              mine
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-muted text-foreground hover:bg-accent',
            )}
          >
            <EmojiText text={REACTION_EMOJI[r.type]} className="leading-none" />
            {r.count > 1 && <span className="tabular-nums">{r.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
