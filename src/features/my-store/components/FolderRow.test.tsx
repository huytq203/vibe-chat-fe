import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FolderRow } from './FolderRow';
import type { StoreFolder } from '@/features/my-store/types';

const folder: StoreFolder = {
  id: 'f1',
  userId: 'u1',
  name: 'Ảnh',
  parentId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('FolderRow', () => {
  it('gọi onOpen với folder.id khi click vào hàng', () => {
    const onOpen = vi.fn();
    render(<FolderRow folder={folder} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('Ảnh'));
    expect(onOpen).toHaveBeenCalledWith('f1');
  });

  it('menu "..." chỉ có "Xoá", không có "Đổi tên", và gọi onDelete khi bấm', () => {
    const onDelete = vi.fn();
    render(<FolderRow folder={folder} onOpen={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn thư mục' }));
    expect(screen.queryByText(/Đổi tên/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xoá/i }));
    expect(onDelete).toHaveBeenCalledWith('f1');
  });
});
