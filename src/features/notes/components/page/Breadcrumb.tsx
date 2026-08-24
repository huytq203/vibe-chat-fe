'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useBreadcrumb } from '@/features/notes/hooks/use-query';
import type { Breadcrumb as BreadcrumbData } from '@/features/notes/types';

interface BreadcrumbProps {
  pageId: string;
  onSelectPage: (id: string) => void;
}

function BreadcrumbFrame({ children }: { children?: React.ReactNode }) {
  return (
    <nav aria-label="Đường dẫn trang" className="h-[44px] overflow-hidden px-6">
      {children}
    </nav>
  );
}

interface BreadcrumbItemsProps {
  items: BreadcrumbData;
  onSelectPage: (id: string) => void;
}

function BreadcrumbItems({ items, onSelectPage }: BreadcrumbItemsProps) {
  return (
    <ol className="flex h-full min-w-0 items-center text-sm font-normal">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        const title = item.title || 'Không có tiêu đề';
        return (
          <li key={item.id} className="flex min-w-0 items-center">
            {index > 0 && <span aria-hidden="true" className="px-1 text-muted-foreground">/</span>}
            {isCurrent ? (
              <span aria-current="page" className="truncate text-foreground">{title}</span>
            ) : (
              <Button
                variant="ghost" size="xs"
                className="h-auto min-w-0 rounded-sm px-1 py-1 font-normal text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground"
                onClick={() => onSelectPage(item.id)}
              >
                <span className="truncate">{title}</span>
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Breadcrumb({ pageId, onSelectPage }: BreadcrumbProps) {
  const { data, isLoading, isError, refetch } = useBreadcrumb(pageId);

  if (isLoading) {
    return (
      <BreadcrumbFrame>
        <div className="flex h-full items-center">
          <Skeleton rounded="sm" className="h-4 w-24" />
        </div>
      </BreadcrumbFrame>
    );
  }
  if (isError) {
    return (
      <BreadcrumbFrame>
        <div className="flex h-full items-center gap-2 text-sm text-muted-foreground" role="alert">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">Không tải được đường dẫn trang</span>
          <Button variant="ghost" size="xs" className="ml-auto text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      </BreadcrumbFrame>
    );
  }
  if (!data || data.length === 0) return <BreadcrumbFrame />;

  return (
    <BreadcrumbFrame>
      <BreadcrumbItems items={data} onSelectPage={onSelectPage} />
    </BreadcrumbFrame>
  );
}
