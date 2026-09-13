import { File, FileJson, FileText } from 'lucide-react';
import type { AiAttachmentMeta } from '@/features/ai/types';

interface AiMessageAttachmentProps {
  attachment: AiAttachmentMeta;
}

export function AiMessageAttachment({ attachment }: AiMessageAttachmentProps) {
  if (attachment.mimeType.startsWith('image/')) {
    const imageUrl = attachment.downloadUrl ?? attachment.previewUrl;
    if (imageUrl) {
      return (
        // URL có thể là blob cục bộ hoặc presigned URL nên không dùng next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={attachment.name}
          className="max-h-40 max-w-[200px] rounded-lg object-contain"
        />
      );
    }
    return <span className="text-xs opacity-70">[Ảnh] {attachment.name}</span>;
  }

  const Icon = attachment.mimeType === 'application/json'
    ? FileJson
    : attachment.mimeType.startsWith('text/') ? FileText : File;
  const content = (
    <>
      <Icon className="size-3" />
      <span className="max-w-[140px] truncate">{attachment.name}</span>
    </>
  );
  const className = 'flex w-fit items-center gap-1.5 rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-0.5 text-xs';

  if (!attachment.downloadUrl) return <span className={className}>{content}</span>;
  return (
    <a
      href={attachment.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}
