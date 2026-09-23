import { describe, expect, it } from 'vitest';
import { emojiToUrl } from './emoji';
import { QUICK_REACTIONS, REACTION_EMOJI } from '@/features/chat/reactions';

describe('emojiToUrl', () => {
  it.each(QUICK_REACTIONS.map((reaction) => [reaction, REACTION_EMOJI[reaction]] as const))(
    'uses a pinned 64px Google emoji image for %s',
    (_reaction, emoji) => {
      expect(emojiToUrl(emoji)).toMatch(
        /^https:\/\/cdn\.jsdelivr\.net\/npm\/emoji-datasource-google@16\.0\.0\/img\/google\/64\/[0-9a-f-]+\.png$/,
      );
    },
  );

  it.each([
    ['❤️', '2764-fe0f'],
    ['👍🏽', '1f44d-1f3fd'],
    ['👨‍💻', '1f468-200d-1f4bb'],
  ])('preserves the package filename for %s', (emoji, filename) => {
    expect(emojiToUrl(emoji)).toBe(
      `https://cdn.jsdelivr.net/npm/emoji-datasource-google@16.0.0/img/google/64/${filename}.png`,
    );
  });
});
