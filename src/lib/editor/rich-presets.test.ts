import { describe, expect, it } from 'vitest';
import {
  sanitizeLinkUrl,
  isColorKey,
  isFontKey,
  RICH_COLORS,
  RICH_FONTS,
} from './rich-presets';

describe('sanitizeLinkUrl', () => {
  it('giữ http/https/mailto', () => {
    expect(sanitizeLinkUrl('https://a.com')).toBe('https://a.com');
    expect(sanitizeLinkUrl('http://a.com')).toBe('http://a.com');
    expect(sanitizeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('tự thêm https:// cho URL không scheme', () => {
    expect(sanitizeLinkUrl('a.com')).toBe('https://a.com');
  });
  it('chặn javascript:/data:', () => {
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeLinkUrl('data:text/html,x')).toBeNull();
    expect(sanitizeLinkUrl('  JavaScript:alert(1)')).toBeNull();
  });
  it('chặn rỗng', () => {
    expect(sanitizeLinkUrl('')).toBeNull();
    expect(sanitizeLinkUrl('   ')).toBeNull();
  });
});

describe('whitelist', () => {
  it('isColorKey', () => {
    expect(isColorKey(RICH_COLORS[0].key)).toBe(true);
    expect(isColorKey('rgb(1,2,3)')).toBe(false);
  });
  it('isFontKey', () => {
    expect(isFontKey(RICH_FONTS[0].key)).toBe(true);
    expect(isFontKey('Comic Sans')).toBe(false);
  });
});
