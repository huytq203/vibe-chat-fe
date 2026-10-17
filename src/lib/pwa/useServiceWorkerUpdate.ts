'use client';

import { useEffect } from 'react';
import { BUILD_ID } from '@/lib/version/app-version';

/** Mỗi lần user quay lại tab: hỏi browser có sw.js mới không (tab mở nhiều ngày). */
function watchRegistration(registration: ServiceWorkerRegistration): () => void {
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}

/**
 * Đăng ký `/sw.js` (chỉ ở production).
 *
 * KHÔNG còn báo "có bản mới" theo worker: BUILD_ID đổi theo mỗi commit nên lần deploy
 * nào cũng sinh worker mới, và khi banner hiện thì HTML (tải từ mạng) đã là bản mới rồi
 * → user bị nhắc liên tục vô ích. Việc báo bản mới chuyển sang `features/app-update`
 * và chỉ dựa trên semver; worker đang chờ được kích hoạt khi user bấm "Tải lại".
 */
export function useServiceWorkerUpdate(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    let disposed = false;
    let stopWatching = (): void => {};

    // `?v=` đổi theo mỗi build → browser thấy script khác và cài lại worker.
    const register = (): void => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { scope: '/' })
        .then((registration) => {
          if (!disposed) stopWatching = watchRegistration(registration);
        })
        .catch(() => {
          // Không HTTPS hoặc browser chặn SW → app vẫn chạy bình thường ở chế độ online.
        });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      disposed = true;
      stopWatching();
      window.removeEventListener('load', register);
    };
  }, [enabled]);
}
