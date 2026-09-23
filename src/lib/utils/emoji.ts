import { parse, type TwemojiEntity } from 'twemoji-parser';

const NOTO_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-google@16.0.0/img/google/64';

export function notoUrl(codepoints: string): string {
  return `${NOTO_CDN}/${codepoints.toLowerCase()}.png`;
}

export function parseEmoji(text: string): TwemojiEntity[] {
  return parse(text, { assetType: 'png', buildUrl: notoUrl }).map((token) => ({
    ...token,
    url: notoUrl(
      Array.from(token.text)
        .map((character) => character.codePointAt(0)!.toString(16))
        .join('-'),
    ),
  }));
}

/** Get the Noto image URL for a single emoji character. Returns '' if not recognized. */
export function emojiToUrl(emoji: string): string {
  return parseEmoji(emoji)[0]?.url ?? '';
}
