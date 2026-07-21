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
import type { StickerSnapshot } from '@/features/chat/types/message';
import { AiMessageContent } from '@/features/chat/components/layout/AiMessageContent';

const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "FILE"] as const;

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

export function shouldRenderAssistantMarkdown(
  body: string,
  isMe: boolean,
): boolean {
  if (isMe) return false;

  const text = body.trim();
  if (!text) return false;

  const hasCodeFence = /(^|\n)\s*```/.test(text);
  const hasTable = /(^|\n)\s*\|.+\|\s*(\n|$)/.test(text);
  const hasRawLogJson =
    /(^|\n)\s*[\[{]\s*(\n|$)/.test(text) &&
    /"(time|level|req|res|statusCode|msg|message)"\s*:/i.test(text);
  if (hasCodeFence || hasTable || hasRawLogJson) return true;

  const strongCount = countMatches(text, /\*\*[^*\n][\s\S]*?[^*\n]\*\*/g);
  const hasInlineCode = /`[^`\n]+`/.test(text);
  const hasListLine = /(^|\n)\s*[-*]\s+\S/.test(text);
  const hasHeading = /(^|\n)\s{0,3}#{1,3}\s+\S/.test(text);

  // Assistant answers usually combine emphasis with structure. A lone
  // "**hello**" from a human stays plain text; log summaries like the bot-service
  // screenshot render as Markdown even when BE metadata/member info is missing.
  return strongCount >= 2 || (strongCount >= 1 && (hasInlineCode || hasListLine || hasHeading));
}

export function BubbleContent({
  message,
  isMe,
  enableBotCommands = false,
  renderMarkdown = false,
}: {
  message: Message;
  isMe: boolean;
  enableBotCommands?: boolean;
  /** Chỉ bật cho tin do bot gửi; user message vẫn hiển thị plain text. */
  renderMarkdown?: boolean;
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
    if (renderMarkdown || shouldRenderAssistantMarkdown(body, isMe)) {
      return <AiMessageContent content={body} />;
    }
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
  if (message.type === 'STICKER') {
    const value = message.metadata?.sticker;
    if (!value || typeof value !== 'object' || !('url' in value) || typeof value.url !== 'string') return null;
    const sticker = value as unknown as StickerSnapshot;
    return <img src={sticker.url} alt={sticker.emoji || 'Sticker'} width={sticker.width} height={sticker.height} className="h-32 w-32 object-contain" />;
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
