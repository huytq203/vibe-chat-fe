import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileRow } from './FileRow';
import type { StoreFileRef } from '@/features/my-store/types';

vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useDeleteFile: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./FilePreviewDialog', () => ({
  FilePreviewDialog: () => null,
}));

const file: StoreFileRef = {
  id: 1,
  folderId: 'f1',
  userId: 'u1',
  mediaId: 'm1',
  name: 'photo.jpg',
  fileSize: 2048,
  mimeType: 'image/jpeg',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('FileRow', () => {
  it('hiển thị tên file và dung lượng đã format', () => {
    render(<FileRow file={file} folderId="f1" />);
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it('mở menu và hiện tuỳ chọn Tải về / Gỡ file', () => {
    render(<FileRow file={file} folderId="f1" />);
    const buttons = screen.getAllByRole('button');
    const menuButton = buttons.find((b) => b.getAttribute('title') !== 'Xem trước');
    if (!menuButton) throw new Error('Không tìm thấy nút menu "..."');
    fireEvent.click(menuButton);
    expect(screen.getByText('Tải về')).toBeInTheDocument();
    expect(screen.getByText('Gỡ file')).toBeInTheDocument();
  });
});
