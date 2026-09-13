'use client';

import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert/Alert';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Table } from '@/components/ui/table/Table';
import type { CurrentUserInfo } from '../../lib/current-user';
import type { MyPerformance, MyPerformanceProject } from '../../types';

interface MyPerformancePanelProps {
  projectId?: string;
  query: Pick<
    UseQueryResult<MyPerformance>,
    'data' | 'isPending' | 'isError' | 'isFetching' | 'refetch'
  >;
  currentUser: CurrentUserInfo | null;
}

const projectColumns: ColumnDef<MyPerformanceProject>[] = [
  {
    accessorKey: 'projectName',
    header: 'Project',
    cell: ({ getValue }) => (
      <span className="font-medium text-foreground">{getValue<string>()}</span>
    ),
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
    cell: ({ getValue }) => (
      <span className="font-semibold tabular-nums text-foreground">{getValue<number>()}</span>
    ),
  },
];

export function MyPerformancePanel({
  projectId,
  query,
  currentUser,
}: MyPerformancePanelProps) {
  const selectedProject = useMemo(
    () => query.data?.byProject.find((project) => project.projectId === projectId),
    [projectId, query.data?.byProject],
  );
  const completedTasks = projectId ? (selectedProject?.completedTasks ?? 0) : query.data?.completedTasks;
  const gems = projectId ? (selectedProject?.gems ?? 0) : query.data?.gems;
  const onTimeRate = projectId ? null : query.data?.onTimeRate;

  return (
    <Card className="-mx-4 overflow-hidden rounded-none border-x-0 shadow-none md:mx-0 md:rounded-2xl md:border-x md:shadow-[var(--shadow-subtle)]">
      <CardHeader className="px-4 py-4 md:px-5">
        <CardTitle className="text-lg">Hiệu suất của tôi</CardTitle>
      </CardHeader>

      {query.isPending ? (
        <CardContent
          role="status"
          aria-label="Đang tải hiệu suất của tôi"
          className="flex items-center gap-3 px-4 py-5 md:px-5"
        >
          <Skeleton rounded="full" className="h-6 w-6 shrink-0" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardContent>
      ) : query.isError ? (
        <CardContent className="p-4 md:p-5">
          <Alert variant="destructive">
            <AlertTitle>Không tải được hiệu suất của bạn.</AlertTitle>
            <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span>Kiểm tra kết nối rồi thử tải lại báo cáo.</span>
              <Button variant="danger-outline" size="sm" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : query.data ? (
        <div
          className={`transition-opacity duration-200 motion-reduce:transition-none ${query.isFetching ? 'opacity-60' : 'opacity-100'}`}
        >
          <CardContent className="flex items-center gap-3 px-4 py-5 md:px-5">
            <Avatar
              src={currentUser?.avatarUrl ?? undefined}
              alt={currentUser?.displayName ?? 'Bạn'}
              fallback={(currentUser?.displayName ?? 'Bạn').charAt(0).toUpperCase()}
              size="sm"
              className="h-6 w-6"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Bạn hoàn thành{' '}
              <strong className="font-semibold tabular-nums text-foreground">
                {completedTasks ?? 0}
              </strong>{' '}
              task ·{' '}
              <strong className="font-semibold tabular-nums text-foreground">{gems ?? 0}</strong>{' '}
              gem · đúng hạn{' '}
              <strong className="font-semibold tabular-nums text-foreground">
                {onTimeRate === null || onTimeRate === undefined ? '—' : `${onTimeRate}%`}
              </strong>
            </p>
          </CardContent>

          {!projectId && query.data.byProject.length >= 2 && (
            <div className="overflow-x-auto border-t border-border/70">
              <Table
                data={query.data.byProject}
                columns={projectColumns}
                enableSorting={false}
                pagination={false}
                className="min-w-[420px] rounded-none border-0 [&_td]:text-[13px]"
              />
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
