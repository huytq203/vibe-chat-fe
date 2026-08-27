'use client';

import { differenceInCalendarDays } from 'date-fns';
import { FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { usePurgeTrash, useRestoreTrash } from '@/features/notes/hooks/use-mutations';
import { useTrash } from '@/features/notes/hooks/use-query';
import type { TrashItem } from '@/features/notes/types';

// Phải khớp TRASH_RETENTION_DAYS ở BE (.env, mặc định 30) — BE không trả kèm
// giá trị này trong TrashItem nên FE không có cách đọc động.
const TRASH_RETENTION_DAYS = 30;

function daysRemaining(deletedAt: string): number {
  const elapsed = differenceInCalendarDays(new Date(), new Date(deletedAt));
  return Math.max(0, TRASH_RETENTION_DAYS - elapsed);
}

function TrashListSkeleton() {
  return (
    <div data-testid="trash-list-loading" className="space-y-2 p-4">
      {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-12 w-full" />)}
    </div>
  );
}

interface PurgeDialogProps {
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

function PurgeDialog({ isPending, onConfirm, onOpenChange, open, title }: PurgeDialogProps) {
  const [typedTitle, setTypedTitle] = useState('');
  const nameMatches = typedTitle.trim() === title;

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (isPending) return;
      onOpenChange(nextOpen);
      if (!nextOpen) setTypedTitle('');
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá vĩnh viễn «{title}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Trang và mọi trang con sẽ bị xoá vĩnh viễn, không thể khôi phục. Gõ chính xác
            tên trang để xác nhận.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Tên trang cần nhập:{' '}
            <span className="break-words font-medium text-foreground">{title}</span>
          </p>
          <Input
            value={typedTitle}
            onChange={(event) => setTypedTitle(event.target.value)}
            placeholder={title}
            aria-label="Nhập tên trang để xác nhận"
          />
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="ghost" size="sm" disabled={isPending}
            onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" variant="danger" size="sm" disabled={!nameMatches}
            isLoading={isPending} onClick={onConfirm}>
            Xác nhận xoá vĩnh viễn
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TrashRow({ item, workspaceId }: { item: TrashItem; workspaceId: string }) {
  const restore = useRestoreTrash();
  const purge = usePurgeTrash();
  const [isPurgeOpen, setPurgeOpen] = useState(false);
  const title = item.title || 'Không có tiêu đề';
  const remaining = daysRemaining(item.deletedAt);

  function handleRestore() {
    restore.mutate(
      { pageId: item.id, workspaceId, parentId: item.parentId },
      { onSuccess: () => toast.success('Đã khôi phục trang') },
    );
  }

  function handlePurge() {
    purge.mutate(
      { pageId: item.id, workspaceId },
      { onSuccess: () => { setPurgeOpen(false); toast.success('Đã xoá vĩnh viễn'); } },
    );
  }

  return (
    <li className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
          {item.icon ? <span className="text-base leading-none">{item.icon}</span> : <FileText className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{title}</span>
          {item.parentTitle && (
            <span className="block truncate text-xs text-muted-foreground">
              trong «{item.parentTitle}»
            </span>
          )}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
        <span className="me-auto shrink-0 text-xs text-muted-foreground sm:me-1">
          {remaining > 0 ? `còn ${remaining} ngày` : 'sắp bị xoá'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="max-sm:h-11"
          isLoading={restore.isPending}
          onClick={handleRestore}
        >
          Khôi phục
        </Button>
        <Button
          type="button"
          variant="danger-outline"
          size="xs"
          className="max-sm:h-11"
          onClick={() => setPurgeOpen(true)}
        >
          Xoá vĩnh viễn
        </Button>
      </div>
      <PurgeDialog
        open={isPurgeOpen}
        title={title}
        isPending={purge.isPending}
        onOpenChange={setPurgeOpen}
        onConfirm={handlePurge}
      />
    </li>
  );
}

interface TrashListProps {
  workspaceId: string;
}

export function TrashList({ workspaceId }: TrashListProps) {
  const trashQuery = useTrash(workspaceId);

  if (trashQuery.isLoading) return <TrashListSkeleton />;
  if (trashQuery.isError) {
    return (
      <ErrorState message="Không tải được thùng rác" onRetry={() => void trashQuery.refetch()} />
    );
  }
  if (!trashQuery.data?.length) {
    return <EmptyState icon={<Trash2 aria-hidden="true" />} title="Thùng rác trống" />;
  }

  return (
    <ul className="divide-y divide-border">
      {trashQuery.data.map((item) => <TrashRow key={item.id} item={item} workspaceId={workspaceId} />)}
    </ul>
  );
}
