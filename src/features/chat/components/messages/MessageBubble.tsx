"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/features/chat/types";
import {
  type BubbleConfig,
  DEFAULT_BUBBLE_CONFIG,
} from "@/features/chat/config/chat-themes";
import { useBubbleTouchMenu } from "@/features/chat/hooks/useBubbleTouchMenu";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { MessageLikeButton } from "./MessageLikeButton";
import { ReplyQuote } from "./ReplyQuote";
import { BubbleContent } from "./BubbleContent";
import { BubbleMetaRow } from "./BubbleMetaRow";
import { MessageFailedActions } from "./MessageFailedActions";
import { BubbleSenderAvatar } from "./BubbleSenderAvatar";
import { BubbleHeader } from "./BubbleHeader";
import { BotInlineKeyboard } from "./BotInlineKeyboard";
import { BotQuickReplies } from "./BotQuickReplies";

type MessageBubbleProps = {
  message: Message;
  meId: string | null;
  showAvatar: boolean;
  senderName?: string | null;
  /** Hiện tên người gửi trên bubble (group, tin đầu của mỗi chuỗi tin). */
  showSenderName?: boolean;
  /** Avatar người gửi (URL đã ký, từ conversation.members). */
  senderAvatarUrl?: string | null;
  /** Tin gốc được trả lời, tra từ cache; null nếu tin không reply hoặc ngoài khung nhìn. */
  repliedTo?: Message | null;
  /** Tên người gửi tin gốc đã resolve (cho ReplyQuote). */
  repliedToName?: string | null;
  senderUsername?: string | null;
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
  wallpaperActive?: boolean;
  bubbleConfig?: BubbleConfig;
  /** Cho surface khác (vd. My Store) thay toolbar action nhưng vẫn dùng chung chrome bubble. */
  renderActions?: (args: { isMe: boolean; className: string }) => ReactNode;
  enableDefaultActions?: boolean;
  enableTouchMenu?: boolean;
  enableLikeButton?: boolean;
  showReactions?: boolean;
  showBotMarkup?: boolean;
  /** Chỉ conversation có bot mới cho phép click slash command. */
  enableBotCommands?: boolean;
  /** Render Markdown an toàn cho nội dung do bot gửi. */
  renderMarkdown?: boolean;
  onLaunchWebapp?: (input: {
    botUsername: string;
    buttonPayload?: string;
  }) => void;
};

