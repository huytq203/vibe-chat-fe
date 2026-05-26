import { parse, type TwemojiEntity } from 'twemoji-parser';

const NOTO_CDN = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/png/512';

export function notoUrl(codepoints: string): string {
  return `${NOTO_CDN}/emoji_u${codepoints.replace(/-/g, '_')}.png`;
}

export function parseEmoji(text: string): TwemojiEntity[] {
  return parse(text, { assetType: 'png', buildUrl: notoUrl });
}

/** Get the Noto image URL for a single emoji character. Returns '' if not recognized. */
export function emojiToUrl(emoji: string): string {
  return parseEmoji(emoji)[0]?.url ?? '';
}
