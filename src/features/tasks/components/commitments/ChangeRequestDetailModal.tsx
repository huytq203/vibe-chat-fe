'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';
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
import {
  useChangeRequestDetail,
  useRemoveChangeRequestSourceRef,
  useTransitionChangeRequest,
  useUpdateChangeRequest,
} from '../../hooks/useChangeRequests';
import { CHANGE_REQUEST_STATUS_LABELS } from '../../lib/change-request-labels';
import { changeRequestsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type {
  ChangeRequestStatusValue,
  ChangeRequestSummary,
  SourceRef,
} from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function ChangeRequestDetailModal({
  projectId,
}: {
  projectId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const selectedId = useTasksUIStore(
    (state) => state.selectedChangeRequestId,
  );
  const close = useTasksUIStore((state) => state.closeChangeRequestDetail);
  const detail = useChangeRequestDetail(selectedId ?? '');

  return (
    <Dialog open={selectedId !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
        {detail.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.data ? (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {detail.data.title}
                <Badge variant="secondary" size="sm">
                  {CHANGE_REQUEST_STATUS_LABELS[detail.data.status]}
                </Badge>
                {detail.data.status !== 'CLIENT_APPROVED' &&
                  detail.data.status !== 'REJECTED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransitionOpen(true)}
                    >
                      Chuyển trạng thái
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sửa yêu cầu thay đổi"
                  className="ml-auto"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <p className="text-sm text-foreground">{detail.data.impact}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField
                  label="Số giờ ước tính"
                  value={
                    detail.data.estimateHours != null
                      ? String(detail.data.estimateHours)
                      : '—'
                  }
                />
                <InfoField
                  label="Chi phí ước tính"
                  value={
                    detail.data.cost != null
                      ? `${detail.data.cost} ${detail.data.currency}`
                      : '—'
                  }
                />
                <InfoField
                  label="Dịch tiến độ"
                  value={
                    detail.data.timelineShiftDays != null
                      ? `${detail.data.timelineShiftDays} ngày`
                      : '—'
                  }
                />
                <InfoField
                  label="Cam kết liên quan"
                  value={detail.data.commitmentId ?? '—'}
                />
                <InfoField
                  label="Đã gửi khách lúc"
                  value={formatDate(detail.data.sentAt)}
                />
                <InfoField
                  label="Khách duyệt bởi"
                  value={detail.data.clientApprovedOnBehalfOf ?? '—'}
                />
                {detail.data.rejectReason && (
                  <InfoField
                    label="Lý do từ chối"
                    value={detail.data.rejectReason}
                  />
                )}
              </div>

              <Section title="Nguồn tham chiếu">
                {detail.data.sourceRefs.length === 0 ? (
                  <EmptyText>Chưa gắn nguồn tham chiếu.</EmptyText>
                ) : (
                  <SourceRefList
                    changeRequestId={detail.data.id}
                    refs={detail.data.sourceRefs}
                  />
                )}
              </Section>
            </div>

            <EditChangeRequestDialog
              projectId={projectId}
              changeRequest={detail.data}
              open={editOpen}
              onOpenChange={setEditOpen}
            />
            <TransitionDialog
              projectId={projectId}
              changeRequest={detail.data}
              open={transitionOpen}
              onOpenChange={setTransitionOpen}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" color="muted">
        {label}
      </Text>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" color="muted">
      {children}
    </Text>
  );
}

function SourceRefList({
  changeRequestId,
  refs,
}: {
  changeRequestId: string;
  refs: SourceRef[];
}) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);
  const removeSourceRef = useRemoveChangeRequestSourceRef(changeRequestId);

  return (
    <ul className="space-y-1.5">
      {refs.map((sourceRef) => (
        <li key={sourceRef.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span>
              {sourceRef.type === 'CHAT_MESSAGE'
                ? 'Tin nhắn chat'
                : sourceRef.type}
            </span>
            {sourceRef.type === 'CHAT_MESSAGE' && (
              <button
                type="button"
                className="text-xs font-medium text-primary underline"
                onClick={() =>
                  setOpenRefId(
                    openRefId === sourceRef.id ? null : sourceRef.id,
                  )
                }
              >
                {openRefId === sourceRef.id ? 'Ẩn nội dung' : 'Xem nội dung'}
              </button>
            )}
            <button
              type="button"
              aria-label="Gỡ nguồn tham chiếu"
              className="ml-auto text-muted-foreground hover:text-danger"
              onClick={() => removeSourceRef.mutate(sourceRef.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {openRefId === sourceRef.id && (
            <SourceRefContent
              changeRequestId={changeRequestId}
              refId={sourceRef.id}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceRefContent({
  changeRequestId,
  refId,
}: {
  changeRequestId: string;
  refId: string;
}) {
  const content = useQuery({
    queryKey: [
      'tasks',
      'change-request',
      changeRequestId,
      'source-ref-content',
      refId,
    ],
    queryFn: () =>
      changeRequestsApi.getSourceRefContent(changeRequestId, refId),
  });

  if (content.isPending) return <Skeleton className="mt-1 h-8 w-full" />;
  if (!content.data || content.data.length === 0) {
    return <EmptyText>Không tìm được nội dung tin nhắn.</EmptyText>;
  }

  return (
    <ul className="mt-1 space-y-1 rounded-lg bg-muted/50 p-2">
      {content.data.map((message) => (
        <li key={message.uuid} className="text-xs text-muted-foreground">
          {message.previewText}
        </li>
      ))}
    </ul>
  );
}

function EditChangeRequestDialog({
  projectId,
  changeRequest,
  open,
  onOpenChange,
}: {
  projectId: string;
  changeRequest: ChangeRequestSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(changeRequest.title);
  const [impact, setImpact] = useState(changeRequest.impact);
  const [estimateHours, setEstimateHours] = useState(
    changeRequest.estimateHours != null
      ? String(changeRequest.estimateHours)
      : '',
  );
  const [cost, setCost] = useState(changeRequest.cost ?? '');
  const [timelineShiftDays, setTimelineShiftDays] = useState(
    changeRequest.timelineShiftDays != null
      ? String(changeRequest.timelineShiftDays)
      : '',
  );
  const update = useUpdateChangeRequest(projectId, changeRequest.id);

  function handleSubmit() {
    update.mutate(
      {
        title: title.trim(),
        impact: impact.trim(),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        ...(timelineShiftDays
          ? { timelineShiftDays: Number(timelineShiftDays) }
          : {}),
        version: changeRequest.version,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa yêu cầu thay đổi</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin yêu cầu thay đổi.
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
              label="Số giờ ước tính"
              type="number"
              min={0}
              value={estimateHours}
              onChange={(event) => setEstimateHours(event.target.value)}
            />
            <Input
              label="Chi phí ước tính"
              type="number"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </div>
          <Input
            label="Số ngày dịch tiến độ"
            type="number"
            value={timelineShiftDays}
            onChange={(event) => setTimelineShiftDays(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !impact.trim()}
            isLoading={update.isPending}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransitionDialog({
  projectId,
  changeRequest,
  open,
  onOpenChange,
}: {
  projectId: string;
  changeRequest: ChangeRequestSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState<ChangeRequestStatusValue>(
    (Object.keys(
      CHANGE_REQUEST_STATUS_LABELS,
    ) as ChangeRequestStatusValue[]).find(
      (status) => status !== changeRequest.status,
    )!,
  );
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [reason, setReason] = useState('');
  const transition = useTransitionChangeRequest(projectId, changeRequest.id);

  const needsOnBehalfOf = to === 'CLIENT_APPROVED';
  const needsReason = to === 'REJECTED';
  const canSubmit =
    (!needsOnBehalfOf || onBehalfOf.trim().length > 0) &&
    (!needsReason || reason.trim().length > 0);

  function handleSubmit() {
    transition.mutate(
      {
        to,
        version: changeRequest.version,
        ...(needsOnBehalfOf ? { onBehalfOf: onBehalfOf.trim() } : {}),
        ...(needsReason ? { reason: reason.trim() } : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển trạng thái yêu cầu thay đổi</DialogTitle>
          <DialogDescription>
            Đang ở &quot;
            {CHANGE_REQUEST_STATUS_LABELS[changeRequest.status]}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Chuyển đến"
            value={to}
            options={Object.entries(CHANGE_REQUEST_STATUS_LABELS)
              .filter(([value]) => value !== changeRequest.status)
              .map(([value, label]) => ({ value, label }))}
            onValueChange={(value) =>
              setTo(
                (Array.isArray(value)
                  ? value[0]
                  : value) as ChangeRequestStatusValue,
              )
            }
          />
          {needsOnBehalfOf && (
            <Input
              label="Người xác nhận phía khách"
              value={onBehalfOf}
              onChange={(event) => setOnBehalfOf(event.target.value)}
              required
            />
          )}
          {needsReason && (
            <Textarea
              label="Lý do từ chối"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={transition.isPending}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
