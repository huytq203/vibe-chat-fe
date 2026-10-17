/**
 * Mở link tải bộ cài. Trong Electron, `window.open` bị main process chặn và chuyển
 * sang trình duyệt mặc định của OS (setWindowOpenHandler → shell.openExternal).
 */
export function openDownloadPage(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
