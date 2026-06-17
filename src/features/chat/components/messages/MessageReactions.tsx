'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import { REACTION_EMOJI, REACTION_LABEL } from '@/features/chat/reactions';
import type { Message, ReactionType } from '@/features/chat/types';
import { ReactionViewerDialog } from './ReactionViewerDialog';

type MessageReactionsProps = {
  message: Message;
  isMe: boolean;
};

/** Hàng chip cảm xúc dưới bong bóng tin. Click chip → mở popup "ai đã thả cảm xúc". */
export function MessageReactions({ message, isMe }: MessageReactionsProps) {
  const [viewType, setViewType] = useState<ReactionType | null>(null);
  const [open, setOpen] = useState(false);
  const reactions = message.reactions ?? [];
  const myReaction = message.myReaction ?? null;
  if (reactions.length === 0) return null;

  function openViewer(type: ReactionType) {
    setViewType(type);
    setOpen(true);
  }

  return (
    <>
      <div className={cn('mt-1 flex flex-wrap gap-1', isMe ? 'justify-end' : 'justify-start')}>
        {reactions.map((r) => {
          const mine = myReaction === r.type;
          return (
            <button
              key={r.type}
              type="button"
              onClick={() => openViewer(r.type)}
              title={`Xem ai đã thả ${REACTION_LABEL[r.type]}`}
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

      {open && (
        <ReactionViewerDialog
          open={open}
          onOpenChange={setOpen}
          conversationId={message.conversationId}
          messageId={message.id}
          reactions={reactions}
          initialType={viewType}
        />
      )}
    </>
  );
}
