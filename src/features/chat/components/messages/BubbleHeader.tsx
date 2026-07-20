import { Pin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type BubbleHeaderProps = {
  isMe: boolean;
  isPinned?: boolean;
  showSenderName?: boolean;
  senderName?: string | null;
  leaderLabel?: string | null;
  viaBotUsername?: string | null;
};

/** Phần đầu bong bóng: nhãn "Đã ghim" + tên người gửi + nhãn trưởng/phó nhóm. */
export function BubbleHeader({
  isMe,
  isPinned,
  showSenderName,
  senderName,
  leaderLabel,
  viaBotUsername,
}: BubbleHeaderProps) {
  return (
    <>
      {isPinned && (
        <span
          className={cn(
            "mb-0.5 flex items-center gap-1 text-[10px] font-medium text-primary",
            isMe ? "justify-end pr-1" : "ml-1.5",
          )}
        >
          <Pin className="h-3 w-3" /> Đã ghim
        </span>
      )}
      {!isMe && showSenderName && senderName && (
        <p className="mb-0.5 ml-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          {senderName}
          {leaderLabel && (
            <span className="rounded bg-primary/15 px-1.5 py-px text-[9.5px] font-bold text-primary">
              {leaderLabel}
            </span>
          )}
          {viaBotUsername && (
            <span className="rounded bg-muted px-1.5 py-px text-[9.5px] font-bold text-muted-foreground">
              qua @{viaBotUsername}
            </span>
          )}
        </p>
      )}
      {viaBotUsername && (isMe || !showSenderName || !senderName) && (
        <p
          className={cn(
            "mb-0.5 text-[10.5px] font-semibold text-muted-foreground",
            isMe ? "mr-1.5 text-right" : "ml-1.5",
          )}
        >
          qua @{viaBotUsername}
        </p>
      )}
    </>
  );
}
