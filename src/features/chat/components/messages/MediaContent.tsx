'use client';

import { useEffect } from 'react';
import { Download, ImageOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress/Progress';
import { fileExtFromName, formatFileSize, getFileIconMeta } from '@/features/chat/utils';
import { useMediaDownload } from '@/features/chat/hooks/useMediaDownload';
import { useRefreshableUrl } from '@/features/chat/hooks/useRefreshableUrl';
import { useImageLightbox } from './LightboxProvider';
import type { OptimisticMeta, Message } from '@/features/chat/types';

type MediaContentProps = {
  message: Message;
  isMe: boolean;
};

export function MediaContent({ message, isMe }: MediaContentProps) {
  const attachment = message.attachments?.[0] ?? null;
  const meta = (message.metadata ?? {}) as OptimisticMeta;
  const localPreview = meta.previewUrl ?? null;
  const mediaId = attachment?.mediaId ?? null;

  // localPreview (blob) hiển thị ngay; nếu không có → downloadUrl ký sẵn của BE.
  const initialUrl = localPreview ?? attachment?.downloadUrl ?? null;
  const canRefresh = !localPreview && Boolean(mediaId);
  const { url, onError } = useRefreshableUrl(message.conversationId, mediaId, initialUrl, canRefresh);

  const name = attachment?.fileName ?? 'Tệp đính kèm';
  const size = attachment?.fileSize ?? null;

  if (message.type === 'IMAGE') {
    return (
      <ImageView id={message.id} sortKey={message.createdAt} url={url} name={name} onError={onError} />
    );
  }
  if (message.type === 'VIDEO') {
    return <VideoView url={url} name={name} onError={onError} />;
  }
  return (
    <FileView
      conversationId={message.conversationId}
      mediaId={mediaId}
      url={url}
      name={name}
      size={size}
      isMe={isMe}
    />
  );
}

function MediaPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-[140px] w-[220px] flex-col items-center justify-center gap-1.5 rounded-[10px] bg-border/40 px-3 text-muted-foreground">
      <ImageOff className="h-7 w-7" />
      <span className="max-w-full truncate text-[11px]">{name}</span>
      <span className="text-[10px] opacity-70">Không tải được nội dung</span>
    </div>
  );
}

function ImageView({
  id,
  sortKey,
  url,
  name,
  onError,
}: {
  id: string;
  sortKey: string;
  url: string | null;
  name: string;
  onError: () => void;
}) {
  const lightbox = useImageLightbox();

  // Đăng ký ảnh vào album dùng chung (gỡ khi unmount / url đổi).
  useEffect(() => {
    if (!url) return;
    lightbox.register({ id, src: url, alt: name, sortKey });
    return () => lightbox.unregister(id);
  }, [lightbox, id, url, name, sortKey]);

  if (!url) return <MediaPlaceholder name={name} />;
  return (
    <button
      type="button"
      onClick={() => lightbox.open(id)}
      className="block cursor-zoom-in"
      aria-label="Phóng to ảnh"
    >
      {/* URL ký sẵn (S3) hoặc blob: cục bộ — next/image không phù hợp, dùng <img>. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        onError={onError}
        className="block w-full max-h-[260px] max-w-[260px] rounded-[10px] object-cover"
      />
    </button>
  );
}

function VideoView({ url, name, onError }: { url: string | null; name: string; onError: () => void }) {
  if (!url) return <MediaPlaceholder name={name} />;
  return (
    <video
      src={url}
      controls
      onError={onError}
      className="block w-full max-h-[260px] max-w-[260px] rounded-[10px]"
    />
  );
}

function FileView({
  conversationId,
  mediaId,
  url,
  name,
  size,
  isMe,
}: {
  conversationId: string;
  mediaId: string | null;
  url: string | null;
  name: string;
  size: number | null;
  isMe: boolean;
}) {
  const icon = getFileIconMeta(fileExtFromName(name));
  const { downloading, progress, download } = useMediaDownload(conversationId, mediaId, name);

  const body = (
    <div className="flex items-center gap-2.5 py-0.5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-extrabold"
        style={{ backgroundColor: `${icon.color}22`, color: icon.color }}
      >
        {icon.label}
      </span>
      <span className="min-w-0">
        <span className="block max-w-[160px] truncate text-[13px] font-semibold">{name}</span>
        <span className={isMe ? 'block text-[11px] opacity-70' : 'block text-[11px] text-muted-foreground'}>
          {formatFileSize(size)}
        </span>
      </span>
      {url && <Download className="h-4 w-4 shrink-0 opacity-70" />}
    </div>
  );

  if (!url) return body;
  return (
    <button
      type="button"
      onClick={() => void download(url)}
      disabled={downloading}
      className="block w-full cursor-pointer text-left disabled:cursor-wait disabled:opacity-80"
      aria-label={`Tải xuống ${name}`}
    >
      {body}
      {downloading && <Progress value={progress} size="sm" className="mt-1.5" />}
    </button>
  );
}
