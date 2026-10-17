'use client';

import { FileCheck } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAiChangeReview } from '@/features/notes/hooks/useAiChangeReview';
import { useRestoreVersion } from '@/features/notes/hooks/use-mutations';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { AiReviewSection } from './AiReviewSection';
import { AFTER_SECTION_ID, AiReviewToolbar, BEFORE_SECTION_ID } from './AiReviewToolbar';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    || target.closest('[role="dialog"], [role="alertdialog"]') !== null;
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || isTypingTarget(event.target)) return;
      onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

function ReviewSkeleton() {
  return (
    <div data-testid="ai-review-loading" className="space-y-12" aria-label="Đang tải thay đổi">
      {[0, 1].map((key) => (
        <div key={key} className="space-y-3">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

interface AiChangeReviewProps {
  currentTitle: string;
  pageId: string;
  versionId: string;
}

/** Thay vùng editor bằng hai bản render đầy đủ: bản trước khi AI sửa ở trên, bản hiện tại ở dưới. */
export function AiChangeReview({ currentTitle, pageId, versionId }: AiChangeReviewProps) {
  const closeAiReview = useNotesUiStore((state) => state.closeAiReview);
  const markAiVersionRestored = useNotesUiStore((state) => state.markAiVersionRestored);
  const reviewQuery = useAiChangeReview(pageId, versionId);
  const restoreVersion = useRestoreVersion();
  useCloseOnEscape(closeAiReview);

  function handleRestore() {
    restoreVersion.mutate(versionId, {
      onSuccess: () => {
        toast.success('Đã hoàn tác thay đổi');
        markAiVersionRestored(versionId);
      },
    });
  }

  const { data } = reviewQuery;
  const titleChanged = data !== undefined && data.previousTitle !== currentTitle;
  const hasChanges = data !== undefined
    && (titleChanged || data.diff.addedCount > 0 || data.diff.removedCount > 0);

  let content: ReactNode;
  if (reviewQuery.isPending) content = <ReviewSkeleton />;
  else if (reviewQuery.isError) {
    content = <ErrorState message="Không tải được thay đổi" onRetry={() => void reviewQuery.refetch()} />;
  } else if (!hasChanges) {
    content = (
      <EmptyState
        icon={<FileCheck aria-hidden="true" />}
        title="Không có thay đổi nào"
        hint="Nội dung hiện tại giống bản trước khi AI sửa."
        action={<Button type="button" size="sm" variant="ghost" onClick={closeAiReview}>Đóng</Button>}
      />
    );
  } else {
    content = (
      <>
        <AiReviewSection
          id={BEFORE_SECTION_ID} label="Bản trước" hint="Trước khi AI sửa"
          title={data.previousTitle} titleTone={titleChanged ? 'removed' : undefined} html={data.diff.beforeHtml}
        />
        <hr className="my-12 border-border" />
        <AiReviewSection
          id={AFTER_SECTION_ID} label="Bản sau" hint="Nội dung hiện tại của trang"
          title={currentTitle} titleTone={titleChanged ? 'added' : undefined} html={data.diff.afterHtml}
        />
      </>
    );
  }

  return (
    <div className="animate-in fade-in duration-150 motion-reduce:animate-none">
      <AiReviewToolbar
        addedCount={data?.diff.addedCount}
        removedCount={data?.diff.removedCount}
        isRestoring={restoreVersion.isPending}
        showJumps={hasChanges}
        onClose={closeAiReview}
        onRestore={handleRestore}
      />
      <div className="mx-auto w-full max-w-[45rem] px-4 pb-[calc(var(--safe-bottom)+6rem)] pt-10 sm:px-6 md:px-0 md:pb-32">
        {content}
      </div>
    </div>
  );
}
