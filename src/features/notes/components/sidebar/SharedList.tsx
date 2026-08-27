'use client';

import { FileText } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useSharedPages } from '@/features/notes/hooks/use-query';

const SHARED_SKELETON_COUNT = 2;
const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface SharedListProps {
  workspaceId: string;
  isGuest: boolean;
  onSelectPage: (id: string) => void;
}

function SharedHeading() {
  return (
    <div id="shared-heading" className="flex h-8 items-center px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Được chia sẻ với tôi
    </div>
  );
}

function SharedListSkeleton() {
  return (
    <section aria-labelledby="shared-heading">
      <SharedHeading />
      <div className="space-y-px px-2" data-testid="shared-list-loading">
        {Array.from({ length: SHARED_SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} rounded="sm" className="h-11 w-full md:h-9" />
        ))}
      </div>
    </section>
  );
}

export function SharedList({ workspaceId, isGuest, onSelectPage }: SharedListProps) {
  const { data, isLoading, isError, refetch } = useSharedPages(workspaceId);

  if (isLoading) return <SharedListSkeleton />;
  if (isError) {
    return (
      <section aria-labelledby="shared-heading">
        <SharedHeading />
        <ErrorState message="Không tải được trang được chia sẻ" size="sm" onRetry={refetch} />
      </section>
    );
  }
  if (!data || data.length === 0) {
    // Member có cây trang riêng nên mục rỗng chỉ làm rác sidebar. Guest thì đây
    // là bề mặt điều hướng DUY NHẤT của họ, rỗng cũng phải nói rõ vì sao.
    if (!isGuest) return null;
    return (
      <section aria-labelledby="shared-heading">
        <SharedHeading />
        <p className="px-4 py-2 text-xs text-muted-foreground">
          Chưa có trang nào được chia sẻ với bạn.
        </p>
      </section>
    );
  }

  // GIỮ NGUYÊN thứ tự server trả về (updatedAt giảm dần). KHÔNG sắp lại theo
  // `sortKey` như FavoriteList: sortKey chỉ xếp thứ tự giữa các trang CÙNG CHA,
  // nên đem so giữa những trang rải rác khắp cây sẽ ra thứ tự tuỳ tiện.
  return (
    <section aria-labelledby="shared-heading">
      <SharedHeading />
      <ul className="space-y-px px-2">
        {data.map((page) => {
          const title = page.title || 'Không có tiêu đề';
          return (
            <li key={page.id}>
              <Button
                variant="ghost"
                className={`h-11 w-full justify-start rounded-lg px-3 text-sm font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 [&>div]:w-full [&>div]:min-w-0 [&>div]:gap-2.5 ${focusRingClassName}`}
                onClick={() => onSelectPage(page.id)}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden="true">
                  {page.icon ? (
                    <span className="text-sm leading-none">{page.icon}</span>
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{title}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
