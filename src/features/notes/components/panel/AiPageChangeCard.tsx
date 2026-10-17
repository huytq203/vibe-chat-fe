'use client';

import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useRestoreVersion } from '@/features/notes/hooks/use-mutations';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import type { PageVersion } from '@/features/notes/types';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface AiPageChangeCardProps {
  pageId: string;
  pageTitle: string;
  version: PageVersion;
  onRestored: () => void;
}

/** Thẻ gọn trong chat; phần so sánh hiện ở khung tài liệu thay vì trong khung chat. */
export function AiPageChangeCard({
  pageId, pageTitle, version, onRestored,
}: AiPageChangeCardProps) {
  const isMobile = useIsMobile();
  const isReviewing = useNotesUiStore((state) =>
    state.aiReview?.pageId === pageId && state.aiReview.versionId === version.id);
  const openAiReview = useNotesUiStore((state) => state.openAiReview);
  const closeAiReview = useNotesUiStore((state) => state.closeAiReview);
  const setSidePanelOpen = useNotesUiStore((state) => state.setSidePanelOpen);
  const restoreVersion = useRestoreVersion();

  function handleView() {
    if (isReviewing) {
      closeAiReview();
      return;
    }
    openAiReview({ pageId, versionId: version.id });
    // Trên mobile panel AI phủ cả màn hình, phải đóng để thấy khung tài liệu.
    if (isMobile) setSidePanelOpen(false);
  }

  function handleRestore() {
    restoreVersion.mutate(version.id, {
      onSuccess: () => {
        toast.success('Đã hoàn tác thay đổi');
        if (isReviewing) closeAiReview();
        onRestored();
      },
    });
  }

  return (
    <article className="space-y-3 rounded-xl border border-border bg-secondary p-3 shadow-micro">
      <p className="text-sm font-medium text-foreground">Đã sửa trang {pageTitle}</p>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          aria-pressed={isReviewing}
          disabled={restoreVersion.isPending}
          onClick={handleView}
        >
          {isReviewing ? 'Ẩn thay đổi' : 'Xem thay đổi'}
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
