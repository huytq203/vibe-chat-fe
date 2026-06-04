'use client';

import { useSyncExternalStore } from 'react';

const query = '(max-width: 767px)';

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

/** true khi viewport width < 768px (Tailwind md breakpoint). SSR-safe: mặc định false. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
