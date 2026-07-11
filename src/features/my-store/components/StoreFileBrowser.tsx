'use client';

import { useRef, useState } from 'react';
import { FolderOpen, FolderPlus, Loader2, Upload } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu/ContextMenu';
import { useStoreFiles, useStoreFolders } from '@/features/my-store/hooks/use-query';
import { useCreateFolder, useDeleteFolder, useUploadStoreFile } from '@/features/my-store/hooks/use-mutations';
import { findFolderById } from '@/features/my-store/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';
import { FolderRow } from './FolderRow';
import { FileRow } from './FileRow';
import { StoreFileBrowserHeader } from './StoreFileBrowserHeader';

export function StoreFileBrowser() {
  const { data: folders, isLoading: foldersLoading } = useStoreFolders();
  const [path, setPath] = useState<string[]>([]);
  const currentFolderId = path.at(-1) ?? null;

  const {
    data: filesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: filesLoading,
  } = useStoreFiles(currentFolderId);
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const upload = useUploadStoreFile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Array<{ id: string; name: string; progress: number }>>([]);

  const currentFolder = currentFolderId ? findFolderById(folders ?? [], currentFolderId) : null;
  const childFolders = currentFolder ? (currentFolder.children ?? []) : (folders ?? []);
  const allFiles = Array.from(
    new Map((filesData?.pages ?? []).flatMap((p) => p.items).map((f) => [f.id, f])).values(),
  );
  const breadcrumbPath = path
    .map((id) => findFolderById(folders ?? [], id))
    .filter((f): f is NonNullable<typeof f> => f !== null);

  function openFolder(id: string) {
    setPath((p) => [...p, id]);
  }

  function goToCrumb(index: number) {
    setPath((p) => (index < 0 ? [] : p.slice(0, index + 1)));
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!currentFolderId) return;
    const folderId = currentFolderId;
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
      upload.mutate(
        {
          folderId,
          file,
          onProgress: (p) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        },
        { onSettled: () => setUploads((u) => u.filter((x) => x.id !== id)) },
      );
    });
    e.target.value = '';
  }

  function submitCreate(name: string) {
    createFolder.mutate(
      { name, parentId: currentFolderId ?? undefined },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  const showEmptyState =
    !foldersLoading &&
    childFolders.length === 0 &&
    (!currentFolderId || (!filesLoading && allFiles.length === 0 && uploads.length === 0));

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />

        <StoreFileBrowserHeader
          breadcrumbPath={breadcrumbPath}
          onGoToCrumb={goToCrumb}
          onCreateFolder={() => setCreateOpen(true)}
          onUploadClick={openPicker}
          canUpload={currentFolderId !== null}
          uploading={upload.isPending}
        />

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

          {(foldersLoading || (currentFolderId !== null && filesLoading)) && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {childFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={openFolder}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}

          {currentFolderId &&
            allFiles.map((file) => <FileRow key={file.id} file={file} folderId={currentFolderId} />)}

          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <FolderOpen className="h-8 w-8 opacity-30" />
              <p className="text-sm">{currentFolderId ? 'Thư mục trống' : 'Chưa có thư mục nào'}</p>
            </div>
          )}

          {currentFolderId && hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
            >
              {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Tải thêm'}
            </button>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => setCreateOpen(true)}>
          <FolderPlus /> Tạo thư mục
        </ContextMenuItem>
        {currentFolderId && (
          <ContextMenuItem onClick={openPicker}>
            <Upload /> Tải lên tệp
          </ContextMenuItem>
        )}
      </ContextMenuContent>

      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo thư mục"
        placeholder="Tên thư mục..."
        isPending={createFolder.isPending}
        onSubmit={submitCreate}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Xoá thư mục?"
        description="Thư mục và toàn bộ file bên trong sẽ bị xoá."
        confirmLabel="Xoá"
        destructive
        isPending={deleteFolder.isPending}
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          deleteFolder.mutate(id, { onSuccess: () => setPendingDeleteId(null) });
        }}
      />
    </ContextMenu>
  );
}
