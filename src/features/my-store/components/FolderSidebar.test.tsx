import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FolderSidebar } from './FolderSidebar';

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreFolders: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useCreateFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFolder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./QuotaBar', () => ({
  QuotaBar: () => null,
}));

describe('FolderSidebar', () => {
  it('renders as a rounded floating card without a right border seam', () => {
    const { container } = render(
      <FolderSidebar selectedFolderId={null} onSelectFolder={() => {}} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('rounded-2xl');
    expect(root.className).not.toMatch(/\bborder-r\b/);
  });

  it('vẫn hiển thị tiêu đề Thư mục', () => {
    render(<FolderSidebar selectedFolderId={null} onSelectFolder={() => {}} />);
    expect(screen.getByText('Thư mục')).toBeInTheDocument();
  });
});
