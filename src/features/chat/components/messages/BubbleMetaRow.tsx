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
  outside?: boolean;
};

/** Hàng meta của tin nhắn: hẹn giờ tự huỷ, nhãn chỉnh sửa, thời gian và trạng thái. */
export function BubbleMetaRow({
  message,
  isMe,
  isSending,
  isFailed,
  isSeen,
  hasTheme,
  bubbleConfig,
  outside = false,
}: BubbleMetaRowProps) {
  return (
    <div
      data-message-meta
      className={cn(
        "mt-1 flex items-center gap-1 tabular-nums",
        outside && "px-1 text-primary-foreground drop-shadow-[0_1px_2px_rgb(0_0_0/0.75)]",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {message.expireAt && !message.isDeleted && !isSending && !isFailed && (
        <SelfDestructTimer expireAt={message.expireAt} isMe={isMe} outside={outside} />
      )}
      {message.isEdited && !message.isDeleted && (
        <span
          className={cn(
            "text-[9.5px] italic",
            outside
              ? "text-primary-foreground/80"
              : !hasTheme && (isMe ? "text-primary-foreground/60" : "text-muted-foreground/70"),
          )}
          style={hasTheme ? { color: isMe ? bubbleConfig.myMetaColor : bubbleConfig.otherMetaColor } : undefined}
        >
          đã chỉnh sửa
        </span>
      )}
      <span
        className={cn(
          "text-[10px]",
          outside
            ? "text-primary-foreground/90"
            : !hasTheme && (isMe ? "text-primary-foreground/70" : "text-muted-foreground"),
        )}
        style={hasTheme ? { color: isMe ? bubbleConfig.myMetaColor : bubbleConfig.otherMetaColor } : undefined}
      >
        {isFailed ? "Gửi thất bại" : formatBubbleTime(message.createdAt)}
      </span>
      {isMe &&
        (isFailed ? (
          <AlertCircle
            className={cn("h-3.5 w-3.5", outside ? "text-danger" : !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Gửi thất bại"
          />
        ) : isSending ? (
          <Clock
            className={cn("h-3.5 w-3.5", outside ? "text-primary-foreground/90" : !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đang gửi"
          />
        ) : isSeen ? (
          <CheckCheck
            className={cn("h-3.5 w-3.5", outside ? "text-primary-foreground" : !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đã xem"
          />
        ) : (
          <Check
            className={cn("h-3.5 w-3.5", outside ? "text-primary-foreground/90" : !hasTheme && "text-primary-foreground/70")}
            style={hasTheme ? { color: bubbleConfig.myMetaColor } : undefined}
            aria-label="Đã gửi"
          />
        ))}
    </div>
  );
}
