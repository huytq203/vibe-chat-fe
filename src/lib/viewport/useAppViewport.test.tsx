import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppViewport } from './useAppViewport';

function mockMobile(matches = true) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: matches && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-keyboard');
  document.body.replaceChildren();
});

describe('useAppViewport', () => {
  it('chỉ đánh dấu keyboard theo focus và không ghi đè kích thước viewport', () => {
    mockMobile();
    const input = document.createElement('input');
    document.body.append(input);
    renderHook(() => useAppViewport());

    fireEvent.focusIn(input);
    expect(document.documentElement).toHaveAttribute('data-keyboard', 'open');
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--keyboard-viewport-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--keyboard-viewport-offset')).toBe('');
  });

  it('gỡ trạng thái keyboard sau khi người dùng focus ra ngoài', () => {
    mockMobile();
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      scheduledFrame = callback;
      return 1;
    });
    const input = document.createElement('input');
    const outside = document.createElement('button');
    document.body.append(input, outside);
    renderHook(() => useAppViewport());

    input.focus();
    fireEvent.focusIn(input);
    outside.focus();
    fireEvent.focusOut(input);
    act(() => scheduledFrame?.(0));

    expect(document.documentElement).not.toHaveAttribute('data-keyboard');
  });

  it('không áp dụng trạng thái keyboard trên desktop', () => {
    mockMobile(false);
    const input = document.createElement('input');
    document.body.append(input);
    renderHook(() => useAppViewport());

    fireEvent.focusIn(input);
    expect(document.documentElement).not.toHaveAttribute('data-keyboard');
  });

  it('không coi input không nhập chữ là bàn phím đang mở', () => {
    mockMobile();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    document.body.append(fileInput);
    renderHook(() => useAppViewport());

    fireEvent.focusIn(fileInput);
    expect(document.documentElement).not.toHaveAttribute('data-keyboard');
  });
});
