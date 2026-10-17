import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useResizable } from '@/lib/hooks/useResizable';
import { ResizeHandle } from './ResizeHandle';

function Panel() {
  const { size, isResizing, handleProps } = useResizable({
    storageKey: 'resize-handle-test', defaultSize: 340, min: 300, max: 640, reverse: true,
  });
  return (
    <div style={{ width: size }} data-testid="panel">
      <ResizeHandle handleProps={handleProps} isResizing={isResizing} edge="left" label="Đổi độ rộng" />
    </div>
  );
}

describe('ResizeHandle', () => {
  beforeEach(() => window.localStorage.clear());

  it('là separator có nhãn, dùng được bằng bàn phím', () => {
    render(<Panel />);
    const handle = screen.getByRole('separator', { name: 'Đổi độ rộng' });

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });

    expect(screen.getByTestId('panel')).toHaveStyle({ width: '356px' });
    expect(handle).toHaveAttribute('aria-valuenow', '356');
  });

  it('không dùng thuộc tính title để tránh tooltip gốc của trình duyệt che nội dung', () => {
    render(<Panel />);

    expect(screen.getByRole('separator')).not.toHaveAttribute('title');
  });

  it('đánh dấu data-resizing khi đang kéo', () => {
    render(<Panel />);
    const handle = screen.getByRole('separator');

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    expect(handle).toHaveAttribute('data-resizing', 'true');
    fireEvent.pointerUp(handle, { clientX: 100, pointerId: 1 });
    expect(handle).not.toHaveAttribute('data-resizing');
  });
});
