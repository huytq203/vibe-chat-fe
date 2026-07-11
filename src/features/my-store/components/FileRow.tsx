'use client';

import { useState } from 'react';
import { Download, File, FileText, Image, MoreHorizontal, Music, Trash2, Video } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { mediaApi } from '@/services/media.api';
import { triggerSave } from '@/features/chat/utils';
import { useDeleteFile } from '@/features/my-store/hooks/use-mutations';
import { ConfirmDialog } from './ConfirmDialog';
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

type FileRowProps = {
  file: StoreFileRef;
  folderId: string;
};

export function FileRow({ file, folderId }: FileRowProps) {
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
