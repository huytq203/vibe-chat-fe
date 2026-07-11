import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PromptDialog } from './PromptDialog';

describe('PromptDialog', () => {
  it('không có defaultValue: input rỗng khi mở', () => {
    render(
      <PromptDialog open onOpenChange={vi.fn()} title="Tạo thư mục" onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('có defaultValue: input được prefill khi mở', () => {
    render(
      <PromptDialog
        open
        onOpenChange={vi.fn()}
        title="Đổi tên thư mục"
        defaultValue="Ảnh cũ"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('Ảnh cũ');
  });

  it('mở lại với defaultValue khác → input cập nhật theo giá trị mới', () => {
    const { rerender } = render(
      <PromptDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Đổi tên thư mục"
        defaultValue="Ảnh"
        onSubmit={vi.fn()}
      />,
    );
    rerender(
      <PromptDialog
        open
        onOpenChange={vi.fn()}
        title="Đổi tên thư mục"
        defaultValue="Video"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('Video');
  });

  it('submit gọi onSubmit với giá trị đã sửa', () => {
    const onSubmit = vi.fn();
    render(
      <PromptDialog
        open
        onOpenChange={vi.fn()}
        title="Đổi tên thư mục"
        defaultValue="Ảnh"
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ảnh mới' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo|Lưu/i }));
    expect(onSubmit).toHaveBeenCalledWith('Ảnh mới');
  });
});
