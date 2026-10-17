import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useResizable, type UseResizableOptions } from './useResizable';

const KEY = 'test-panel-width';
const base: UseResizableOptions = { storageKey: KEY, defaultSize: 340, min: 300, max: 640 };

function Harness(options: UseResizableOptions) {
  const { size, isResizing, handleProps } = useResizable(options);
  return (
    <div>
      <div data-testid="handle" {...handleProps} />
      <output data-testid="size">{size}</output>
      <output data-testid="resizing">{String(isResizing)}</output>
    </div>
  );
}

function sizeText(): string {
  return screen.getByTestId('size').textContent ?? '';
}

describe('useResizable', () => {
  beforeEach(() => window.localStorage.clear());

  it('dùng kích thước mặc định khi chưa lưu', () => {
    const { result } = renderHook(() => useResizable(base));
    expect(result.current.size).toBe(340);
  });

  it('đọc kích thước đã lưu và chặn trong min/max', () => {
    window.localStorage.setItem(KEY, '9999');
    const { result } = renderHook(() => useResizable(base));
    expect(result.current.size).toBe(640);
  });

  it('bỏ qua giá trị lưu hỏng', () => {
    window.localStorage.setItem(KEY, '"abc"');
    const { result } = renderHook(() => useResizable(base));
    expect(result.current.size).toBe(340);
  });

  it('kéo cạnh trái sang trái làm panel rộng ra (reverse) và lưu khi thả', () => {
    render(<Harness {...base} reverse />);
    const handle = screen.getByTestId('handle');

    fireEvent.pointerDown(handle, { button: 0, clientX: 500, pointerId: 1 });
    expect(screen.getByTestId('resizing').textContent).toBe('true');
    fireEvent.pointerMove(handle, { clientX: 400, pointerId: 1 });
    expect(sizeText()).toBe('440');
    fireEvent.pointerUp(handle, { clientX: 400, pointerId: 1 });

    expect(screen.getByTestId('resizing').textContent).toBe('false');
    expect(window.localStorage.getItem(KEY)).toBe('440');
  });

  it('không vượt quá giới hạn khi kéo', () => {
    render(<Harness {...base} reverse />);
    const handle = screen.getByTestId('handle');

    fireEvent.pointerDown(handle, { button: 0, clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 1500, pointerId: 1 });
    expect(sizeText()).toBe('300');
  });

  it('trục y: kéo cạnh trên lên làm cao thêm', () => {
    render(<Harness {...base} axis="y" reverse />);
    const handle = screen.getByTestId('handle');

    fireEvent.pointerDown(handle, { button: 0, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 450, pointerId: 1 });
    expect(sizeText()).toBe('390');
  });

  it('bỏ qua chuột phải', () => {
    render(<Harness {...base} />);
    fireEvent.pointerDown(screen.getByTestId('handle'), { button: 2, clientX: 500 });
    expect(screen.getByTestId('resizing').textContent).toBe('false');
  });

  it('phím mũi tên đổi kích thước theo hướng của cạnh, Home/End về min/max', () => {
    render(<Harness {...base} reverse />);
    const handle = screen.getByTestId('handle');

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(sizeText()).toBe('356');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(sizeText()).toBe('324');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(sizeText()).toBe('640');
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(sizeText()).toBe('300');
    expect(window.localStorage.getItem(KEY)).toBe('300');
  });

  it('double-click trả về kích thước mặc định', () => {
    window.localStorage.setItem(KEY, '500');
    render(<Harness {...base} />);

    act(() => { fireEvent.doubleClick(screen.getByTestId('handle')); });
    expect(sizeText()).toBe('340');
    expect(window.localStorage.getItem(KEY)).toBe('340');
  });

  it('có thuộc tính a11y của separator', () => {
    render(<Harness {...base} />);
    const handle = screen.getByTestId('handle');

    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuenow', '340');
    expect(handle).toHaveAttribute('aria-valuemin', '300');
    expect(handle).toHaveAttribute('aria-valuemax', '640');
    expect(handle).toHaveAttribute('tabindex', '0');
  });
});
