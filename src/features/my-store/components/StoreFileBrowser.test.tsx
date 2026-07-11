import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StoreFileBrowser } from './StoreFileBrowser';
import type { StoreFolder } from '@/features/my-store/types';

function makeFolder(overrides: Partial<StoreFolder>): StoreFolder {
  return {
    id: 'default-id',
    userId: 'u1',
    name: 'default',
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const rootFolders: StoreFolder[] = [
  makeFolder({
    id: 'a',
    name: 'Ảnh',
    children: [makeFolder({ id: 'a1', name: 'Vacation', parentId: 'a' })],
  }),
];

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreFolders: () => ({ data: rootFolders, isLoading: false }),
  useStoreFiles: () => ({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
}));
vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useCreateFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadStoreFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('StoreFileBrowser', () => {
  it('ở root: hiện thư mục top-level, breadcrumb chỉ có "Kho của tôi"', () => {
    render(<StoreFileBrowser />);
    expect(screen.getByText('Ảnh')).toBeInTheDocument();
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });

  it('click vào thư mục → drill in, breadcrumb thêm 1 crumb, hiện thư mục con', () => {
    render(<StoreFileBrowser />);
    fireEvent.click(screen.getByText('Ảnh'));
    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kho của tôi' })).toBeInTheDocument();
  });

  it('click crumb gốc "Kho của tôi" sau khi drill in → quay về root', () => {
    render(<StoreFileBrowser />);
    fireEvent.click(screen.getByText('Ảnh'));
    fireEvent.click(screen.getByRole('button', { name: 'Kho của tôi' }));
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });
});
