"use client";

import { cn } from "@/lib/utils/cn";
import { EmojiText } from "@/components/common/EmojiText";
import { useToggleReaction } from "@/features/chat/hooks/useReactions";
import {
  QUICK_REACTIONS,
  REACTION_EMOJI,
  REACTION_LABEL,
} from "@/features/chat/reactions";
import type { Message, ReactionType } from "@/features/chat/types";

type MessageLikeButtonProps = {
  message: Message;
  /** Class định vị từ MessageBubble (góc dưới bong bóng + hiệu ứng hover). */
  className?: string;
  /** Tin của mình → canh popup bên phải; tin người khác → canh bên trái. */
  isMe?: boolean;
};

/**
 * Nút Like ở góc dưới bong bóng: bấm = thả/gỡ cảm xúc; hover = đổ ra danh sách
 * emoji đầy đủ (kiểu Messenger). Danh sách nổi phía trên, canh giữa nút.
 */
export function MessageLikeButton({
  message,
  className,
  isMe,
}: MessageLikeButtonProps) {
  const toggleReaction = useToggleReaction(message.conversationId);
  const myReaction = message.myReaction ?? null;

  function react(type: ReactionType) {
    toggleReaction.mutate({ messageId: message.id, type, current: myReaction });
  }

  return (
    <div className={cn("group/react relative", className)}>
      <button
        type="button"
        onClick={() => react(myReaction ?? "LIKE")}
        aria-label="Thả cảm xúc"
        title="Thả cảm xúc"
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border border-border bg-popover text-[13px] leading-none shadow-sm transition-transform hover:scale-110",
          myReaction && "border-primary/40 bg-primary/15",
        )}
      >
        <EmojiText
          text={REACTION_EMOJI[myReaction ?? "LIKE"]}
          className="leading-none"
        />
      </button>

      {/* Hover nút Like → danh sách cảm xúc đầy đủ, nổi phía trên & canh giữa. */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-full z-40 pb-1.5 opacity-0 transition-opacity",
          "group-hover/react:pointer-events-auto group-hover/react:opacity-100",
          isMe ? "right-0" : "left-0",
        )}
      >
        <div className="flex w-max items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg">
          {QUICK_REACTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => react(type)}
              aria-label={`Thả ${REACTION_LABEL[type]}`}
              title={REACTION_LABEL[type]}
              className={cn(
                "rounded-full px-1 py-0.5 text-lg leading-none transition-transform hover:scale-125",
                myReaction === type && "bg-primary/25",
              )}
            >
              <EmojiText text={REACTION_EMOJI[type]} className="leading-none" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
