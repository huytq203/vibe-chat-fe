"use client";

import { memo, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/features/chat/types";
import { useMessageSelectionStore } from "@/features/chat/stores/message-selection.store";
import {
  type BubbleConfig,
  DEFAULT_BUBBLE_CONFIG,
} from "@/features/chat/config/chat-themes";
import { useBubbleTouchMenu } from "@/features/chat/hooks/useBubbleTouchMenu";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { MessageLikeButton } from "./MessageLikeButton";
import { ReplyQuote } from "./ReplyQuote";
import { BubbleContent, shouldRenderAssistantMarkdown } from "./BubbleContent";
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
  /** Show the sender name above the first bubble in a group. */
  showSenderName?: boolean;
  /** Sender avatar URL from conversation members. */
  senderAvatarUrl?: string | null;
  /** Replied-to message from the cache, or null if unavailable. */
  repliedTo?: Message | null;
  /** Resolved sender name of the replied-to message. */
  repliedToName?: string | null;
  senderUsername?: string | null;
  /** Scroll to the original message when its quote is clicked. */
  onQuoteClick?: (messageId: string) => void;
  /** Highlight after scrolling to this message from a reply. */
  isHighlighted?: boolean;
  /** Whether the user may pin or unpin messages in this conversation. */
  canPin?: boolean;
  /** Whether this message is pinned. */
  isPinned?: boolean;
  /** Sender leadership label when leader messages are marked. */
  leaderLabel?: string | null;
  wallpaperActive?: boolean;
  bubbleConfig?: BubbleConfig;
  /** Allow another surface to replace the action toolbar while sharing the bubble shell. */
  renderActions?: (args: { isMe: boolean; className: string }) => ReactNode;
  enableDefaultActions?: boolean;
  enableTouchMenu?: boolean;
  enableLikeButton?: boolean;
  showReactions?: boolean;
  showBotMarkup?: boolean;
  /** Enable clickable slash commands only in conversations with a bot. */
  enableBotCommands?: boolean;
  /** Render bot content as safe Markdown. */
  renderMarkdown?: boolean;
  /** Use standalone media without a primary bubble background for personal storage. */
  appearance?: "default" | "store";
  /** Whether selection mode is active and this message can be selected. */
  selectable?: boolean;
  selectionMode?: boolean;
  /** Whether this message is currently selected. */
  selected?: boolean;
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
  appearance = "default",
  selectable = false,
  selectionMode = false,
  selected = false,
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
  // Keep image and video content close to the bubble edge.
  const isVisualMedia =
    !message.isDeleted &&
    (message.type === "IMAGE" ||
      message.type === "VIDEO" ||
      message.type === "CONTACT");
  const isContactCard = !message.isDeleted && message.type === "CONTACT";
  // Show actions for sent, non-deleted messages. MessageActions limits edit and delete to own messages.
  const isSelecting = selectionMode || selectable;
  const canActions = !isSelecting && !isSending && !isFailed && !message.isDeleted;
  // Position the action toolbar outside the bubble and reveal it when the row is hovered.
  // Disable pointer events while hidden so it does not block the message.
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
  const resolvedBody = message.plaintext ?? message.contentPreview ?? "";
  const isMarkdownText =
    message.type === "TEXT" &&
    !message.isDeleted &&
    (renderMarkdown || shouldRenderAssistantMarkdown(resolvedBody, isMe));
  const isStoreAppearance = appearance === "store";
  const hasVisualAttachment = message.attachments?.some(
    (attachment) =>
      attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("video/"),
  );
  const isBareMedia =
    !message.isDeleted &&
    hasVisualAttachment &&
    !resolvedBody.trim() &&
    !message.replyToMessageId &&
    !message.forwardFrom;

  // Show the Like button below the bubble on hover when no reaction exists.
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

  // Touch interactions open actions on long press and react on double tap.
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
      <div
        className={cn(
          "min-w-0",
          isContactCard
            ? "w-[352px] max-w-[92%]"
            : isBareMedia
              ? "w-fit max-w-[82%] sm:max-w-[420px]"
            : isMarkdownText
              ? "max-w-[88%] sm:max-w-[78%] md:max-w-[720px]"
              : isStoreAppearance
                ? "max-w-[78%] sm:max-w-[68%] md:max-w-[560px]"
              : "max-w-[65%]",
        )}
      >
        <BubbleHeader
          isMe={isMe}
          isPinned={isPinned}
          showSenderName={showSenderName}
          senderName={senderName}
          leaderLabel={leaderLabel}
          viaBotUsername={viaBotUsername}
        />
        <div
          data-message-surface
          className={cn(
            "relative transition-all",
            "rounded-2xl",
            isBareMedia
              ? "bg-transparent p-0"
              : isVisualMedia
                ? "p-1.5"
                : "px-3.5 py-2.5",
            selectable && (isMe ? "pr-8" : "pl-8"),
            !isBareMedia &&
              (isMe
                ? cn("bg-primary text-primary-foreground", isStoreAppearance && "shadow-micro")
                : !hasTheme && wallpaperActive
                  ? "border border-border/40 bg-background text-foreground"
                  : !hasTheme
                    ? "border border-border bg-muted text-foreground"
                    : "border border-white/10"),
            isFailed && "border border-danger/60",
            isHighlighted &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
          style={hasTheme && !isMe && !isBareMedia ? bubbleConfig.otherStyle : undefined}
          {...bubbleProps}
          onClickCapture={(event) => {
            if (!selectable || (event.target instanceof Element && event.target.closest('[data-selection-overlay]'))) return;
            event.preventDefault();
            event.stopPropagation();
            useMessageSelectionStore.getState().toggle(message.id);
          }}
        >
          {selectable && (
            <button
              type="button"
              data-selection-overlay
              aria-label={selected ? "Bỏ chọn tin nhắn" : "Chọn tin nhắn"}
              aria-pressed={selected}
              onClick={(e) => {
                e.stopPropagation();
                useMessageSelectionStore.getState().toggle(message.id);
              }}
              className={cn(
                "absolute inset-0 z-30 rounded-2xl",
                selected ? "bg-primary/15 ring-2 ring-primary" : "bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full border-2",
                  isMe ? "right-1.5" : "left-1.5",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          )}
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
            mediaPresentation={isStoreAppearance ? "store" : "default"}
          />
        </div>
        {showReactions && !isSelecting && !message.isDeleted && (
          <MessageReactions message={message} isMe={isMe} />
        )}
        <BubbleMetaRow
          message={message}
          isMe={isMe}
          isSending={isSending}
          isFailed={isFailed}
          isSeen={isSeen}
          hasTheme={false}
          bubbleConfig={bubbleConfig}
          outside
        />
        {showBotMarkup && !isSelecting && (
          <BotQuickReplies
            message={message}
            isMe={isMe}
            senderUsername={senderUsername}
            onLaunchWebapp={onLaunchWebapp}
          />
        )}
        {showBotMarkup && !isSelecting && (
          <BotInlineKeyboard
            message={message}
            isMe={isMe}
            senderUsername={senderUsername}
            onLaunchWebapp={onLaunchWebapp}
          />
        )}
        {isFailed && isMe && !isSelecting && <MessageFailedActions message={message} />}
      </div>
    </div>
  );
}

// MessageList updates on new messages, typing, and send errors. Memoization avoids
// rerendering every bubble because props are mostly stable primitives or callbacks.
export const MessageBubble = memo(MessageBubbleImpl);
