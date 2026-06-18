'use client';

import { useRef } from 'react';
import { File, FileText, Image, Loader2, MoreHorizontal, Music, Paperclip, Trash2, Video } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useStoreFiles } from '@/features/my-store/hooks/use-query';
import { useDeleteFile } from '@/features/my-store/hooks/use-mutations';
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
  const del = useDeleteFile();

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
      <FileIcon mimeType={file.mimeType} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.fileSize)} · {file.mimeType.split('/')[1]?.toUpperCase()}
        </p>
      </div>
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
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  if (confirm('Gỡ file khỏi thư mục này?')) {
                    del.mutate({ folderId, fileRefId: String(file.id) });
                  }
                }}
              >
                <Trash2 className="h-3 w-3" /> Gỡ file
              </button>
            </div>
          </>
        )}
      </div>
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

  // Dedupe theo id: cursor pagination + invalidate có thể refetch trùng item giữa
  // các trang (cursor cũ bị lệch khi có file mới) → tránh key trùng khi render.
  const allFiles = Array.from(
    new Map((data?.pages ?? []).flatMap((p) => p.items).map((f) => [f.id, f])).values(),
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold truncate">{folderName}</h2>
        <span className="text-xs text-muted-foreground ml-auto">{allFiles.length} file</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && allFiles.length === 0 && (
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
    </div>
  );
}
