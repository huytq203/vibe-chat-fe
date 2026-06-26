"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { EmojiText } from "@/components/common/EmojiText";
import { REACTION_EMOJI } from "@/features/chat/reactions";
import type { Message, ReactionType } from "@/features/chat/types";
import { ReactionViewerDialog } from "./ReactionViewerDialog";
import { MessageLikeButton } from "./MessageLikeButton";

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

  const total = reactions.reduce((sum, r) => sum + r.count, 0);
  const mine = myReaction !== null;

  function openViewer(type: ReactionType | null) {
    setViewType(type);
    setOpen(true);
  }

  return (
    <>
      <div
        className={cn(
          "mt-1 flex flex-wrap gap-1",
          isMe ? "justify-end" : "justify-end",
        )}
      >
         {isMe&&!message.metadata?.optimistic &&
          !message.metadata?.failed &&
          !message.isDeleted && (
            <MessageLikeButton
              message={message}
              isMe={isMe}
              className={cn(
                "ml-0.5 transition-opacity",
                mine
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover/row:pointer-events-auto [@media(hover:hover)]:group-hover/row:opacity-100",
              )}
            />
          )}
        <button
          type="button"
          onClick={() => openViewer(null)}
          title="Xem ai đã thả cảm xúc"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[13px] transition-colors",
            mine
              ? "border-primary/40 bg-white text-primary hover:border-primary/40"
              : "border-border bg-white text-primary hover:border-primary/40",
          )}
        >
          <span className="flex items-center gap-0.5">
            {reactions.map((r) => (
              <EmojiText
                key={r.type}
                text={REACTION_EMOJI[r.type]}
                className="leading-none"
              />
            ))}
          </span>
          {total >= 1 && <span className="tabular-nums">{total}</span>}
        </button>
        
        {!isMe&&!message.metadata?.optimistic &&
          !message.metadata?.failed &&
          !message.isDeleted && (
            <MessageLikeButton
              message={message}
              isMe={isMe}
              className={cn(
                "ml-0.5 transition-opacity",
                mine
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover/row:pointer-events-auto [@media(hover:hover)]:group-hover/row:opacity-100",
              )}
            />
          )}
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
