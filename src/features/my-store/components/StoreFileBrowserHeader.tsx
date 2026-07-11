'use client';

import { Fragment } from 'react';
import { FolderPlus, Loader2, Upload } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb/Breadcrumb';
import type { StoreFolder } from '@/features/my-store/types';

export type StoreFileBrowserHeaderProps = {
  breadcrumbPath: StoreFolder[];
  onGoToCrumb: (index: number) => void;
  onCreateFolder: () => void;
  onUploadClick: () => void;
  canUpload: boolean;
  uploading: boolean;
};

export function StoreFileBrowserHeader({
  breadcrumbPath,
  onGoToCrumb,
  onCreateFolder,
  onUploadClick,
  canUpload,
  uploading,
}: StoreFileBrowserHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            {breadcrumbPath.length === 0 ? (
              <BreadcrumbPage>Kho của tôi</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => onGoToCrumb(-1)}>
                  Kho của tôi
                </button>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {breadcrumbPath.map((folder, i) => (
            <Fragment key={folder.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === breadcrumbPath.length - 1 ? (
                  <BreadcrumbPage className="max-w-[160px] truncate">{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => onGoToCrumb(i)} className="max-w-[160px] truncate">
                      {folder.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <button
        type="button"
        onClick={onCreateFolder}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        title="Tạo thư mục"
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Tạo thư mục
      </button>
      <button
        type="button"
        onClick={onUploadClick}
        disabled={!canUpload || uploading}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        title={canUpload ? 'Tải tệp lên thư mục này' : 'Chọn thư mục trước'}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Tải lên
      </button>
    </div>
  );
}
