'use client';

import { useEffect } from 'react';
import { isStandaloneApp } from '@/lib/pwa/display-mode';
import { MOBILE_MEDIA_QUERY } from './media';

const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Đặt chiều cao khung app (`--app-height` trên <html>) theo đúng vùng đang nhìn thấy.
 *
 * Ba tình huống khác nhau, không cái nào dùng chung công thức được:
 * - Bàn phím ảo mở → co theo `visualViewport` + cờ `data-keyboard` (safe-area đáy = 0).
 * - Chạy trong trình duyệt → cũng bám `visualViewport`, vì thanh công cụ Safari ăn mất
 *   một phần dưới mà `100dvh` cập nhật không kịp.
 * - PWA standalone → gỡ biến, để CSS dùng `100lvh`; fixed containing block và
 *   `visualViewport.height` trên iOS đều có thể hụt vùng home indicator.
 */
export function useAppViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    const mobile = window.matchMedia(MOBILE_MEDIA_QUERY);
    let frame = 0;

    const reset = () => {
      root.style.removeProperty('--app-height');
      root.removeAttribute('data-keyboard');
    };

    const clearAll = () => {
      reset();
    };

    const apply = () => {
      frame = 0;
      if (!mobile.matches) {
        clearAll();
        return;
      }
      const height = Math.round(viewport.height);
      const keyboardOpen = window.innerHeight - height > KEYBOARD_THRESHOLD_PX;

      if (!keyboardOpen && isStandaloneApp()) {
        reset();
        return;
      }

      root.style.setProperty('--app-height', `${height}px`);
      if (keyboardOpen) {
        root.setAttribute('data-keyboard', 'open');
        // iOS đẩy cả layout viewport lên khi mở bàn phím → kéo về 0 để app không lệch.
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      } else {
        root.removeAttribute('data-keyboard');
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('orientationchange', schedule);
    mobile.addEventListener('change', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('orientationchange', schedule);
      mobile.removeEventListener('change', schedule);
      clearAll();
    };
  }, []);
}
