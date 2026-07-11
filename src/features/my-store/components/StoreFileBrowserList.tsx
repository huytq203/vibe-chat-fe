'use client';

import { FolderOpen, Loader2 } from 'lucide-react';
import type { StoreFileRef, StoreFolder } from '@/features/my-store/types';
import { FolderRow } from './FolderRow';
import { FileRow } from './FileRow';

type UploadProgress = { id: string; name: string; progress: number };

type StoreFileBrowserListProps = {
  currentFolderId: string | null;
  childFolders: StoreFolder[];
  files: StoreFileRef[];
  uploads: UploadProgress[];
  isLoading: boolean;
  showEmptyState: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onOpenFolder: (id: string) => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
};

export function StoreFileBrowserList({
  currentFolderId,
  childFolders,
  files,
  uploads,
  isLoading,
  showEmptyState,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
}: StoreFileBrowserListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {uploads.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{u.name}</p>
            <span className="mt-1 flex items-center gap-2">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </span>
              <span className="text-[10px] text-muted-foreground">{u.progress}%</span>
            </span>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {childFolders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          onOpen={onOpenFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
        />
      ))}

      {currentFolderId &&
        files.map((file) => <FileRow key={file.id} file={file} folderId={currentFolderId} />)}

      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <FolderOpen className="h-8 w-8 opacity-30" />
          <p className="text-sm">{currentFolderId ? 'Thư mục trống' : 'Chưa có thư mục nào'}</p>
        </div>
      )}

      {currentFolderId && hasNextPage && (
        <button
          onClick={onFetchNextPage}
          disabled={isFetchingNextPage}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
        >
          {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Tải thêm'}
        </button>
      )}
    </div>
  );
}
