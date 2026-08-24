import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('Trạng thái rỗng EmptyState', () => {
  it('hiển thị tiêu đề', () => {
    render(<EmptyState icon={<span aria-hidden="true">Ghi chú</span>} title="Chưa có trang" />);

    expect(screen.getByText('Chưa có trang')).toBeInTheDocument();
  });

  it('hiển thị gợi ý khi có nội dung gợi ý', () => {
    render(
      <EmptyState
        hint="Các trang của bạn sẽ xuất hiện tại đây"
        icon={<span aria-hidden="true">Ghi chú</span>}
        title="Chưa có trang"
      />
    );

    expect(screen.getByText('Các trang của bạn sẽ xuất hiện tại đây')).toBeInTheDocument();
  });

  it('không hiển thị phần tử gợi ý khi không có nội dung gợi ý', () => {
    render(<EmptyState icon={<span aria-hidden="true">Ghi chú</span>} title="Chưa có trang" />);

    expect(screen.queryByText('Các trang của bạn sẽ xuất hiện tại đây')).toBeNull();
  });

  it('hiển thị hành động khi có nội dung hành động', () => {
    render(
      <EmptyState
        action={<button type="button">Tạo trang đầu tiên</button>}
        icon={<span aria-hidden="true">Ghi chú</span>}
        title="Chưa có trang"
      />
    );

    expect(screen.getByRole('button', { name: 'Tạo trang đầu tiên' })).toBeInTheDocument();
  });
});