function MessageBubbleImpl({
  message,
  meId,
  showAvatar,
  senderName,
  showSenderName,
  senderAvatarUrl,
  repliedTo,
  repliedToName,
  senderUsername,
  onQuoteClick,
  isHighlighted,
  canPin,
  isPinned,
  leaderLabel,
  wallpaperActive,
  bubbleConfig = DEFAULT_BUBBLE_CONFIG,
  renderActions,
  enableDefaultActions = true,
  enableTouchMenu = true,
  enableLikeButton = true,
  showReactions = true,
  showBotMarkup = true,
  enableBotCommands = false,
  renderMarkdown = false,
  onLaunchWebapp,
}: MessageBubbleProps) {
  const hasTheme = Object.keys(bubbleConfig.myStyle).length > 0;
  const isMe = message.senderId === meId;
  const isSending = message.metadata?.optimistic === true;
  const isFailed = message.metadata?.failed === true;
  const isSeen = isMe && !isSending && !isFailed && message.isView === true;
  const viaBotUsername =
    typeof message.metadata?.inline === "object" &&
    message.metadata.inline != null &&
    "botUsername" in message.metadata.inline &&
    typeof message.metadata.inline.botUsername === "string"
      ? message.metadata.inline.botUsername
      : message.viaBotId
        ? "bot"
        : null;
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
  const actionsClassName = cn(
    "pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 opacity-0 transition-opacity",
    "[@media(hover:hover)]:group-hover/row:pointer-events-auto [@media(hover:hover)]:group-hover/row:opacity-100",
    isMe ? "right-full mr-1.5" : "left-full ml-1.5",
  );
  const defaultActionsMenu = enableDefaultActions && canActions && (
    <MessageActions
      message={message}
      meId={meId}
      isMe={isMe}
      senderName={senderName}
      canPin={canPin}
      isPinned={isPinned}
      className={actionsClassName}
    />
  );
  const actionsMenu = canActions
    ? (renderActions?.({ isMe, className: actionsClassName }) ??
      defaultActionsMenu)
    : null;

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  // Nút Like ở mép dưới bong bóng (chỉ hiện khi hover và CHƯA có reaction nào).
  const likeButton = enableLikeButton && canActions && !hasReactions && (
    <MessageLikeButton
      message={message}
      isMe={isMe}
      className={cn(
        "pointer-events-none absolute -bottom-3 z-20 opacity-0 transition-opacity",
        "[@media(hover:hover)]:group-hover/row:pointer-events-auto [@media(hover:hover)]:group-hover/row:opacity-100",
        isMe ? "right-2" : "right-2",
      )}
    />
  );

  // Tương tác cảm ứng: long-press mở menu action, double-tap thả nhanh cảm xúc.
  const { bubbleProps, drawer } = useBubbleTouchMenu({
    message,
    meId,
    isMe,
    senderName,
    canPin,
    isPinned,
    enabled: enableTouchMenu && canActions,
  });

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group/row flex items-end gap-1.5",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {!isMe && (
        <BubbleSenderAvatar
          userId={message.senderId}
          senderName={senderName}
          senderAvatarUrl={senderAvatarUrl}
          showAvatar={showAvatar}
        />
      )}
      <div className="max-w-[65%]">
        <BubbleHeader
          isMe={isMe}
          isPinned={isPinned}
          showSenderName={showSenderName}
          senderName={senderName}
          leaderLabel={leaderLabel}
          viaBotUsername={viaBotUsername}
        />
        <div
          className={cn(
            "relative rounded-2xl transition-all",
            isVisualMedia ? "p-1.5" : "px-3.5 py-2.5",
            !hasTheme &&
              (isMe
                ? "bg-primary text-primary-foreground"
                : wallpaperActive
                  ? "border border-border/40 bg-background text-foreground"
                  : "border border-border bg-muted text-foreground"),
            hasTheme && !isMe && "border border-white/10",
            isFailed && "border border-danger/60",
            isHighlighted &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
          style={
            hasTheme
              ? isMe
                ? bubbleConfig.myStyle
                : bubbleConfig.otherStyle
              : undefined
          }
          {...bubbleProps}
        >
          {actionsMenu}
          {likeButton}
          {drawer}
          {message.replyToMessageId && (
            <ReplyQuote
              repliedTo={repliedTo ?? null}
              repliedToName={repliedToName ?? null}
              replyToMessageId={message.replyToMessageId}
              isMe={isMe}
              onClick={onQuoteClick ?? (() => {})}
            />
          )}
          {message.forwardFrom && (
            <div className="mb-1 text-xs font-medium text-current opacity-70">
              Chuyển tiếp từ {message.forwardFrom.displayName}
            </div>
          )}
          <BubbleContent
            message={message}
            isMe={isMe}
            enableBotCommands={enableBotCommands}
            renderMarkdown={renderMarkdown}
          />
          {/* Timestamp + status INSIDE bubble — luôn hiển thị để tránh flash layout */}
          <BubbleMetaRow
            message={message}
            isMe={isMe}
            isSending={isSending}
            isFailed={isFailed}
            isSeen={isSeen}
            hasTheme={hasTheme}
            bubbleConfig={bubbleConfig}
          />
        </div>
        {showReactions && !message.isDeleted && (
          <MessageReactions message={message} isMe={isMe} />
        )}
        {showBotMarkup && (
          <BotQuickReplies
            message={message}
            isMe={isMe}
            senderUsername={senderUsername}
            onLaunchWebapp={onLaunchWebapp}
          />
        )}
        {showBotMarkup && (
          <BotInlineKeyboard
            message={message}
            isMe={isMe}
            senderUsername={senderUsername}
            onLaunchWebapp={onLaunchWebapp}
          />
        )}
        {isFailed && isMe && <MessageFailedActions message={message} />}
      </div>
    </div>
  );
}

// Memo: MessageList re-render mỗi tin mới / typing / sendError. Không memo → MỌI bubble
// re-render lại. Props gần như primitive và ổn định (onQuoteClick là useCallback ở parent)
// nên so sánh nông cắt phần lớn re-render thừa, mượt hơn khi hội thoại dài (P1).
export const MessageBubble = memo(MessageBubbleImpl);
