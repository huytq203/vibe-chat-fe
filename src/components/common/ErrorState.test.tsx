import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './ErrorState';

describe('Trạng thái lỗi ErrorState', () => {
  it('hiển thị thông điệp mặc định thân thiện', () => {
    render(<ErrorState />);

    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument();
  });

  it('gọi hàm thử lại khi người dùng bấm nút', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('không hiển thị nút thử lại khi không có hàm thử lại', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
  });
});
