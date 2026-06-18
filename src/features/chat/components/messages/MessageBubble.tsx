"use client";

import { memo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Pin,
  RotateCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/features/chat/types";
import { formatBubbleTime } from "@/features/chat/utils";
import {
  useDiscardFailedMessage,
  useOpenDirectConversation,
  useResendMessage,
} from "@/features/chat/hooks/use-mutations";
import { Avatar } from "@/features/chat/components/common/Avatar";
import { UserProfileDialog } from "@/features/chat/components/contact/UserProfileDialog";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { MessageLikeButton } from "./MessageLikeButton";
import { ReplyQuote } from "./ReplyQuote";
import { SelfDestructTimer } from "./SelfDestructTimer";
import { BubbleContent } from "./BubbleContent";

type MessageBubbleProps = {
  message: Message;
  meId: string | null;
  showAvatar: boolean;
  senderName?: string | null;
  /** Hiện tên người gửi trên bubble (group, tin đầu của mỗi chuỗi tin). */
  showSenderName?: boolean;
  /** Avatar người gửi (URL đã ký, từ conversation.members). */
  senderAvatarUrl?: string | null;
  senderSeed?: string;
  /** Tin gốc được trả lời, tra từ cache; null nếu tin không reply hoặc ngoài khung nhìn. */
  repliedTo?: Message | null;
  /** Tên người gửi tin gốc đã resolve (cho ReplyQuote). */
  repliedToName?: string | null;
  /** Bấm quote → cuộn tới tin gốc (do MessageList cung cấp). */
  onQuoteClick?: (messageId: string) => void;
  /** Đang được nháy sáng do vừa cuộn tới từ một reply. */
  isHighlighted?: boolean;
  /** Có quyền ghim/bỏ ghim tin trong conversation này (truyền xuống MessageActions). */
  canPin?: boolean;
  /** Tin này đang được ghim. */
  isPinned?: boolean;
  /** Nhãn "Trưởng nhóm"/"Phó nhóm" của người gửi (chỉ khi markLeaderMessages). */
  leaderLabel?: string | null;
};

function MessageBubbleImpl({
  message,
  meId,
  showAvatar,
  senderName,
  showSenderName,
  senderAvatarUrl,
  senderSeed,
  repliedTo,
  repliedToName,
  onQuoteClick,
  isHighlighted,
  canPin,
  isPinned,
  leaderLabel,
}: MessageBubbleProps) {
  const isMe = message.senderId === meId;
  const isSending = message.metadata?.optimistic === true;
  const isFailed = message.metadata?.failed === true;
  const isSeen = isMe && !isSending && !isFailed && message.isView === true;
  const resendMut = useResendMessage();
  const discardFailed = useDiscardFailedMessage();
  // Ảnh/video hiển thị sát viền → bóng dùng padding nhỏ.
  const isVisualMedia =
    !message.isDeleted &&
    (message.type === "IMAGE" ||
      message.type === "VIDEO" ||
      message.type === "CONTACT");
  // Menu hành động: mọi tin đã gửi xong, chưa gỡ. Reply cho tất cả;
  // Sửa/Gỡ chỉ tin của mình (gate trong MessageActions qua isMe).
  const canActions = !isSending && !isFailed && !message.isDeleted;
  // Toolbar action (reply / forward / ⋮) nổi ở cạnh ngoài bong bóng. Hiện khi hover
  // cả DÒNG (group/row), không chỉ riêng bong bóng; pointer-events-none khi ẩn để
  // không chặn chuột. left-full/right-full đẩy ra ngoài cạnh bubble.
  const actionsMenu = canActions && (
    <MessageActions
      message={message}
      meId={meId}
      isMe={isMe}
      senderName={senderName}
      canPin={canPin}
      isPinned={isPinned}
      className={cn(
        "pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 opacity-0 transition-opacity",
        "group-hover/row:pointer-events-auto group-hover/row:opacity-100",
        isMe ? "right-full mr-1.5" : "left-full ml-1.5",
      )}
    />
  );

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  // Nút Like ở mép dưới bong bóng (chỉ hiện khi hover và CHƯA có reaction nào).
  const likeButton = canActions && !hasReactions && (
    <MessageLikeButton
      message={message}
      isMe={isMe}
      className={cn(
        "pointer-events-none absolute -bottom-3 z-20 opacity-0 transition-opacity",
        "group-hover/row:pointer-events-auto group-hover/row:opacity-100",
        isMe ? "right-2" : "right-2",
      )}
    />
  );

  const [senderProfileOpen, setSenderProfileOpen] = useState(false);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group/row flex items-end gap-1.5",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {!isMe && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <button
              type="button"
              onClick={() => setSenderProfileOpen(true)}
              className="cursor-pointer"
            >
              <Avatar
                name={senderName ?? null}
                src={senderAvatarUrl}
                seed={senderSeed ?? message.senderId}
                size="sm"
                className="!h-7 !w-7 !rounded-lg !text-[9px]"
              />
            </button>
          )}
        </div>
      )}
      <div className="max-w-[65%]">
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
          </p>
        )}
        <div
          className={cn(
            "relative rounded-2xl transition-all",
            isVisualMedia ? "p-1.5" : "px-3.5 py-2.5",
            isMe
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-muted text-foreground",
            isSending && "opacity-70",
            isFailed && "border border-danger/60",
            isHighlighted &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
        >
          {actionsMenu}
          {likeButton}
          {message.replyToMessageId && (
            <ReplyQuote
              repliedTo={repliedTo ?? null}
              repliedToName={repliedToName ?? null}
              replyToMessageId={message.replyToMessageId}
              isMe={isMe}
              onClick={onQuoteClick ?? (() => {})}
            />
          )}
          <BubbleContent message={message} isMe={isMe} />
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1",
              isVisualMedia && "px-1 pb-0.5",
            )}
          >
            {message.expireAt &&
              !message.isDeleted &&
              !isSending &&
              !isFailed && (
                <SelfDestructTimer expireAt={message.expireAt} isMe={isMe} />
              )}
            {message.isEdited && !message.isDeleted && (
              <span
                className={cn(
                  "text-[9.5px] italic",
                  isMe
                    ? "text-primary-foreground/50"
                    : "text-muted-foreground/70",
                )}
              >
                đã chỉnh sửa
              </span>
            )}
            <span
              className={cn(
                "text-[10px]",
                isMe ? "text-primary-foreground/60" : "text-muted-foreground",
              )}
            >
              {isSending
                ? "Đang gửi…"
                : isFailed
                  ? "Gửi thất bại"
                  : formatBubbleTime(message.createdAt)}
            </span>
            {isMe &&
              (isFailed ? (
                <AlertCircle
                  className="h-3.5 w-3.5 text-danger-foreground"
                  aria-label="Gửi thất bại"
                />
              ) : isSending ? (
                <Clock
                  className="h-3.5 w-3.5 opacity-70"
                  aria-label="Đang gửi"
                />
              ) : isSeen ? (
                <CheckCheck
                  className="h-3.5 w-3.5  opacity-80"
                  aria-label="Đã xem"
                />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-80" aria-label="Đã gửi" />
              ))}
          </div>
        </div>
        {!message.isDeleted && (
          <MessageReactions message={message} isMe={isMe} />
        )}
        {isFailed && isMe && (
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-danger">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-danger/10"
              disabled={resendMut.isPending}
              onClick={() =>
                resendMut.mutate({
                  conversationId: message.conversationId,
                  tempId: message.id,
                })
              }
              aria-label="Gửi lại"
              title="Gửi lại"
            >
              <RotateCw
                className={cn("h-3 w-3", resendMut.isPending && "animate-spin")}
              />
              Gửi lại
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
              onClick={() => discardFailed(message.conversationId, message.id)}
              aria-label="Bỏ"
              title="Bỏ"
            >
              <X className="h-3 w-3" />
              Bỏ
            </button>
          </div>
        )}
      </div>
      <UserProfileDialog
        open={senderProfileOpen}
        onOpenChange={setSenderProfileOpen}
        userId={message.senderId}
      />
    </div>
  );
}

// Memo: MessageList re-render mỗi tin mới / typing / sendError. Không memo → MỌI bubble
// re-render lại. Props gần như primitive và ổn định (onQuoteClick là useCallback ở parent)
// nên so sánh nông cắt phần lớn re-render thừa, mượt hơn khi hội thoại dài (P1).
export const MessageBubble = memo(MessageBubbleImpl);
