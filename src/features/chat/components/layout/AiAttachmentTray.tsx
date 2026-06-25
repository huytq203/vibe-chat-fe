'use client';

import { X, FileText, FileJson, File } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiAttachment } from '@/lib/gemini';

interface AiAttachmentTrayProps {
  attachments: AiAttachment[];
  error: string | null;
  onRemove: (id: string) => void;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/json') return <FileJson className="h-3.5 w-3.5" />;
  if (mimeType.startsWith('text/')) return <FileText className="h-3.5 w-3.5" />;
  return <File className="h-3.5 w-3.5" />;
}

export function AiAttachmentTray({ attachments, error, onRemove }: AiAttachmentTrayProps) {
  if (attachments.length === 0 && !error) return null;

  return (
    <div className="flex flex-col gap-1.5 pb-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) =>
            a.mimeType.startsWith('image/') && a.previewUrl ? (
              <div key={a.id} className="relative h-12 w-12 shrink-0">
                <img
                  src={a.previewUrl}
                  alt={a.name}
                  className="h-12 w-12 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  aria-label={`Xóa ${a.name}`}
                  className={cn(
                    'absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center',
                    'rounded-full bg-foreground text-background hover:bg-foreground/80',
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <div
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <FileIcon mimeType={a.mimeType} />
                <span className="max-w-[100px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  aria-label={`Xóa ${a.name}`}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
        </div>
      )}
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
