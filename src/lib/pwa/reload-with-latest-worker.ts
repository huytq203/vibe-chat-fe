// Worker mới không phản hồi (bị browser treo) thì vẫn phải reload, không kẹt nút "Tải lại".
const ACTIVATE_TIMEOUT_MS = 3000;

/**
 * Kích hoạt service worker đang chờ (nếu có) rồi tải lại trang.
 *
 * Reload thường KHÔNG thay worker cũ ở PWA chỉ có 1 tab: trang mới bắt đầu trước khi
 * trang cũ đóng nên browser coi worker cũ vẫn đang được dùng.
 */
export async function reloadWithLatestWorker(): Promise<void> {
  const reload = (): void => window.location.reload();
  if (!('serviceWorker' in navigator)) return reload();

  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  const waiting = registration?.waiting;
  if (!waiting) return reload();

  const timer = window.setTimeout(reload, ACTIVATE_TIMEOUT_MS);
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      window.clearTimeout(timer);
      reload();
    },
    { once: true },
  );
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
