import { Fragment, type CSSProperties, type ReactNode, createElement } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import { colorCssVar, fontCssFamily, sanitizeLinkUrl } from '@/lib/editor/rich-presets';
import type { Mention, RichMark } from '@/features/chat/types';

/** Marks phủ toàn bộ [s,e). */
function marksCovering(marks: RichMark[], s: number, e: number): RichMark[] {
  return marks.filter((m) => m.start <= s && m.end >= e && m.start < m.end);
}

/** Áp style inline từ tập marks lên 1 đoạn text/children. */
function applyMarks(marks: RichMark[], key: string, children: ReactNode): ReactNode {
  let node = children;
  const style: CSSProperties = {};
  let linkUrl: string | null = null;

  for (const m of marks) {
    if (m.type === 'bold') node = createElement('strong', null, node);
    else if (m.type === 'italic') node = createElement('em', null, node);
    else if (m.type === 'underline') node = createElement('u', null, node);
    else if (m.type === 'strike') node = createElement('s', null, node);
    else if (m.type === 'color' && m.value) style.color = colorCssVar(m.value);
    else if (m.type === 'highlight' && m.value) style.backgroundColor = colorCssVar(m.value);
    else if (m.type === 'font' && m.value) style.fontFamily = fontCssFamily(m.value);
    else if (m.type === 'link' && m.value) linkUrl = sanitizeLinkUrl(m.value);
  }

  const hasStyle = Object.keys(style).length > 0;
  if (linkUrl) {
    return createElement(
      'a',
      {
        key,
        href: linkUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: hasStyle ? style : undefined,
        className: 'underline underline-offset-2 hover:opacity-80',
      },
      node,
    );
  }
  if (hasStyle) {
    return createElement('span', { key, style }, node);
  }
  return createElement(Fragment, { key }, node);
}

export type SegmentOptions = {
  text: string;
  /** Toàn bộ mentions (đã có startOffset/length theo plaintext). */
  mentions: Mention[];
  marks: RichMark[];
  largeEmoji?: boolean;
  isMe?: boolean;
  /** Mở profile khi bấm vào mention chip. */
  onMentionClick: (userId: string) => void;
};

/**
 * Sinh inline nodes cho khoảng [from, to) của plaintext.
 * Mention thắng marks: 1 chip atomic dù mark boundary rơi vào trong mention.
 * Mark inline trong vùng mention bị bỏ qua (giống MentionText).
 */
export function buildInlineSegments(opts: SegmentOptions, from: number, to: number): ReactNode[] {
  const { text, mentions, marks, largeEmoji, isMe, onMentionClick } = opts;
  const chipClass = cn('rounded px-0.5 font-medium', isMe ? 'text-primary-foreground' : 'text-primary');
  const mentionAt = (s: number): Mention | undefined =>
    mentions.find((m) => m.startOffset === s && m.length > 0 && m.startOffset + m.length <= text.length);

  const parts: ReactNode[] = [];
  let cursor = from;
  while (cursor < to) {
    const mention = mentionAt(cursor);
    if (mention && mention.startOffset + mention.length <= to) {
      const end = mention.startOffset + mention.length;
      const label = text.slice(cursor, end);
      if (label.toLowerCase() === '@all') {
        parts.push(
          createElement('span', { key: `mn-${cursor}`, className: chipClass }, label),
        );
      } else {
        parts.push(
          createElement(
            'button',
            {
              key: `mn-${cursor}`,
              type: 'button',
              onClick: () => onMentionClick(mention.userId),
              className: cn(chipClass, 'hover:underline'),
            },
            label,
          ),
        );
      }
      cursor = end;
      continue;
    }

    // Boundary kế tiếp > cursor trong [cursor, to).
    let next = to;
    const consider = (b: number) => {
      if (b > cursor && b < next) next = b;
    };
    for (const m of marks) {
      if (m.start < m.end) {
        consider(m.start);
        consider(m.end);
      }
    }
    for (const m of mentions) {
      if (m.length > 0) consider(m.startOffset);
    }

    const slice = text.slice(cursor, next);
    const covering = marksCovering(marks, cursor, next);
    const hasLink = covering.some((m) => m.type === 'link');
    const inner = createElement(EmojiText, {
      text: slice,
      largeEmoji,
      linkify: !hasLink,
      className: 'inline',
    });
    if (covering.length === 0) {
      parts.push(createElement(Fragment, { key: `p-${cursor}` }, inner));
    } else {
      parts.push(applyMarks(covering, `p-${cursor}`, inner));
    }
    cursor = next;
  }
  return parts;
}
