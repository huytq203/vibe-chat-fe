'use client';

import { useRef } from 'react';
import { Download, File, FileText, FolderPlus, Image, Loader2, MoreHorizontal, Music, Paperclip, Trash2, Upload, Video } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { mediaApi } from '@/services/media.api';
import { triggerSave } from '@/features/chat/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu/ContextMenu';
import { useStoreFiles } from '@/features/my-store/hooks/use-query';
import { useCreateFolder, useDeleteFile, useUploadStoreFile } from '@/features/my-store/hooks/use-mutations';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';
import { FilePreviewDialog } from './FilePreviewDialog';
import type { StoreFileRef } from '@/features/my-store/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-green-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="h-4 w-4 text-orange-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function FileRow({ file, folderId }: { file: StoreFileRef; folderId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const del = useDeleteFile();

  async function download() {
    setMenuOpen(false);
    if (dlProgress !== null) return;
    setDlProgress(0);
    try {
      const media = await mediaApi.get(file.mediaId);
      if (media.downloadUrl) {
        triggerSave(await mediaApi.download(media.downloadUrl, setDlProgress), file.name);
      }
    } finally {
      setDlProgress(null);
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title="Xem trước"
      >
        <FileIcon mimeType={file.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{file.name}</p>
          {dlProgress !== null ? (
            <span className="mt-1 flex items-center gap-2">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${dlProgress}%` }}
                />
              </span>
              <span className="text-[10px] text-muted-foreground">Tải {dlProgress}%</span>
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.fileSize)} · {file.mimeType.split('/')[1]?.toUpperCase()}
            </p>
          )}
        </div>
      </button>
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors p-1 rounded',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-6 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={download}
              >
                <Download className="h-3 w-3" /> Tải về
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-3 w-3" /> Gỡ file
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Gỡ file?"
        description={
          <>
            Gỡ <span className="font-semibold text-foreground">{file.name}</span> khỏi thư mục này?
          </>
        }
        confirmLabel="Gỡ file"
        destructive
        isPending={del.isPending}
        onConfirm={() =>
          del.mutate(
            { folderId, fileRefId: String(file.id) },
            { onSuccess: () => setConfirmOpen(false) },
          )
        }
      />

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} file={file} />
    </div>
  );
}

type FilePanelProps = {
  folderId: string;
  folderName: string;
};

export function FilePanel({ folderId, folderName }: FilePanelProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useStoreFiles(folderId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subfolderOpen, setSubfolderOpen] = useState(false);
  const [uploads, setUploads] = useState<Array<{ id: string; name: string; progress: number }>>([]);
  const upload = useUploadStoreFile();
  const createFolder = useCreateFolder();

  // Dedupe theo id: cursor pagination + invalidate có thể refetch trùng item giữa
  // các trang (cursor cũ bị lệch khi có file mới) → tránh key trùng khi render.
  const allFiles = Array.from(
    new Map((data?.pages ?? []).flatMap((p) => p.items).map((f) => [f.id, f])).values(),
  );

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
      upload.mutate(
        {
          folderId,
          file,
          onProgress: (p) =>
            setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        },
        { onSettled: () => setUploads((u) => u.filter((x) => x.id !== id)) },
      );
    });
    // Reset để chọn lại cùng file vẫn trigger onChange.
    e.target.value = '';
  }

  function createSubfolder(name: string) {
    createFolder.mutate(
      { name, parentId: folderId },
      { onSuccess: () => setSubfolderOpen(false) },
    );
  }

  return (
    <ContextMenu>
    <ContextMenuTrigger className="flex-1 flex flex-col min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold truncate">{folderName}</h2>
        <span className="text-xs text-muted-foreground ml-2">{allFiles.length} file</span>
        <button
          onClick={openPicker}
          disabled={upload.isPending}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          title="Tải tệp lên thư mục này"
        >
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Tải lên
        </button>
      </div>

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

        {!isLoading && allFiles.length === 0 && uploads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Paperclip className="h-8 w-8 opacity-30" />
            <p className="text-sm">Thư mục trống</p>
          </div>
        )}

        {allFiles.map((file) => (
          <FileRow key={file.id} file={file} folderId={folderId} />
        ))}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
          >
            {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Tải thêm'}
          </button>
        )}
        <div ref={bottomRef} />
      </div>
    </ContextMenuTrigger>

    <ContextMenuContent>
      <ContextMenuItem onClick={openPicker}>
        <Upload /> Tải lên tệp
      </ContextMenuItem>
      <ContextMenuItem onClick={() => setSubfolderOpen(true)}>
        <FolderPlus /> Tạo thư mục con
      </ContextMenuItem>
    </ContextMenuContent>

    <PromptDialog
      open={subfolderOpen}
      onOpenChange={setSubfolderOpen}
      title="Tạo thư mục con"
      placeholder="Tên thư mục..."
      isPending={createFolder.isPending}
      onSubmit={createSubfolder}
    />
    </ContextMenu>
  );
}
