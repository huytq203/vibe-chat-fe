'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';

type ServiceWorkerUpdate = {
  waitingWorker: ServiceWorker | null;
  isUpdating: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
};

/**
 * Theo dõi worker mới của một registration.
 * Chỉ báo "có bản mới" khi đã có worker đang điều khiển trang — lần cài đầu tiên
 * không phải là cập nhật, và nhắc reload lúc đó chỉ làm user bối rối.
 */
function watchRegistration(
  registration: ServiceWorkerRegistration,
  onWaiting: (worker: ServiceWorker) => void,
): () => void {
  const promote = (worker: ServiceWorker | null): void => {
    if (worker && navigator.serviceWorker.controller) onWaiting(worker);
  };

  const onUpdateFound = (): void => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') promote(installing);
    });
  };

  // Tab mở nhiều ngày không tự kiểm tra bản mới → kiểm lại mỗi lần user quay lại.
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
  };

  promote(registration.waiting);
  registration.addEventListener('updatefound', onUpdateFound);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    registration.removeEventListener('updatefound', onUpdateFound);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Đăng ký `/sw.js` (chỉ ở production) và phát hiện bản build mới đang chờ kích hoạt. */
export function useServiceWorkerUpdate(enabled: boolean): ServiceWorkerUpdate {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const shouldReloadRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    const container = navigator.serviceWorker;
    let disposed = false;
    let stopWatching = (): void => {};

    const onControllerChange = (): void => {
      if (!shouldReloadRef.current) return;
      shouldReloadRef.current = false;
      window.location.reload();
    };

    // `?v=` đổi theo mỗi build → browser thấy script khác và cài lại worker.
    const register = (): void => {
      container
        .register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { scope: '/' })
        .then((registration) => {
          if (!disposed) stopWatching = watchRegistration(registration, setWaitingWorker);
        })
        .catch(() => {
          // Không HTTPS hoặc browser chặn SW → app vẫn chạy bình thường ở chế độ online.
        });
    };

    container.addEventListener('controllerchange', onControllerChange);
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      disposed = true;
      stopWatching();
      window.removeEventListener('load', register);
      container.removeEventListener('controllerchange', onControllerChange);
    };
  }, [enabled]);

  const applyUpdate = useCallback((): void => {
    if (!waitingWorker) return;
    setIsUpdating(true);
    shouldReloadRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  const dismissUpdate = useCallback((): void => setWaitingWorker(null), []);

  return { waitingWorker, isUpdating, applyUpdate, dismissUpdate };
}
