import { describe, expect, it } from 'vitest';
import { getDefaultBackgroundImage, themes } from './themes';

describe('getDefaultBackgroundImage', () => {
  it('trả về background-2.webp cho theme tối', () => {
    const darkTheme = themes.find((t) => t.isDark);
    if (!darkTheme) throw new Error('Không tìm thấy theme tối trong danh sách themes');
    expect(getDefaultBackgroundImage(darkTheme)).toBe('/asset/background-2.webp');
  });

  it('trả về banner.png cho theme sáng', () => {
    const lightTheme = themes.find((t) => !t.isDark);
    if (!lightTheme) throw new Error('Không tìm thấy theme sáng trong danh sách themes');
    expect(getDefaultBackgroundImage(lightTheme)).toBe('/asset/banner.png');
  });
});
