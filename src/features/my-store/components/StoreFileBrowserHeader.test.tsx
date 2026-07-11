import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StoreFileBrowserHeader } from './StoreFileBrowserHeader';
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

describe('StoreFileBrowserHeader', () => {
  it('ở root: "Kho của tôi" là page hiện tại (không click được)', () => {
    render(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload={false}
        uploading={false}
      />,
    );
    expect(screen.getByText('Kho của tôi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kho của tôi' })).not.toBeInTheDocument();
  });

  it('có path: hiện breadcrumb đầy đủ, click crumb gốc gọi onGoToCrumb(-1)', () => {
    const onGoToCrumb = vi.fn();
    render(
      <StoreFileBrowserHeader
        breadcrumbPath={[makeFolder({ id: 'a', name: 'Ảnh' })]}
        onGoToCrumb={onGoToCrumb}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload
        uploading={false}
      />,
    );
    expect(screen.getByText('Ảnh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kho của tôi' }));
    expect(onGoToCrumb).toHaveBeenCalledWith(-1);
  });

  it('nút Tải lên disable khi canUpload=false, enable khi canUpload=true', () => {
    const { rerender } = render(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload={false}
        uploading={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Tải lên/i })).toBeDisabled();

    rerender(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload
        uploading={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Tải lên/i })).not.toBeDisabled();
  });
});
