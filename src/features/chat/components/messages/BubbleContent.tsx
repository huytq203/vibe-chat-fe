"use client";

import type { Message } from "@/features/chat/types";
import { readContactCard } from "@/features/chat/types";
import { EmojiText } from "@/components/common/EmojiText";
import { MentionText } from "./MentionText";
import { RichText } from "./RichText";
import { getRichText } from "./rich-text-utils";
import { MediaContent } from "./MediaContent";
import { ReminderCard } from "@/features/my-store/components/ReminderCard";
import { ChecklistCard } from "@/features/my-store/components/ChecklistCard";
import { BookmarkCard } from "@/features/my-store/components/BookmarkCard";
import { ContactCardContent } from "./ContactCardContent";
import { CallMessageContent } from "./CallMessageContent";
import { PollBubble } from "./PollBubble";
import { BotCommandText, hasBotCommand } from "./BotCommandText";

const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "FILE"] as const;

export function BubbleContent({
  message,
  isMe,
  enableBotCommands = false,
}: {
  message: Message;
  isMe: boolean;
  enableBotCommands?: boolean;
}) {
  // Content plaintext — render trực tiếp (không còn lớp giải mã).
  const resolvedBody = message.plaintext ?? message.contentPreview ?? "";

  if (message.isDeleted) {
    return (
      <span className="text-[13.5px] italic opacity-70">
        Tin nhắn đã thu hồi
      </span>
    );
  }
  if (message.type === "TEXT") {
    const body = resolvedBody;
    const textClass =
      "block whitespace-pre-wrap break-words text-[13.5px] leading-relaxed";
    const richText = getRichText(message.metadata);
    if (richText) {
      return (
        <RichText
          text={body}
          mentions={message.mentions ?? []}
          richText={richText}
          className={textClass}
          largeEmoji
          isMe={isMe}
        />
      );
    }
    if (message.mentions?.length) {
      return (
        <MentionText
          text={body}
          mentions={message.mentions}
          className={textClass}
          largeEmoji
          isMe={isMe}
        />
      );
    }
    if (enableBotCommands && hasBotCommand(body)) {
      return (
        <BotCommandText
          conversationId={message.conversationId}
          text={body}
          className={textClass}
          isMe={isMe}
        />
      );
    }
    return <EmojiText text={body} className={textClass} largeEmoji linkify />;
  }
  if (message.type === "CALL") {
    return <CallMessageContent message={message} />;
  }
  if (message.type === "POLL") {
    return <PollBubble message={message} />;
  }
  if (message.type === "CONTACT") {
    const contact = readContactCard(message);
    if (contact) return <ContactCardContent contact={contact} />;
  }
  if (message.type === "REMINDER") return <ReminderCard message={message} />;
  if (message.type === "CHECKLIST") return <ChecklistCard message={message} />;
  if (message.type === "BOOKMARK") return <BookmarkCard message={message} />;
  if ((MEDIA_TYPES as readonly string[]).includes(message.type)) {
    // Caption media: plaintext (rỗng nếu tin media không caption).
    const caption = message.plaintext?.trim();
    return (
      <>
        <MediaContent message={message} isMe={isMe} />
        {caption &&
          (message.mentions?.length ? (
            <MentionText
              text={caption}
              mentions={message.mentions}
              className="mt-1.5 block whitespace-pre-wrap wrap-break-word px-1 text-[13.5px] leading-relaxed"
              largeEmoji
              isMe={isMe}
            />
          ) : (
            <EmojiText
              text={caption}
              className="mt-1.5 block whitespace-pre-wrap wrap-break-word px-1 text-[13.5px] leading-relaxed"
              largeEmoji
              linkify
            />
          ))}
      </>
    );
  }
  return (
    <span className="block text-[13.5px] italic opacity-80">
      [{message.type.toLowerCase()}]
    </span>
  );
}
