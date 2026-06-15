import { isElectron } from '@/lib/electron';

export type DeviceType = 'WEB' | 'MOBILE' | 'DESKTOP';

/**
 * Loại thiết bị gửi cho auth backend (multi-device session). Cùng codebase chạy
 * 2 dạng: Electron (exe/deb) → DESKTOP, trình duyệt → WEB. App mobile riêng sẽ gửi MOBILE.
 */
export function getDeviceType(): DeviceType {
  return isElectron() ? 'DESKTOP' : 'WEB';
}

/**
 * Tên thiết bị hiển thị trong danh sách phiên ("Thiết bị đang đăng nhập").
 * Electron: "Halo Desktop · <os>". Web: parse trình duyệt + OS từ userAgent.
 * Best-effort, không bao giờ throw; trả undefined nếu không xác định (SSR/không có navigator).
 */
export function getDeviceName(): string | undefined {
  if (isElectron()) {
    const os = detectOsLabel();
    return os ? `Halo Desktop · ${os}` : 'Halo Desktop';
  }
  if (typeof navigator === 'undefined') return undefined;
  const browser = detectBrowserLabel(navigator.userAgent);
  const os = detectOsLabel();
  if (browser && os) return `${browser} trên ${os}`;
  return browser ?? os ?? undefined;
}

function detectBrowserLabel(ua: string): string | undefined {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return undefined;
}

function detectOsLabel(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/(iPhone|iPad|iPod)/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return undefined;
}
