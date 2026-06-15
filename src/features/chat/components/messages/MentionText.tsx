'use client';

import { Fragment, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import { UserProfileDialog } from '@/features/chat/components/contact/UserProfileDialog';
import type { Mention } from '@/features/chat/types';

type MentionTextProps = {
  text: string;
  mentions: Mention[];
  className?: string;
  largeEmoji?: boolean;
  isMe?: boolean;
};

/**
 * Render text có @mention: cắt theo các range mention, phần thường giữ
 * emoji/linkify qua EmojiText, phần mention thành chip bấm được → mở profile.
 */
export function MentionText({ text, mentions, className, largeEmoji, isMe }: MentionTextProps) {
  const [profileId, setProfileId] = useState<string | null>(null);

  // Lọc range hợp lệ + sắp xếp theo offset để cắt tuần tự.
  const ranges = mentions
    .filter((m) => m.startOffset >= 0 && m.length > 0 && m.startOffset + m.length <= text.length)
    .sort((a, b) => a.startOffset - b.startOffset);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((m, i) => {
    if (m.startOffset < cursor) return; // range chồng lấn → bỏ qua
    if (m.startOffset > cursor) {
      parts.push(
        <EmojiText
          key={`t-${cursor}`}
          text={text.slice(cursor, m.startOffset)}
          largeEmoji={largeEmoji}
          linkify
          className="inline"
        />,
      );
    }
    const label = text.slice(m.startOffset, m.startOffset + m.length);
    const chipClass = cn(
      'rounded px-0.5 font-medium',
      isMe ? 'text-primary-foreground' : 'text-primary',
    );
    // `@all` tag toàn nhóm → highlight tĩnh, không mở profile ai.
    if (label.toLowerCase() === '@all') {
      parts.push(
        <span key={`m-${i}`} className={chipClass}>
          {label}
        </span>,
      );
    } else {
      parts.push(
        <button
          key={`m-${i}`}
          type="button"
          onClick={() => setProfileId(m.userId)}
          className={cn(chipClass, 'hover:underline')}
        >
          {label}
        </button>,
      );
    }
    cursor = m.startOffset + m.length;
  });
  if (cursor < text.length) {
    parts.push(
      <EmojiText
        key={`t-${cursor}`}
        text={text.slice(cursor)}
        largeEmoji={largeEmoji}
        linkify
        className="inline"
      />,
    );
  }

  return (
    <>
      <span className={className}>
        {parts.map((part, i) => (
          <Fragment key={i}>{part}</Fragment>
        ))}
      </span>
      <UserProfileDialog
        open={profileId !== null}
        onOpenChange={(open) => !open && setProfileId(null)}
        userId={profileId}
      />
    </>
  );
}
