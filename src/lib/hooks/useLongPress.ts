'use client';

import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 350;
const DOUBLE_TAP_MS = 300;
const MOVE_TOLERANCE = 10;

type UseLongPressOptions = {
  /** Gọi khi nhấn giữ đủ lâu (chỉ với pointer cảm ứng/bút — bỏ qua chuột). */
  onLongPress: () => void;
  /** Gọi khi chạm 2 lần nhanh liên tiếp. */
  onDoubleTap?: () => void;
  /** Tắt toàn bộ gesture khi false. */
  enabled?: boolean;
};

export type LongPressHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onContextMenu: (e: React.SyntheticEvent) => void;
};

/**
 * Gesture nhấn-giữ + chạm-đôi cho thiết bị cảm ứng. Chuột bị bỏ qua (desktop dùng
 * hover). Huỷ khi ngón tay di chuyển quá ngưỡng (đang cuộn) để không kích nhầm.
 */
export function useLongPress({
  onLongPress,
  onDoubleTap,
  enabled = true,
}: UseLongPressOptions): LongPressHandlers {
  const timer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const firedLong = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.pointerType === 'mouse') return;
      firedLong.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        firedLong.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startPos.current;
      if (!start) return;
      if (
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE
      ) {
        clear();
      }
    },
    [clear],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.pointerType === 'mouse') return;
      clear();
      startPos.current = null;
      if (firedLong.current) return;
      if (!onDoubleTap) return;
      if (e.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
        onDoubleTap();
        lastTap.current = 0;
      } else {
        lastTap.current = e.timeStamp;
      }
    },
    [enabled, onDoubleTap, clear],
  );

  const onPointerCancel = useCallback(() => {
    clear();
    startPos.current = null;
  }, [clear]);

  const onContextMenu = useCallback(
    (e: React.SyntheticEvent) => {
      if (enabled) e.preventDefault();
    },
    [enabled],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu };
}
