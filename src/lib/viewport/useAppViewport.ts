'use client';

import { useEffect } from 'react';
import { MOBILE_MEDIA_QUERY } from './media';

function isTextEntry(element: EventTarget | null): boolean {
  if (element instanceof HTMLInputElement) {
    return !element.disabled
      && !element.readOnly
      && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(element.type);
  }
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  return element instanceof HTMLElement
    && (element.isContentEditable || element.getAttribute('contenteditable') === 'true');
}

/**
 * Chỉ phản ánh trạng thái focus để bỏ safe-area đáy khi đang nhập trên mobile.
 * Kích thước và vị trí app do trình duyệt + Framework7 quản lý; không đo hay dịch
 * visualViewport vì WebKit tự pan tới caret và các override đó gây giật khi gõ.
 */
export function useAppViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const mobile = window.matchMedia(MOBILE_MEDIA_QUERY);
    let focusOutFrame = 0;

    const close = () => root.removeAttribute('data-keyboard');
    const handleFocusIn = (event: FocusEvent) => {
      if (mobile.matches && isTextEntry(event.target)) {
        root.setAttribute('data-keyboard', 'open');
      }
    };
    const handleFocusOut = () => {
      if (focusOutFrame) window.cancelAnimationFrame(focusOutFrame);
      focusOutFrame = window.requestAnimationFrame(() => {
        focusOutFrame = 0;
        if (!mobile.matches || !isTextEntry(document.activeElement)) close();
      });
    };
    const handleMediaChange = () => {
      if (!mobile.matches) close();
    };

    if (mobile.matches && isTextEntry(document.activeElement)) {
      root.setAttribute('data-keyboard', 'open');
    }
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    mobile.addEventListener('change', handleMediaChange);

    return () => {
      if (focusOutFrame) window.cancelAnimationFrame(focusOutFrame);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      mobile.removeEventListener('change', handleMediaChange);
      close();
    };
  }, []);
}
