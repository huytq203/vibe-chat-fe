'use client';

import { Bookmark, ExternalLink } from 'lucide-react';
import type { BookmarkMetadata } from '@/features/my-store/types';

type BookmarkCardProps = {
  message: { metadata: Record<string, unknown> | null };
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function BookmarkCard({ message }: BookmarkCardProps) {
  const meta = (message.metadata ?? {}) as BookmarkMetadata;
  const url = meta.url ?? '';
  const title = meta.title;
  const description = meta.description;
  const domain = getDomain(url);

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-background p-4 max-w-sm shadow-sm hover:border-primary/50 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-blue-500/15 p-1.5 text-blue-600 dark:text-blue-400 mt-0.5">
          <Bookmark className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {title ? (
            <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {title}
            </p>
          ) : (
            <p className="text-sm font-semibold truncate text-blue-600 dark:text-blue-400">{domain}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <span className="truncate">{domain}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </div>
        </div>
      </div>
    </a>
  );
}
