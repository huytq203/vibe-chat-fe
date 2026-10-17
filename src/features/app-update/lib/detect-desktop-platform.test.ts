import { describe, expect, it } from 'vitest';
import { detectDesktopPlatform } from './detect-desktop-platform';

describe('detectDesktopPlatform', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', 'win32'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', 'darwin'],
    ['Mozilla/5.0 (X11; Linux x86_64) Firefox/130', 'linux'],
  ])('nên nhận ra %s', (ua, expected) => {
    expect(detectDesktopPlatform(ua)).toBe(expected);
  });

  it('nên trả null cho điện thoại và User-Agent lạ', () => {
    expect(detectDesktopPlatform('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile')).toBeNull();
    expect(detectDesktopPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari')).toBeNull();
    expect(detectDesktopPlatform('')).toBeNull();
  });
});
