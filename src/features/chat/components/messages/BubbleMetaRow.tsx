import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/features/chat/types";
import { formatBubbleTime } from "@/features/chat/utils";
import type { BubbleConfig } from "@/features/chat/config/chat-themes";
import { SelfDestructTimer } from "./SelfDestructTimer";

type BubbleMetaRowProps = {
  message: Message;
  isMe: boolean;
  isSending: boolean;
  isFailed: boolean;
  isSeen: boolean;
  hasTheme: boolean;
  bubbleConfig: BubbleConfig;
};

/** Hàng meta trong bong bóng: hẹn giờ tự huỷ, nhãn "đã chỉnh sửa", thời gian + icon trạng thái. */
export function BubbleMetaRow({
  message,
  isMe,
  isSending,
  isFailed,
  isSeen,
  hasTheme,
  bubbleConfig,
}: BubbleMetaRowProps) {
  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {message.expireAt && !message.isDeleted && !isSending && !isFailed && (
        <SelfDestructTimer expireAt={message.expireAt} isMe={isMe} />
      )}
      {message.isEdited && !message.isDeleted && (
        <span
          className={cn(
            "text-[9.5px] italic",
            !hasTheme && (isMe ? "text-primary-foreground/60" : "text-muted-foreground/70"),
          )}
          style={hasTheme ? { color: isMe ? bubbleConfig.myMetaColor : bubbleConfig.otherMetaColor } : undefined}
        >
          đã chỉnh sửa
        </span>
      )}
      <span
        className={cn(
          "text-[10px]",
          !hasTheme && (isMe ? "text-primary-foreground/70" : "text-muted-foreground"),
        )}
        style={hasTheme ? { color: isMe ? bubbleConfig.myMetaColor : bubbleConfig.otherMetaColor } : undefined}
      >
        {isFailed ? "Gửi thất bại" : formatBubbleTime(message.createdAt)}
      </span>
      {isMe &&
        (isFailed ? (
          <AlertCircle
            className={cn("h-3.5 w-3.5", !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Gửi thất bại"
          />
        ) : isSending ? (
          <Clock
            className={cn("h-3.5 w-3.5", !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đang gửi"
          />
        ) : isSeen ? (
          <CheckCheck
            className={cn("h-3.5 w-3.5", !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đã xem"
          />
        ) : (
          <Check
            className={cn("h-3.5 w-3.5", !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đã gửi"
          />
        ))}
    </div>
  );
}
