'use client';

import { useEffect } from 'react';

/**
 * Safari iOS và một số WebView vẫn phát gesture riêng dù viewport đã khóa scale.
 * Chặn ở document để pinch không lọt qua các vùng editor, ảnh hoặc wallpaper.
 */
export function useDisablePageZoom(): void {
  useEffect(() => {
    const preventGesture = (event: Event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('touchmove', preventMultiTouch, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('touchmove', preventMultiTouch);
    };
  }, []);
}
