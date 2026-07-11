'use client';

import { useRef, useState } from 'react';
import { FolderPlus, Upload } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu/ContextMenu';
import { useStoreFiles, useStoreFolders } from '@/features/my-store/hooks/use-query';
import {
  useCreateFolder,
  useDeleteFolder,
  useUpdateFolder,
  useUploadStoreFile,
} from '@/features/my-store/hooks/use-mutations';
import { findFolderById } from '@/features/my-store/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';
import { StoreFileBrowserHeader } from './StoreFileBrowserHeader';
import { StoreFileBrowserList } from './StoreFileBrowserList';
import { QuotaBar } from './QuotaBar';

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
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const upload = useUploadStoreFile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
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
  const renamingFolder = renamingFolderId ? findFolderById(folders ?? [], renamingFolderId) : null;

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

  function submitRename(name: string) {
    if (!renamingFolderId) return;
    updateFolder.mutate(
      { id: renamingFolderId, dto: { name } },
      { onSuccess: () => setRenamingFolderId(null) },
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

        <StoreFileBrowserList
          currentFolderId={currentFolderId}
          childFolders={childFolders}
          files={allFiles}
          uploads={uploads}
          isLoading={foldersLoading || (currentFolderId !== null && filesLoading)}
          showEmptyState={showEmptyState}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onFetchNextPage={() => fetchNextPage()}
          onOpenFolder={openFolder}
          onRenameFolder={(id) => setRenamingFolderId(id)}
          onDeleteFolder={(id) => setPendingDeleteId(id)}
        />

        <QuotaBar />
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

      <PromptDialog
        open={renamingFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingFolderId(null);
        }}
        title="Đổi tên thư mục"
        placeholder="Tên thư mục..."
        confirmLabel="Lưu"
        defaultValue={renamingFolder?.name ?? ''}
        isPending={updateFolder.isPending}
        onSubmit={submitRename}
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
