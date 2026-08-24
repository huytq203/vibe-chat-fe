'use client';

import { FilePlus2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useCreatePage } from '@/features/notes/hooks/use-mutations';
import { usePageChildren } from '@/features/notes/hooks/use-query';
import { PageTreeRow } from './PageTreeRow';

const ROOT_SKELETON_COUNT = 5;

interface PageTreeProps {
  workspaceId: string;
  activePageId: string | null;
  onSelectPage: (id: string) => void;
}

function PageTreeSkeleton() {
  return (
    <div className="space-y-px px-2" data-testid="page-tree-loading">
      {Array.from({ length: ROOT_SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-[30px] w-full" />
      ))}
    </div>
  );
}

export function PageTree({ workspaceId, activePageId, onSelectPage }: PageTreeProps) {
  const { data, isLoading, isError, refetch } = usePageChildren(workspaceId, null);
  const createPage = useCreatePage();

  function handleCreateFirstPage() {
    createPage.mutate(
      { workspaceId, parentId: undefined },
      { onSuccess: (page) => onSelectPage(page.id) },
    );
  }

  if (isLoading) {
    return (
      <div role="tree" aria-label="Cây trang">
        <PageTreeSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="tree" aria-label="Cây trang">
        <ErrorState size="sm" onRetry={refetch} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div role="tree" aria-label="Cây trang">
        <EmptyState
          size="sm"
          icon={<FilePlus2 aria-hidden="true" className="h-8 w-8" />}
          title="Chưa có trang nào"
          action={
            <Button
              size="xs"
              variant="ghost"
              className="border border-border text-foreground hover:bg-sidebar-accent"
              isLoading={createPage.isPending}
              onClick={handleCreateFirstPage}
            >
              Tạo trang đầu tiên
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div role="tree" aria-label="Cây trang" className="space-y-px px-2">
      {data.map((page) => (
        <PageTreeRow
          key={page.id}
          workspaceId={workspaceId}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
          page={page}
          depth={0}
        />
      ))}
    </div>
  );
}
