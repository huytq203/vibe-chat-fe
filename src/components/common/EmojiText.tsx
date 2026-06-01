'use client';

import { type TwemojiEntity } from 'twemoji-parser';
import { parseEmoji } from '@/lib/utils/emoji';
import { createUrlRegex, normalizeUrl } from '@/lib/utils/url';

/** Tách 1 đoạn text thành các node: phần URL → <a> clickable, còn lại giữ text. */
function linkify(slice: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = createUrlRegex();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null) {
    if (m.index > last) out.push(slice.slice(last, m.index));
    out.push(
      <a
        key={`${keyBase}-${m.index}`}
        href={normalizeUrl(m[0])}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2 hover:opacity-80"
      >
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < slice.length) out.push(slice.slice(last));
  return out;
}

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
  /** Biến URL trong text thành link clickable. */
  linkify?: boolean;
};

export function EmojiText({ text, className, largeEmoji = false, linkify: enableLinks = false }: EmojiTextProps) {
  if (!text) return <span className={className} />;

  const renderText = (slice: string, keyBase: string): React.ReactNode =>
    enableLinks ? linkify(slice, keyBase) : slice;

  const tokens = parseEmoji(text);
  if (tokens.length === 0) return <span className={className}>{renderText(text, 't')}</span>;

  let imgClass: string = IMG_SIZE.normal;
  if (largeEmoji && isEmojiOnly(text, tokens)) {
    const n = tokens.length;
    imgClass = n === 1 ? IMG_SIZE['2xl'] : n <= 3 ? IMG_SIZE.xl : n <= 5 ? IMG_SIZE.lg : IMG_SIZE.normal;
  }

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((token, i) => {
    if (token.indices[0] > lastIndex) {
      segments.push(renderText(text.slice(lastIndex, token.indices[0]), `s${i}`));
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
    segments.push(renderText(text.slice(lastIndex), 'tail'));
  }

  return <span className={className}>{segments}</span>;
}
