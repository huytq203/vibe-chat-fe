'use client';

import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import {
  QUICK_REACTIONS,
  REACTION_EMOJI,
  REACTION_LABEL,
} from '@/features/chat/reactions';
import type { ReactionType } from '@/features/chat/types';

type ReactionPickerRowProps = {
  myReaction: ReactionType | null;
  onPick: (type: ReactionType) => void;
  className?: string;
  /** 'lg' cho drawer cảm ứng, 'sm' cho popover hover desktop. */
  size?: 'sm' | 'lg';
};

/** Dải emoji cảm xúc nhanh, dùng chung cho hover (desktop) và drawer (mobile). */
export function ReactionPickerRow({
  myReaction,
  onPick,
  className,
  size = 'sm',
}: ReactionPickerRowProps) {
  return (
    <div
      className={cn(
        'flex w-max items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg',
        className,
      )}
    >
      {QUICK_REACTIONS.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onPick(type)}
          aria-label={`Thả ${REACTION_LABEL[type]}`}
          title={REACTION_LABEL[type]}
          className={cn(
            'rounded-full leading-none transition-transform hover:scale-125 active:scale-110',
            size === 'lg' ? 'px-1.5 py-1 text-2xl' : 'px-1 py-0.5 text-lg',
            myReaction === type && 'bg-primary/25',
          )}
        >
          <EmojiText text={REACTION_EMOJI[type]} className="leading-none" />
        </button>
      ))}
    </div>
  );
}
