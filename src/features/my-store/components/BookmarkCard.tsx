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
  const meta = message.metadata as BookmarkMetadata;
  const domain = getDomain(meta.url);

  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-blue-400/30 bg-blue-50/60 dark:bg-blue-950/20 p-4 max-w-sm hover:border-blue-400/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900 p-1.5 text-blue-600 dark:text-blue-400 mt-0.5">
          <Bookmark className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {meta.title ? (
            <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {meta.title}
            </p>
          ) : (
            <p className="text-sm font-medium truncate text-blue-600 dark:text-blue-400">{domain}</p>
          )}
          {meta.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{meta.description}</p>
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
