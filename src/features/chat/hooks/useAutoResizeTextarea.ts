'use client';

import { useCallback, useMemo, useRef } from 'react';

export function useAutoResizeTextarea() {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const focusInput = useCallback(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      onSend: () => void,
      isLocked: boolean,
    ) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLocked) onSend();
      }
    },
    [],
  );

  return useMemo(
    () => ({ ref, resize, focusInput, handleKeyDown }),
    [ref, resize, focusInput, handleKeyDown],
  );
}
