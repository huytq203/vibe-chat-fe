/** Breakpoint mobile dùng chung cho layout app (khớp `md` của Tailwind). */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/** Đọc một lần ngoài React (store, action) — SSR hoặc runtime không có matchMedia trả false. */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}
