'use client';

import { useRef, useState } from 'react';
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
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Text } from '@/components/ui/typography/Typography';
import {
  DELIVERY_STATUS_LABELS,
  RISK_LABELS,
  SCOPE_STATUS_LABELS,
} from '../../lib/commitment-labels';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMembers } from '../../hooks/useMembers';
import {
  useCommitmentsInfinite,
  useCreateCommitment,
} from '../../hooks/useCommitments';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { CommitmentFilters } from '../../hooks/useCommitments';
import type {
  CommitmentRiskCode,
  CommitmentSummary,
  DeliveryStatus,
} from '../../types';
import { CommitmentDetailModal } from './CommitmentDetailModal';

const DELIVERY_STATUS_VARIANT: Record<
  DeliveryStatus,
  'secondary' | 'soft-warning' | 'soft-success' | 'soft-danger'
> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'secondary',
  READY: 'soft-warning',
  DELIVERED: 'soft-warning',
  ACCEPTED: 'soft-success',
  CHANGES_REQUESTED: 'soft-danger',
  CANCELLED: 'soft-danger',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function isOverdue(commitment: CommitmentSummary): boolean {
  if (!commitment.dueAt) return false;
  if (
    commitment.deliveryStatus === 'ACCEPTED' ||
    commitment.deliveryStatus === 'CANCELLED'
  ) {
    return false;
  }
  return new Date(commitment.dueAt) < new Date();
}

export function CommitmentsTab({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<CommitmentFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const openDetail = useTasksUIStore((state) => state.openCommitmentDetail);

  const commitments = useCommitmentsInfinite(projectId, filters);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage: commitments.hasNextPage,
    isFetchingNextPage: commitments.isFetchingNextPage,
    onLoadMore: () => void commitments.fetchNextPage(),
  });

  const items = commitments.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ComboBox
          label="Trạng thái bàn giao"
          value={filters.deliveryStatus ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(DELIVERY_STATUS_LABELS).map(
              ([value, label]) => ({ value, label }),
            ),
          ]}
          onValueChange={(value) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              deliveryStatus: ((Array.isArray(value) ? value[0] : value) ||
                undefined) as DeliveryStatus | undefined,
            }))
          }
          className="w-48"
        />
        <ComboBox
          label="Phạm vi"
          value={filters.scopeStatus ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(SCOPE_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onValueChange={(value) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              scopeStatus: ((Array.isArray(value) ? value[0] : value) ||
                undefined) as
                | 'IN_SCOPE'
                | 'UNCLEAR'
                | 'OUT_OF_SCOPE'
                | undefined,
            }))
          }
          className="w-44"
        />
        <ComboBox
          label="Rủi ro"
          value={filters.risk ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(RISK_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onValueChange={(value) =>
            setFilters((currentFilters) => ({
              ...currentFilters,
              risk: ((Array.isArray(value) ? value[0] : value) ||
                undefined) as CommitmentRiskCode | undefined,
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
          Tạo cam kết
        </Button>
      </div>

      {commitments.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Text size="sm" color="muted">
            Chưa có cam kết nào.
          </Text>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
          >
            Tạo cam kết đầu tiên
          </Button>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto"
        >
          {items.map((commitment) => (
            <button
              key={commitment.id}
              type="button"
              onClick={() => openDetail(commitment.id)}
              className="flex w-full flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {commitment.title}
                </span>
                <Badge
                  variant={DELIVERY_STATUS_VARIANT[commitment.deliveryStatus]}
                  size="sm"
                >
                  {DELIVERY_STATUS_LABELS[commitment.deliveryStatus]}
                </Badge>
                {commitment.risks.slice(0, 2).map((risk) => (
                  <Badge key={risk} variant="soft-danger" size="sm">
                    {RISK_LABELS[risk]}
                  </Badge>
                ))}
                {commitment.risks.length > 2 && (
                  <Badge variant="soft-danger" size="sm">
                    +{commitment.risks.length - 2}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {commitment.contact && <span>{commitment.contact.name}</span>}
                <span
                  className={
                    isOverdue(commitment)
                      ? 'font-medium text-danger'
                      : undefined
                  }
                >
                  Hạn: {formatDate(commitment.dueAt)}
                </span>
              </div>
            </button>
          ))}
          {commitments.hasNextPage && (
            <div ref={sentinelRef} className="py-2 text-center">
              {commitments.isFetchingNextPage && (
                <Text size="xs" color="muted">
                  Đang tải thêm…
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      <CreateCommitmentDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <CommitmentDetailModal projectId={projectId} />
    </div>
  );
}

function CreateCommitmentDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const members = useMembers(projectId);
  const create = useCreateCommitment(projectId);

  const memberOptions = (members.data ?? []).map((member) => ({
    value: member.userId,
    label: member.displayName,
  }));

  function reset() {
    setTitle('');
    setDescription('');
    setOwnerId('');
    setDueAt(undefined);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  }

  function handleSubmit() {
    create.mutate(
      {
        title: title.trim(),
        ...(description.trim()
          ? { description: description.trim() }
          : {}),
        ...(ownerId ? { ownerId } : {}),
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
        scopeStatus: 'UNCLEAR',
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo cam kết</DialogTitle>
          <DialogDescription>
            Một cam kết mới với khách hàng.
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
            label="Mô tả (không bắt buộc)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <ComboBox
            label="Người chịu trách nhiệm (không bắt buộc)"
            value={ownerId}
            options={memberOptions}
            onValueChange={(value) =>
              setOwnerId(Array.isArray(value) ? (value[0] ?? '') : value)
            }
            placeholder="Chọn thành viên"
            emptyText="Không có thành viên."
          />
          <DatePicker
            mode="single"
            editable
            label="Hạn hoàn thành (không bắt buộc)"
            placeholder="dd/mm/yyyy"
            value={dueAt}
            onChange={(date) =>
              setDueAt(date instanceof Date ? date : undefined)
            }
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            isLoading={create.isPending}
          >
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
