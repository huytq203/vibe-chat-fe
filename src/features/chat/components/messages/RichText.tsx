'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { UserProfileDialog } from '@/features/chat/components/contact/UserProfileDialog';
import { buildInlineSegments, type SegmentOptions } from './rich-text-segments';
import type { Mention, RichBlock, RichText as RichTextData } from '@/features/chat/types';

type RichTextProps = {
  text: string;
  mentions: Mention[];
  richText: RichTextData;
  className?: string;
  largeEmoji?: boolean;
  isMe?: boolean;
};

/** Block căn lề khác 'left' phủ [s,e) hợp lệ trong text. */
function alignBlockAt(blocks: RichBlock[], s: number, len: number): RichBlock | undefined {
  return blocks.find(
    (b) => b.start === s && b.align !== 'left' && b.start < b.end && b.end <= len,
  );
}

/** Chia text thành các top-level range theo block boundary, build inline + wrap căn lề. */
function buildBlocks(
  text: string,
  blocks: RichBlock[],
  segOpts: SegmentOptions,
): ReactNode[] {
  const len = text.length;
  const parts: ReactNode[] = [];
  let cursor = 0;
  while (cursor < len) {
    const block = alignBlockAt(blocks, cursor, len);
    if (block) {
      const inner = buildInlineSegments(segOpts, cursor, block.end);
      parts.push(
        <span key={`b-${cursor}`} style={{ display: 'block', textAlign: block.align }}>
          {inner}
        </span>,
      );
      cursor = block.end;
      continue;
    }
    // Tới block căn lề kế tiếp (nếu có) làm boundary cho đoạn inline thường.
    let next = len;
    for (const b of blocks) {
      if (b.align !== 'left' && b.start > cursor && b.start < next && b.start < b.end) {
        next = b.start;
      }
    }
    parts.push(...buildInlineSegments(segOpts, cursor, next));
    cursor = next;
  }
  return parts;
}

/**
 * Render text có rich formatting + mention + căn lề block.
 * Mention chip atomic & bấm được (mở profile), `@all` tĩnh; đoạn thường qua EmojiText.
 */
export function RichText({ text, mentions, richText, className, largeEmoji, isMe }: RichTextProps) {
  const [profileId, setProfileId] = useState<string | null>(null);

  const parts = useMemo<ReactNode[]>(() => {
    const segOpts: SegmentOptions = {
      text,
      mentions,
      marks: richText.marks,
      largeEmoji,
      isMe,
      onMentionClick: setProfileId,
    };
    return buildBlocks(text, richText.blocks, segOpts);
  }, [text, mentions, richText, isMe, largeEmoji]);

  return (
    <>
      <span className={className}>{parts}</span>
      <UserProfileDialog
        open={profileId !== null}
        onOpenChange={(open) => !open && setProfileId(null)}
        userId={profileId}
      />
    </>
  );
}
