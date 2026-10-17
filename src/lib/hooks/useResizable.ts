'use client';

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { getJSON, setJSON } from '@/lib/storage/local-storage';

const KEYBOARD_STEP = 16;

export type UseResizableOptions = {
  storageKey: string;
  defaultSize: number;
  min: number;
  max: number;
  axis?: 'x' | 'y';
  /** Tay nắm ở cạnh trái/trên: kéo về phía âm làm kích thước tăng. */
  reverse?: boolean;
};

export type ResizeHandleProps = {
  role: 'separator';
  tabIndex: 0;
  'aria-orientation': 'vertical' | 'horizontal';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
};

type UseResizableResult = { size: number; isResizing: boolean; handleProps: ResizeHandleProps };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function readSize({ storageKey, defaultSize, min, max }: UseResizableOptions): number {
  const stored = getJSON<unknown>(storageKey, null);
  return typeof stored === 'number' && Number.isFinite(stored)
    ? clamp(stored, min, max)
    : defaultSize;
}

function keyDelta(key: string, axis: 'x' | 'y'): number | null {
  const [decrease, increase] = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
  if (key === decrease) return -KEYBOARD_STEP;
  if (key === increase) return KEYBOARD_STEP;
  return null;
}

/** Kéo đổi kích thước panel theo một trục, lưu vào localStorage. Chỉ dùng trong cây client. */
export function useResizable(options: UseResizableOptions): UseResizableResult {
  const { storageKey, defaultSize, min, max, axis = 'x', reverse = false } = options;
  const [size, setSize] = useState(() => readSize(options));
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ start: number; size: number } | null>(null);
  const sizeRef = useRef(size);
  const direction = reverse ? -1 : 1;

  const apply = useCallback((next: number, shouldSave: boolean) => {
    const value = clamp(next, min, max);
    sizeRef.current = value;
    setSize(value);
    if (shouldSave) setJSON(storageKey, value);
  }, [max, min, storageKey]);

  const pointerOf = (event: PointerEvent<HTMLElement>): number =>
    axis === 'x' ? event.clientX : event.clientY;

  const endDrag = (event: PointerEvent<HTMLElement>): void => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsResizing(false);
    setJSON(storageKey, sizeRef.current);
  };

  const handleProps: ResizeHandleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
    'aria-valuenow': size,
    'aria-valuemin': min,
    'aria-valuemax': max,
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = { start: pointerOf(event), size: sizeRef.current };
      setIsResizing(true);
    },
    onPointerMove: (event) => {
      const drag = dragRef.current;
      if (drag) apply(drag.size + (pointerOf(event) - drag.start) * direction, false);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown: (event) => {
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        apply(event.key === 'Home' ? min : max, true);
        return;
      }
      const delta = keyDelta(event.key, axis);
      if (delta === null) return;
      event.preventDefault();
      apply(sizeRef.current + delta * direction, true);
    },
    onDoubleClick: () => apply(defaultSize, true),
  };

  return { size, isResizing, handleProps };
}
