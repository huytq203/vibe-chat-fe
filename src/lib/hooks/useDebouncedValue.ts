'use client';

import { useEffect, useState } from 'react';

/** Trả về `value` sau khi ngừng thay đổi `delay`ms — tránh spam (vd request search). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
