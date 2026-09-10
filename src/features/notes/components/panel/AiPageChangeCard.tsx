'use client';

import { RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAiPageDiff } from '@/features/notes/hooks/useAiPageDiff';
import { useRestoreVersion } from '@/features/notes/hooks/use-mutations';
import type { MarkdownDiffSegment } from '@/features/notes/lib/markdown-diff';
import type { PageVersion } from '@/features/notes/types';

function DiffText({ segments }: { segments: MarkdownDiffSegment[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg bg-background p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === 'added') {
          return (
            <ins key={index} className="bg-success/15 text-success underline decoration-2 underline-offset-2">
              <span className="sr-only">Đã thêm: </span>{segment.value}
            </ins>
          );
        }
        if (segment.type === 'removed') {
          return (
            <del key={index} className="bg-danger/10 text-danger line-through decoration-2">
              <span className="sr-only">Đã xoá: </span>{segment.value}
            </del>
          );
        }
        return <span key={index}>{segment.value}</span>;
      })}
    </div>
  );
}

interface TitleDiffProps {
  currentTitle: string;
  previousTitle: string;
}

function TitleDiff({ currentTitle, previousTitle }: TitleDiffProps) {
  return (
    <p className="rounded-lg bg-background p-3 text-xs leading-5 break-words">
      <span className="font-medium text-muted-foreground">Tiêu đề: </span>
      <del className="bg-danger/10 text-danger line-through decoration-2">
        <span className="sr-only">Đã xoá: </span>{previousTitle}
      </del>
      <span className="text-muted-foreground" aria-hidden="true"> → </span>
      <ins className="bg-success/15 text-success underline decoration-2 underline-offset-2">
        <span className="sr-only">Đã thêm: </span>{currentTitle}
      </ins>
    </p>
  );
}

interface DiffPanelProps {
  currentTitle: string;
  isError: boolean;
  isLoading: boolean;
  previousTitle?: string;
  segments?: MarkdownDiffSegment[];
}

function DiffPanel({
  currentTitle, isError, isLoading, previousTitle, segments,
}: DiffPanelProps) {
  let content: ReactNode;
  const titleChanged = previousTitle !== undefined && previousTitle !== currentTitle;
  const contentChanged = segments?.some(({ type }) => type !== 'same') ?? false;
  if (isLoading) {
    content = (
      <div className="space-y-2" aria-label="Đang tải thay đổi">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  } else if (isError) {
    content = <p className="text-xs text-danger" role="alert">Không tải được thay đổi. Hãy thử lại.</p>;
  } else if (!titleChanged && !contentChanged) {
    content = <p className="text-xs text-muted-foreground">Không có thay đổi nào</p>;
  } else {
    content = (
      <div className="space-y-3">
        {titleChanged && (
          <TitleDiff currentTitle={currentTitle} previousTitle={previousTitle} />
        )}
        {contentChanged && segments && <DiffText segments={segments} />}
      </div>
    );
  }
  return <div className="border-t border-border pt-3">{content}</div>;
}

interface AiPageChangeCardProps {
  pageId: string;
  pageTitle: string;
  version: PageVersion;
  onRestored: () => void;
}

export function AiPageChangeCard({
  pageId, pageTitle, version, onRestored,
}: AiPageChangeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const diffQuery = useAiPageDiff(pageId, version.id, expanded);
  const restoreVersion = useRestoreVersion();
  const viewLabel = expanded
    ? (diffQuery.isError ? 'Thử lại' : 'Ẩn thay đổi')
    : 'Xem thay đổi';

  function handleView() {
    if (expanded && diffQuery.isError) {
      void diffQuery.refetch();
      return;
    }
    setExpanded((current) => !current);
  }

  function handleRestore() {
    restoreVersion.mutate(version.id, {
      onSuccess: () => {
        toast.success('Đã hoàn tác thay đổi');
        onRestored();
      },
    });
  }

  return (
    <article className="space-y-3 rounded-xl border border-border bg-secondary p-3 shadow-micro">
      <p className="text-sm font-medium text-foreground">Đã sửa trang {pageTitle}</p>
      {expanded && (
        <DiffPanel
          currentTitle={pageTitle}
          isError={diffQuery.isError}
          isLoading={diffQuery.isPending}
          previousTitle={diffQuery.data?.previousTitle}
          segments={diffQuery.data?.segments}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={restoreVersion.isPending}
          onClick={handleView}
        >
          {viewLabel}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Hoàn tác"
          title="Hoàn tác"
          isLoading={restoreVersion.isPending}
          onClick={handleRestore}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </article>
  );
}
