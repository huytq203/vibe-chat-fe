'use client';

import { AlertCircle, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getFileIconMeta } from '../../utils';
import type { Attachment } from '../../hooks/useAttachments';

type AttachmentTrayProps = {
  attachments: Attachment[];
  onRemove: (id: string) => void;
};

const KIND_LABEL: Record<Attachment['kind'], string> = {
  image: 'Ảnh',
  video: 'Video',
  file: 'Tệp',
};

export function AttachmentTray({ attachments, onRemove }: AttachmentTrayProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex gap-2 overflow-x-auto rounded-xl border border-border bg-background p-2">
      {attachments.map((a) => (
        <AttachmentPreview key={a.id} attachment={a} onRemove={() => onRemove(a.id)} />
      ))}
    </div>
  );
}

function AttachmentPreview({ attachment: a, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const icon = getFileIconMeta(a.ext);
  const uploading = a.status === 'uploading';
  const failed = a.status === 'error';

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'h-[72px] w-[72px] overflow-hidden rounded-[10px]',
          failed && 'ring-2 ring-danger',
        )}
      >
        {a.kind === 'image' && a.previewUrl && (
          // blob: URL cục bộ — next/image không tối ưu được, dùng <img> thuần.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
        )}

        {a.kind === 'video' && a.previewUrl && (
          <div className="relative h-full w-full bg-black">
            <video src={a.previewUrl} className="h-full w-full object-cover" muted />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </div>
        )}

        {a.kind === 'file' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary p-1">
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-[9px] font-extrabold"
              style={{ backgroundColor: `${icon.color}22`, color: icon.color }}
            >
              {icon.label}
            </span>
            <span className="max-w-[64px] truncate text-center text-[8.5px] text-muted-foreground">
              {a.name}
            </span>
          </div>
        )}
      </div>

      {/* Lớp phủ tiến trình upload */}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/55 text-[11px] font-bold text-white">
          {a.progress}%
        </span>
      )}
      {failed && (
        <span
          className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/55"
          title={a.error ?? 'Tải lên thất bại'}
        >
          <AlertCircle className="h-5 w-5 text-danger" />
        </span>
      )}

      {/* Nhãn loại (ảnh/video) */}
      {a.kind !== 'file' && !uploading && !failed && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold text-white">
          {KIND_LABEL[a.kind]}
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        title="Gỡ bỏ"
        aria-label="Gỡ bỏ"
        className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-sidebar bg-danger text-white"
      >
        <X className="h-2.5 w-2.5" strokeWidth={3} />
      </button>
    </div>
  );
}
