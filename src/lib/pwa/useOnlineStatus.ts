'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Trạng thái kết nối của browser.
 * Snapshot phía server luôn `true` để markup SSR và client khớp nhau.
 */
export function useOnlineStatus(enabled: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => undefined;
      window.addEventListener('online', onChange);
      window.addEventListener('offline', onChange);
      return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
      };
    },
    [enabled],
  );

  const getSnapshot = useCallback(() => (enabled ? navigator.onLine : true), [enabled]);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
