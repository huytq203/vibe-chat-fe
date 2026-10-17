import type { DesktopPlatform } from '@/lib/version/update-manifest';

/** Hệ điều hành máy tính của người đang xem web; điện thoại và OS lạ trả null (không có bộ cài). */
export function detectDesktopPlatform(userAgent: string): DesktopPlatform | null {
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return null;
  if (/Windows/i.test(userAgent)) return 'win32';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'darwin';
  if (/Linux|X11/i.test(userAgent)) return 'linux';
  return null;
}
