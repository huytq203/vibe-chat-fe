import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_NAME, buildThemeCss, getDefaultBackgroundImage, getDefaultTheme, resolveTheme, themes } from './themes';

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

describe('getDefaultTheme', () => {
  it('trả về theme Blue khi người dùng chưa chọn', () => {
    expect(DEFAULT_THEME_NAME).toBe('blue');
    expect(getDefaultTheme().name).toBe('blue');
    expect(getDefaultTheme().colors.primary).toBe('#2563eb');
  });

  it('rơi về theme đầu danh sách khi danh sách không có Blue', () => {
    const withoutBlue = themes.filter((t) => t.name !== 'blue');
    expect(getDefaultTheme(withoutBlue)).toBe(withoutBlue[0]);
  });
});

describe('resolveTheme / buildThemeCss', () => {
  it('nên dùng theme mặc định khi tên thiếu hoặc không hợp lệ', () => {
    expect(resolveTheme(undefined).name).toBe('blue');
    expect(resolveTheme('khong-co').name).toBe('blue');
    expect(resolveTheme('indigo').name).toBe('indigo');
  });

  it('nên sinh CSS đúng màu primary của theme để server vẽ sẵn', () => {
    const css = buildThemeCss(resolveTheme('blue'));
    expect(css).toContain('--primary: #2563eb;');
    expect(css).toContain('--brand-mark-filter: none;');
  });

  it('nên đảo độ sáng logo ở theme tối', () => {
    const dark = themes.find((t) => t.isDark);
    if (!dark) throw new Error('Không tìm thấy theme tối');
    expect(buildThemeCss(dark)).toContain('--brand-mark-filter: invert(1)');
  });
});
