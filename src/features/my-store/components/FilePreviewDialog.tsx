'use client';

import { useEffect, useState } from 'react';
import { Download, FileQuestion, Loader2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { mediaApi } from '@/services/media.api';
import { triggerSave } from '@/features/chat/utils';
import type { StoreFileRef } from '@/features/my-store/types';

type PreviewKind = 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'other';

const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'xml', 'yml', 'yaml',
  'js', 'ts', 'tsx', 'jsx', 'css', 'scss', 'html', 'htm', 'sh', 'py', 'java',
  'c', 'cpp', 'go', 'rs', 'rb', 'php', 'sql', 'env', 'ini', 'conf',
]);

function getExt(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

function getPreviewKind(file: StoreFileRef): PreviewKind {
  const mime = file.mimeType;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml')
    return 'text';
  // Fallback theo đuôi khi MIME generic (application/octet-stream).
  if (TEXT_EXTS.has(getExt(file.name))) return 'text';
  return 'other';
}

type Status = 'loading' | 'ready' | 'error';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: StoreFileRef | null;
};

/** Xem trước file (text/ảnh/pdf/video/audio) + tải về. Office/khác chỉ tải về. */
export function FilePreviewDialog({ open, onOpenChange, file }: Props) {
  const kind = file ? getPreviewKind(file) : 'other';
  const [status, setStatus] = useState<Status>('loading');
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;

    void (async () => {
      setStatus('loading');
      setSrc(null);
      setText('');
      try {
        const media = await mediaApi.get(file.mediaId);
        const url = media.downloadUrl;
        if (!url) throw new Error('no-url');
        if (kind === 'text') {
          const blob = await mediaApi.download(url);
          const content = await blob.text();
          if (!cancelled) {
            setText(content);
            setStatus('ready');
          }
        } else if (kind === 'other') {
          if (!cancelled) setStatus('ready');
        } else {
          // image/pdf/video/audio dùng thẳng URL ký sẵn.
          if (!cancelled) {
            setSrc(url);
            setStatus('ready');
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, file, kind]);

  async function handleDownload() {
    if (!file || downloading) return;
    setDownloading(true);
    setDlProgress(0);
    try {
      const media = await mediaApi.get(file.mediaId);
      if (!media.downloadUrl) return;
      const blob = await mediaApi.download(media.downloadUrl, setDlProgress);
      triggerSave(blob, file.name);
    } catch {
      /* bỏ qua — user có thể bấm lại */
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-0 p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex-1 truncate text-sm font-semibold">{file?.name ?? 'Tệp'}</span>
          <Button variant="ghost" size="sm" onClick={handleDownload} isLoading={downloading}>
            <Download className="h-4 w-4" /> {downloading ? `Đang tải ${dlProgress}%` : 'Tải về'}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/30">
          {status === 'loading' && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileQuestion className="h-10 w-10 opacity-40" />
              <p className="text-sm">Không tải được nội dung tệp.</p>
            </div>
          )}

          {status === 'ready' && kind === 'text' && (
            <pre className="m-0 whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-foreground">
              {text}
            </pre>
          )}

          {status === 'ready' && kind === 'image' && src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={file?.name ?? ''} className="mx-auto max-h-[75vh] object-contain" />
          )}

          {status === 'ready' && kind === 'pdf' && src && (
            <iframe src={src} title={file?.name ?? 'PDF'} className="h-[75vh] w-full border-0" />
          )}

          {status === 'ready' && kind === 'video' && src && (
            <video src={src} controls className="mx-auto max-h-[75vh] w-full bg-black" />
          )}

          {status === 'ready' && kind === 'audio' && src && (
            <div className="flex h-40 items-center justify-center p-4">
              <audio src={src} controls className="w-full max-w-md" />
            </div>
          )}

          {status === 'ready' && kind === 'other' && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
              <FileQuestion className="h-10 w-10 opacity-40" />
              <p className="text-sm">Không xem trước được định dạng này. Hãy tải về để mở bằng ứng dụng tương ứng.</p>
              <Button variant="solid" onClick={handleDownload} isLoading={downloading}>
                <Download className="h-4 w-4" /> Tải về
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
