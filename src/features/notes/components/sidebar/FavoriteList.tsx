'use client';

import { FileText } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useFavorites } from '@/features/notes/hooks/use-query';

const FAVORITE_SKELETON_COUNT = 2;
const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FavoriteListProps {
  onSelectPage: (id: string) => void;
}

function FavoriteHeading() {
  return (
    <div id="favorite-heading" className="flex h-[30px] items-center pl-4 text-xs font-medium leading-3 text-muted-foreground">
      Ghim
    </div>
  );
}

function FavoriteListSkeleton() {
  return (
    <section aria-labelledby="favorite-heading">
      <FavoriteHeading />
      <div className="space-y-px px-2" data-testid="favorite-list-loading">
        {Array.from({ length: FAVORITE_SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} rounded="sm" className="h-[30px] w-full" />
        ))}
      </div>
    </section>
  );
}

export function FavoriteList({ onSelectPage }: FavoriteListProps) {
  const { data, isLoading, isError, refetch } = useFavorites();

  if (isLoading) return <FavoriteListSkeleton />;
  if (isError) {
    return (
      <section aria-labelledby="favorite-heading">
        <FavoriteHeading />
        <ErrorState message="Không tải được trang ghim" size="sm" onRetry={refetch} />
      </section>
    );
  }
  if (!data || data.length === 0) return null;

  const favorites = [...data].sort((left, right) =>
    left.sortKey === right.sortKey ? 0 : left.sortKey < right.sortKey ? -1 : 1,
  );

  return (
    <section aria-labelledby="favorite-heading">
      <FavoriteHeading />
      <ul className="space-y-px px-2">
        {favorites.map((favorite) => {
          const title = favorite.title || 'Không có tiêu đề';
          return (
            <li key={favorite.pageId}>
              <Button
                variant="ghost"
                className={`h-[30px] w-full justify-start rounded-sm px-3 text-sm font-normal text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground [&>div]:w-full [&>div]:min-w-0 [&>div]:gap-2.5 ${focusRingClassName}`}
                onClick={() => onSelectPage(favorite.pageId)}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden="true">
                  {favorite.icon ? (
                    <span className="text-sm leading-none">{favorite.icon}</span>
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
