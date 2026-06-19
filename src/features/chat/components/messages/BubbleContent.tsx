'use client';

import type { Message } from '@/features/chat/types';
import { readContactCard } from '@/features/chat/types';
import { EmojiText } from '@/components/common/EmojiText';
import { MentionText } from './MentionText';
import { RichText } from './RichText';
import { getRichText } from './rich-text-utils';
import { MediaContent } from './MediaContent';
import { ReminderCard } from '@/features/my-store/components/ReminderCard';
import { ChecklistCard } from '@/features/my-store/components/ChecklistCard';
import { BookmarkCard } from '@/features/my-store/components/BookmarkCard';
import { ContactCardContent } from './ContactCardContent';
import { CallMessageContent } from './CallMessageContent';
import { useDecryptedBody } from '@/features/chat/hooks/use-decrypted-message';

const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;

export function BubbleContent({ message, isMe }: { message: Message; isMe: boolean }) {
  // Giải mã content FE-encrypted (tin thường → trả plaintext ngay). Hook gọi vô điều kiện.
  const decrypted = useDecryptedBody(message);
  // Body hiển thị cho TEXT/caption: ưu tiên plaintext đã giải mã; trạng thái chờ/lỗi rõ ràng.
  const resolvedBody = decrypted.failed
    ? 'Không giải mã được'
    : decrypted.loading
      ? 'Đang giải mã…'
      : decrypted.text ?? message.contentPreview ?? '';

  if (message.isDeleted) {
    return <span className="text-[13.5px] italic opacity-70">Tin nhắn đã thu hồi</span>;
  }
  if (message.type === 'TEXT') {
    const body = resolvedBody;
    const textClass = 'block whitespace-pre-wrap break-words text-[13.5px] leading-relaxed';
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
      return <MentionText text={body} mentions={message.mentions} className={textClass} largeEmoji isMe={isMe} />;
    }
    return <EmojiText text={body} className={textClass} largeEmoji linkify />;
  }
  if (message.type === 'CALL') {
    return <CallMessageContent message={message} />;
  }
  if (message.type === 'CONTACT') {
    const contact = readContactCard(message);
    if (contact) return <ContactCardContent contact={contact} />;
  }
  if (message.type === 'REMINDER') return <ReminderCard message={message} />;
  if (message.type === 'CHECKLIST') return <ChecklistCard message={message} />;
  if (message.type === 'BOOKMARK') return <BookmarkCard message={message} />;
  if ((MEDIA_TYPES as readonly string[]).includes(message.type)) {
    // Caption media: dùng body đã giải mã (rỗng nếu tin media không caption).
    const caption = decrypted.text?.trim() || (message.encrypted ? '' : message.plaintext?.trim());
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
