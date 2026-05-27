'use client';

import { type TwemojiEntity } from 'twemoji-parser';
import { parseEmoji } from '@/lib/utils/emoji';

function isEmojiOnly(text: string, tokens: TwemojiEntity[]): boolean {
  if (tokens.length === 0) return false;
  let rest = text;
  for (const t of [...tokens].reverse()) {
    rest = rest.slice(0, t.indices[0]) + rest.slice(t.indices[1]);
  }
  return rest.trim() === '';
}

const IMG_SIZE = {
  normal: 'h-[1.4em] w-[1.4em] align-[-0.2em]',
  lg:     'h-[1.8em] w-[1.8em] align-[-0.3em]',
  xl:     'h-[2.5em] w-[2.5em] align-[-0.4em]',
  '2xl':  'h-[3em]   w-[3em]   align-[-0.5em]',
} as const;

type EmojiTextProps = {
  text: string;
  className?: string;
  /** Enlarge emoji when the entire message is emoji-only (1–5 emojis). */
  largeEmoji?: boolean;
};

export function EmojiText({ text, className, largeEmoji = false }: EmojiTextProps) {
  if (!text) return <span className={className} />;

  const tokens = parseEmoji(text);
  if (tokens.length === 0) return <span className={className}>{text}</span>;

  let imgClass: string = IMG_SIZE.normal;
  if (largeEmoji && isEmojiOnly(text, tokens)) {
    const n = tokens.length;
    imgClass = n === 1 ? IMG_SIZE['2xl'] : n <= 3 ? IMG_SIZE.xl : n <= 5 ? IMG_SIZE.lg : IMG_SIZE.normal;
  }

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((token, i) => {
    if (token.indices[0] > lastIndex) {
      segments.push(text.slice(lastIndex, token.indices[0]));
    }
    segments.push(
      <img
        key={i}
        src={token.url}
        alt={token.text}
        title={token.text}
        className={`inline-block ${imgClass}`}
        loading="lazy"
        draggable={false}
      />
    );
    lastIndex = token.indices[1];
  });

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return <span className={className}>{segments}</span>;
}
