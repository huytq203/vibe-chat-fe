/**
 * Wrapper cầu nối Electron (preload `window.electronAPI`). Feature code KHÔNG đụng
 * `window.electronAPI` trực tiếp — luôn qua đây để dễ thay đổi/độc lập nền tảng.
 * Trên web (không phải app desktop) mọi hàm là no-op.
 */

type BadgePayload = { count: number; iconDataUrl: string | null };
type NotifyPayload = { title: string; body?: string };

type ElectronApi = {
  isElectron?: boolean;
  platform?: string;
  setBadge?: (payload: BadgePayload) => void;
  showNotification?: (payload: NotifyPayload) => void;
};

function getApi(): ElectronApi | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { electronAPI?: ElectronApi }).electronAPI;
  return api?.isElectron ? api : null;
}

/** App đang chạy trong Electron (exe/deb) thay vì trình duyệt. */
export function isElectron(): boolean {
  return getApi() !== null;
}

/** Cập nhật số badge trên taskbar/dock. iconDataUrl chỉ dùng cho overlay Windows. */
export function setElectronBadge(count: number, iconDataUrl: string | null): void {
  getApi()?.setBadge?.({ count, iconDataUrl });
}

/** Hiện thông báo hệ điều hành (native) — dùng khi app desktop chạy nền. */
export function showElectronNotification(payload: NotifyPayload): void {
  getApi()?.showNotification?.(payload);
}
