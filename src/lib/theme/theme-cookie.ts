/**
 * Theme được nhớ ở cookie (ngoài localStorage) để server đọc được ở layout và render sẵn
 * đúng màu trong HTML đầu tiên. localStorage thì server không thấy → trang luôn vẽ theme
 * mặc định rồi mới đổi, gây nháy sáng/tối.
 */
export const THEME_COOKIE = 'ui-theme';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function writeThemeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(name)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
