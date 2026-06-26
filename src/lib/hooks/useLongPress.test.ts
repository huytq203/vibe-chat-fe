import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLongPress } from './useLongPress';

type PointerLike = Partial<React.PointerEvent> & { pointerType: string };

function down(over: PointerLike): React.PointerEvent {
  return { clientX: 0, clientY: 0, ...over } as React.PointerEvent;
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('kích long-press sau khi giữ đủ lâu (pointer cảm ứng)', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));
    result.current.onPointerDown(down({ pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it('bỏ qua chuột để desktop dùng hover', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));
    result.current.onPointerDown(down({ pointerType: 'mouse' }));
    vi.advanceTimersByTime(400);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('huỷ long-press khi ngón tay di chuyển quá ngưỡng (đang cuộn)', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));
    result.current.onPointerDown(down({ pointerType: 'touch' }));
    result.current.onPointerMove(down({ pointerType: 'touch', clientX: 50, clientY: 50 }));
    vi.advanceTimersByTime(400);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('double-tap kích onDoubleTap khi 2 lần chạm nhanh', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress: vi.fn(), onDoubleTap }),
    );
    result.current.onPointerUp(down({ pointerType: 'touch', timeStamp: 100 }));
    result.current.onPointerUp(down({ pointerType: 'touch', timeStamp: 300 }));
    expect(onDoubleTap).toHaveBeenCalledOnce();
  });

  it('không kích khi enabled=false', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, enabled: false }),
    );
    result.current.onPointerDown(down({ pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
