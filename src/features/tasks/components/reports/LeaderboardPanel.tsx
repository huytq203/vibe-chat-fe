'use client';

import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert/Alert';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Table } from '@/components/ui/table/Table';
import type { CurrentUserInfo } from '../../lib/current-user';
import type { Leaderboard, LeaderboardEntry } from '../../types';

interface LeaderboardPanelProps {
  query: Pick<
    UseQueryResult<Leaderboard>,
    'data' | 'isPending' | 'isError' | 'isFetching' | 'refetch'
  >;
  currentUser: CurrentUserInfo | null;
}

function LeaderboardSkeleton() {
  return (
    <div role="status" aria-label="Đang tải khối lượng theo thành viên" className="px-4 pb-4">
      <div className="grid grid-cols-[minmax(140px,1fr)_80px_150px_90px] gap-3 border-b border-border py-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(140px,1fr)_80px_150px_90px] items-center gap-3 border-b border-border/70 py-3"
        >
          <div className="flex items-center gap-2">
            <Skeleton rounded="full" className="h-6 w-6" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="ml-auto h-4 w-8" />
          <Skeleton className="ml-auto h-6 w-28" />
          <Skeleton className="ml-auto h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardPanel({ query, currentUser }: LeaderboardPanelProps) {
  const entries = useMemo(
    () => [...(query.data?.entries ?? [])].sort((left, right) => right.gems - left.gems),
    [query.data?.entries],
  );
  const maxGem = Math.max(...entries.map((entry) => entry.gems), 1);

  const columns = useMemo<ColumnDef<LeaderboardEntry>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Thành viên',
        cell: ({ row }) => {
          const entry = row.original;
          const isCurrentUser = entry.userId === currentUser?.userId;
          return (
            <div
              data-current-user={isCurrentUser ? 'true' : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              <Avatar
                src={isCurrentUser ? (currentUser?.avatarUrl ?? undefined) : undefined}
                alt={entry.displayName}
                fallback={entry.displayName.charAt(0).toUpperCase()}
                size="sm"
                className="h-6 w-6"
              />
              <span className="truncate text-sm font-medium text-foreground">
                {entry.displayName}
              </span>
              {isCurrentUser && (
                <Badge variant="soft-primary" size="sm">
                  Bạn
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'completedTasks',
        header: 'Task xong',
        meta: { align: 'right' },
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'gems',
        header: 'Gem',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const gems = getValue<number>();
          return (
            <div className="flex w-36 items-center justify-end gap-2">
              <span className="w-10 text-right font-semibold tabular-nums text-foreground">
                {gems}
              </span>
              <div
                role="img"
                aria-label={`${gems} trên ${maxGem} gem`}
                className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${Math.round((gems / maxGem) * 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'onTimeRate',
        header: 'Đúng hạn',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const rate = getValue<number | null>();
          return (
            <span className="tabular-nums text-muted-foreground">
              {rate === null ? '—' : `${rate}%`}
            </span>
          );
        },
      },
    ],
    [currentUser, maxGem],
  );

  return (
    <Card className="-mx-4 overflow-hidden rounded-none border-x-0 shadow-none md:mx-0 md:rounded-2xl md:border-x md:shadow-[var(--shadow-subtle)]">
      <CardHeader className="px-4 py-4 md:px-5">
        <CardTitle className="text-lg">Khối lượng theo thành viên</CardTitle>
      </CardHeader>

      {query.isPending ? (
        <LeaderboardSkeleton />
      ) : query.isError ? (
        <CardContent className="p-4 md:p-5">
          <Alert variant="destructive">
            <AlertTitle>Không tải được khối lượng theo thành viên.</AlertTitle>
            <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span>Kiểm tra kết nối rồi thử tải lại báo cáo.</span>
              <Button variant="danger-outline" size="sm" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : entries.length === 0 ? (
        <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
          Chưa có task nào hoàn thành trong kỳ này. Đổi kỳ báo cáo hoặc tạo task đầu tiên.
        </CardContent>
      ) : (
        <div
          className={`overflow-x-auto transition-opacity duration-200 motion-reduce:transition-none ${query.isFetching ? 'opacity-60' : 'opacity-100'}`}
        >
          <Table
            data={entries}
            columns={columns}
            enableSorting={false}
            pagination={false}
            className="min-w-[560px] rounded-none border-0 [&_tr:has([data-current-user])]:bg-accent/60 [&_td]:text-[13px]"
          />
        </div>
      )}
    </Card>
  );
}
