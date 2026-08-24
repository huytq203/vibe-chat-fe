'use client';

import { ArrowLeft, FileClock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useRestoreVersion } from '@/features/notes/hooks/use-mutations';
import { useVersion } from '@/features/notes/hooks/use-query';

interface ViewerHeaderProps {
  onBack: () => void;
  onRestore?: () => void;
}

function ViewerHeader({ onBack, onRestore }: ViewerHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border p-3">
      <Button type="button" variant="ghost" size="xs" onClick={onBack}>
        <ArrowLeft aria-hidden="true" className="size-4" />Lịch sử
      </Button>
      {onRestore && <Button type="button" variant="danger-outline" size="xs" onClick={onRestore}>Khôi phục</Button>}
    </div>
  );
}

function ViewerSkeleton() {
  return (
    <div data-testid="version-viewer-loading" className="space-y-3 p-4">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

interface RestoreDialogProps {
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function RestoreDialog({ isPending, onConfirm, onOpenChange, open }: RestoreDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Khôi phục phiên bản này?</AlertDialogTitle>
          <AlertDialogDescription>
            Phiên bản hiện tại sẽ được lưu lại trước khi khôi phục.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button type="button" variant="ghost" size="sm" disabled={isPending}>Huỷ</Button>} />
          <Button type="button" variant="danger" size="sm" isLoading={isPending} onClick={onConfirm}>
            Khôi phục phiên bản
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface VersionViewerProps {
  onBack: () => void;
  versionId: string;
}

export function VersionViewer({ onBack, versionId }: VersionViewerProps) {
  const versionQuery = useVersion(versionId);
  const restoreVersion = useRestoreVersion();
  const [isRestoreOpen, setRestoreOpen] = useState(false);

  function handleRestore() {
    restoreVersion.mutate(versionId, {
      onSuccess: () => {
        setRestoreOpen(false);
        toast.success('Đã khôi phục phiên bản');
        onBack();
      },
    });
  }

  let content: ReactNode;
  if (versionQuery.isLoading) content = <ViewerSkeleton />;
  else if (versionQuery.isError) {
    content = <ErrorState size="sm" message="Không tải được phiên bản" onRetry={() => void versionQuery.refetch()} />;
  } else if (!versionQuery.data) {
    content = <EmptyState icon={<FileClock aria-hidden="true" />} title="Không có dữ liệu phiên bản" size="sm" />;
  } else {
    content = (
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-3">
        {/* HTML do server dựng vẫn là dữ liệu không đáng tin. Iframe sandbox không cấp
            allow-scripts/allow-same-origin nên mã lạ không chạy trong DOM chính. */}
        <iframe
          title="Bản xem trước phiên bản"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={versionQuery.data.html}
          className="block h-full min-h-full w-full min-w-0 rounded-md border border-border bg-background"
        />
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ViewerHeader onBack={onBack} onRestore={versionQuery.data ? () => setRestoreOpen(true) : undefined} />
      {content}
      <RestoreDialog open={isRestoreOpen} isPending={restoreVersion.isPending} onOpenChange={setRestoreOpen} onConfirm={handleRestore} />
    </div>
  );
}
