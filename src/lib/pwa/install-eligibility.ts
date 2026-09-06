/**
 * Điều kiện được phép mời cài PWA.
 *
 * Banner chỉ nên bung khi user đã thực sự dùng app, và một khi user đã đóng thì
 * đừng mời lại — lối vào thủ công vẫn nằm trong menu tài khoản.
 */
import { getItem, setItem } from '@/lib/storage/local-storage';

const DISMISSED_KEY = 'halo.pwa.install-dismissed';
/** Key cũ chỉ dành cho iOS — vẫn đọc để người từng tắt không bị mời lại. */
const LEGACY_IOS_DISMISSED_KEY = 'halo.pwa.ios-hint-dismissed';
const VISIT_COUNT_KEY = 'halo.pwa.visit-count';

/** Khách ghé một lần rồi đi không đáng bị mời cài. */
export const MIN_VISITS_BEFORE_BANNER = 2;
/** Chờ user dùng thật rồi mới mời, thay vì bung banner ngay lúc tải trang. */
export const BANNER_DELAY_MS = 45_000;

export function isInstallDismissed(): boolean {
  return getItem(DISMISSED_KEY) !== null || getItem(LEGACY_IOS_DISMISSED_KEY) !== null;
}

export function markInstallDismissed(): void {
  setItem(DISMISSED_KEY, '1');
}

/** Tăng số lần mở app và trả về giá trị mới. */
export function bumpVisitCount(): number {
  const stored = Number.parseInt(getItem(VISIT_COUNT_KEY) ?? '', 10);
  const next = (Number.isNaN(stored) ? 0 : stored) + 1;
  setItem(VISIT_COUNT_KEY, String(next));
  return next;
}

/** iOS/iPadOS: không có `beforeinstallprompt` nên phải tự chỉ chỗ nút Chia sẻ. */
export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { userAgent, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
