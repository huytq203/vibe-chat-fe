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
    render(<FolderRow folder={folder} onOpen={onOpen} onRename={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('Ảnh'));
    expect(onOpen).toHaveBeenCalledWith('f1');
  });

  it('menu "..." có "Đổi tên" và "Xoá", gọi đúng callback với folder.id', () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(<FolderRow folder={folder} onOpen={vi.fn()} onRename={onRename} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn thư mục' }));

    fireEvent.click(screen.getByRole('button', { name: /Đổi tên/i }));
    expect(onRename).toHaveBeenCalledWith('f1');
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn thư mục' }));
    fireEvent.click(screen.getByRole('button', { name: /Xoá/i }));
    expect(onDelete).toHaveBeenCalledWith('f1');
  });

  it('click "Đổi tên"/"Xoá" không trigger onOpen', () => {
    const onOpen = vi.fn();
    render(<FolderRow folder={folder} onOpen={onOpen} onRename={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn thư mục' }));
    fireEvent.click(screen.getByRole('button', { name: /Đổi tên/i }));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
