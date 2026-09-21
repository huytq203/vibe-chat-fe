'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Text } from '@/components/ui/typography/Typography';
import { CHANGE_REQUEST_STATUS_LABELS } from '../../lib/change-request-labels';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import {
  useChangeRequestsInfinite,
  useCreateChangeRequest,
} from '../../hooks/useChangeRequests';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { ChangeRequestFilters } from '../../hooks/useChangeRequests';
import type { ChangeRequestStatusValue } from '../../types';

const STATUS_VARIANT: Record<
  ChangeRequestStatusValue,
  'secondary' | 'soft-warning' | 'soft-success' | 'soft-danger'
> = {
  DRAFT: 'secondary',
  INTERNAL_APPROVED: 'soft-warning',
  SENT: 'soft-warning',
  CLIENT_APPROVED: 'soft-success',
  REJECTED: 'soft-danger',
};

export function ChangeRequestsTab({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<ChangeRequestFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const openDetail = useTasksUIStore((state) => state.openChangeRequestDetail);

  const changeRequests = useChangeRequestsInfinite(projectId, filters);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage: changeRequests.hasNextPage,
    isFetchingNextPage: changeRequests.isFetchingNextPage,
    onLoadMore: () => void changeRequests.fetchNextPage(),
  });

  const items = changeRequests.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ComboBox
          label="Trạng thái"
          value={filters.status ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(CHANGE_REQUEST_STATUS_LABELS).map(
              ([value, label]) => ({ value, label }),
            ),
          ]}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: ((Array.isArray(value) ? value[0] : value) ||
                undefined) as ChangeRequestStatusValue | undefined,
            }))
          }
          className="w-48"
        />
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Tạo yêu cầu thay đổi
        </Button>
      </div>

      {changeRequests.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Text size="sm" color="muted">
            Chưa có yêu cầu thay đổi nào.
          </Text>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
          >
            Tạo yêu cầu đầu tiên
          </Button>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto"
        >
          {items.map((cr) => (
            <button
              key={cr.id}
              type="button"
              onClick={() => openDetail(cr.id)}
              className="flex w-full flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{cr.title}</span>
                <Badge variant={STATUS_VARIANT[cr.status]} size="sm">
                  {CHANGE_REQUEST_STATUS_LABELS[cr.status]}
                </Badge>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {cr.impact}
              </p>
            </button>
          ))}
          {changeRequests.hasNextPage && (
            <div ref={sentinelRef} className="py-2 text-center">
              {changeRequests.isFetchingNextPage && (
                <Text size="xs" color="muted">
                  Đang tải thêm…
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      <CreateChangeRequestDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function CreateChangeRequestDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [cost, setCost] = useState('');
  const [timelineShiftDays, setTimelineShiftDays] = useState('');
  const [commitmentId, setCommitmentId] = useState('');
  const commitments = useQuery({
    queryKey: ['tasks', projectId, 'commitments', 'list'],
    queryFn: () => commitmentsApi.list(projectId),
  });
  const create = useCreateChangeRequest(projectId);

  const commitmentOptions = (commitments.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.title,
  }));

  function reset() {
    setTitle('');
    setImpact('');
    setEstimateHours('');
    setCost('');
    setTimelineShiftDays('');
    setCommitmentId('');
  }

  function handleSubmit() {
    create.mutate(
      {
        title: title.trim(),
        impact: impact.trim(),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        ...(timelineShiftDays
          ? { timelineShiftDays: Number(timelineShiftDays) }
          : {}),
        ...(commitmentId ? { commitmentId } : {}),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu thay đổi</DialogTitle>
          <DialogDescription>
            Một yêu cầu thay đổi phạm vi với khách hàng.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            label="Tiêu đề"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Textarea
            label="Tác động"
            value={impact}
            onChange={(event) => setImpact(event.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số giờ ước tính (không bắt buộc)"
              type="number"
              min={0}
              value={estimateHours}
              onChange={(event) => setEstimateHours(event.target.value)}
            />
            <Input
              label="Chi phí ước tính (không bắt buộc)"
              type="number"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
          <Input
            label="Số ngày dịch tiến độ (không bắt buộc)"
            type="number"
            value={timelineShiftDays}
            onChange={(event) => setTimelineShiftDays(event.target.value)}
          />
          <ComboBox
            label="Cam kết liên quan (không bắt buộc)"
            value={commitmentId}
            options={commitmentOptions}
            onValueChange={(value) =>
              setCommitmentId(
                Array.isArray(value) ? (value[0] ?? '') : value,
              )
            }
            placeholder="Chọn cam kết"
            emptyText="Chưa có cam kết nào."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !impact.trim()}
            isLoading={create.isPending}
          >
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
