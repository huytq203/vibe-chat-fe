/** App đang chạy dạng đã cài (PWA standalone) — iOS dùng cờ riêng `navigator.standalone`. */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}
