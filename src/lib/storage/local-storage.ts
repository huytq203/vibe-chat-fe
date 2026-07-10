/**
 * Wrapper SSR-safe cho `window.localStorage`.
 *
 * Feature code KHÔNG gọi `localStorage` trực tiếp — đi qua wrapper này để:
 * - An toàn SSR (guard `typeof window`), không throw khi prerender.
 * - Chịu lỗi quota / private mode (try/catch), không làm vỡ UI.
 * - Đổi backend lưu trữ (sessionStorage, memory...) chỉ sửa 1 nơi.
 */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Đọc chuỗi thô. Trả null khi SSR / key không tồn tại / lỗi truy cập. */
export function getItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Ghi chuỗi thô. No-op khi SSR / lỗi quota. */
export function setItem(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // SSR / quota / private mode → bỏ qua
  }
}

/** Xoá 1 key. No-op khi SSR / lỗi. */
export function removeItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // bỏ qua
  }
}

/** Đọc & parse JSON. Trả `fallback` khi thiếu key hoặc parse lỗi. */
export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Stringify & ghi JSON. No-op khi SSR / lỗi stringify / quota. */
export function setJSON<T>(key: string, value: T): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {
    // stringify circular / quota → bỏ qua
  }
}
