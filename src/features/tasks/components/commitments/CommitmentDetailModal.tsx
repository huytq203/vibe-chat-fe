'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
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
  DELIVERY_STATUS_LABELS,
  EVIDENCE_MILESTONE_LABELS,
  RISK_LABELS,
  SCOPE_STATUS_LABELS,
} from '../../lib/commitment-labels';
import { useProjectClient } from '../../hooks/useClient';
import { useMembers } from '../../hooks/useMembers';
import {
  useAddEvidence,
  useCommitmentDetail,
  useLinkExistingTask,
  useRemoveSourceRef,
  useTransitionCommitment,
  useUnlinkTask,
  useUpdateCommitment,
} from '../../hooks/useCommitments';
import { useProjectScope } from '../../hooks/useScope';
import { useProjectRole } from '../../hooks/useProjectRole';
import { commitmentsApi } from '../../services/commitments.api';
import { tasksApi } from '../../services/tasks.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { CommitmentDetail, DeliveryStatus, SourceRef } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function CommitmentDetailModal({ projectId }: { projectId: string }) {
  const { canManage } = useProjectRole(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const selectedId = useTasksUIStore((state) => state.selectedCommitmentId);
  const close = useTasksUIStore((state) => state.closeCommitmentDetail);
  const detail = useCommitmentDetail(selectedId ?? '');
  const members = useMembers(projectId);
  const unlinkTask = useUnlinkTask(projectId, selectedId ?? '');

  const ownerName = (ownerId: string | null) =>
    ownerId
      ? (members.data ?? []).find((member) => member.userId === ownerId)
          ?.displayName ?? ownerId
      : 'Chưa có người phụ trách';

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
                  {DELIVERY_STATUS_LABELS[detail.data.deliveryStatus]}
                </Badge>
                {canManage && detail.data.deliveryStatus !== 'ACCEPTED' &&
                  detail.data.deliveryStatus !== 'CANCELLED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransitionOpen(true)}
                    >
                      Chuyển trạng thái
                    </Button>
                  )}
                <Badge variant="soft-primary" size="sm">
                  {SCOPE_STATUS_LABELS[detail.data.scopeStatus]}
                </Badge>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Sửa cam kết"
                    className="ml-auto"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              {detail.data.isReadyToDeliver && (
                <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                  Đã sẵn sàng bàn giao
                </div>
              )}

              {detail.data.risks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.data.risks.map((risk) => (
                    <Badge key={risk} variant="soft-danger" size="sm">
                      {RISK_LABELS[risk]}
                    </Badge>
                  ))}
                </div>
              )}

              {detail.data.description && (
                <p className="text-sm text-foreground">
                  {detail.data.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField
                  label="Khách hàng"
                  value={detail.data.contact?.name ?? '—'}
                />
                <InfoField
                  label="Người phụ trách"
                  value={ownerName(detail.data.ownerId)}
                />
                <InfoField
                  label="Đã hứa lúc"
                  value={formatDate(detail.data.promisedAt)}
                />
                <InfoField
                  label="Hạn hoàn thành"
                  value={formatDate(detail.data.dueAt)}
                />
                <InfoField
                  label="Đã bàn giao lúc"
                  value={formatDate(detail.data.deliveredAt)}
                />
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                  Task liên kết
                </h3>
                {detail.data.tasks.length === 0 ? (
                  <EmptyText>Chưa liên kết task nào.</EmptyText>
                ) : (
                  <ul className="space-y-1">
                    {detail.data.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span>{task.title}</span>
                        {task.completedAt && (
                          <Badge variant="soft-success" size="sm">
                            Hoàn thành
                          </Badge>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            aria-label={`Gỡ ${task.title}`}
                            className="text-muted-foreground hover:text-danger"
                            onClick={() => unlinkTask.mutate(task.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canManage && (
                  <LinkTaskPicker
                    projectId={projectId}
                    commitment={detail.data}
                  />
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Bằng chứng
                  </h3>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddEvidenceOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm
                    </Button>
                  )}
                </div>
                {detail.data.evidence.length === 0 ? (
                  <EmptyText>Chưa có bằng chứng.</EmptyText>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.data.evidence.map((evidence) => (
                      <li key={evidence.id} className="text-sm">
                        <span className="font-medium">
                          {EVIDENCE_MILESTONE_LABELS[evidence.milestone]}
                        </span>
                        {': '}
                        {evidence.type === 'URL' && evidence.url ? (
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {evidence.url}
                          </a>
                        ) : (
                          evidence.note
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Section title="Nguồn tham chiếu">
                {detail.data.sourceRefs.length === 0 ? (
                  <EmptyText>Chưa gắn nguồn tham chiếu.</EmptyText>
                ) : (
                  <SourceRefList
                    commitmentId={detail.data.id}
                    refs={detail.data.sourceRefs}
                    canManage={canManage}
                  />
                )}
              </Section>
            </div>
            <EditCommitmentDialog
              projectId={projectId}
              commitment={detail.data}
              open={editOpen}
              onOpenChange={setEditOpen}
            />
            <AddEvidenceDialog
              commitmentId={detail.data.id}
              open={addEvidenceOpen}
              onOpenChange={setAddEvidenceOpen}
            />
            <TransitionDialog
              projectId={projectId}
              commitment={detail.data}
              open={transitionOpen}
              onOpenChange={setTransitionOpen}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LinkTaskPicker({
  projectId,
  commitment,
}: {
  projectId: string;
  commitment: CommitmentDetail;
}) {
  const [taskId, setTaskId] = useState('');
  const board = useQuery({
    queryKey: ['tasks', projectId, 'board'],
    queryFn: () => tasksApi.getBoard(projectId),
  });
  const linkTask = useLinkExistingTask(projectId, commitment.id);

  const linkedIds = new Set(commitment.tasks.map((task) => task.id));
  const options = (board.data?.columns ?? [])
    .flatMap((column) => column.tasks)
    .filter((task) => !linkedIds.has(task.id))
    .map((task) => ({ value: task.id, label: task.title }));

  if (!board.isPending && options.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Không còn task nào để gắn.
      </p>
    );
  }

  return (
    <div className="mt-2 flex items-end gap-2">
      <ComboBox
        label="Gắn task có sẵn"
        value={taskId}
        options={options}
        onValueChange={(value) =>
          setTaskId(Array.isArray(value) ? (value[0] ?? '') : value)
        }
        placeholder={board.isPending ? 'Đang tải...' : 'Chọn task'}
        emptyText="Không còn task nào để gắn."
        className="flex-1"
      />
      <Button
        size="sm"
        disabled={!taskId}
        isLoading={linkTask.isPending}
        onClick={() => {
          linkTask.mutate(taskId, { onSuccess: () => setTaskId('') });
        }}
      >
        Gắn
      </Button>
    </div>
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
  commitmentId,
  refs,
  canManage,
}: {
  commitmentId: string;
  refs: SourceRef[];
  canManage: boolean;
}) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);
  const removeSourceRef = useRemoveSourceRef(commitmentId);

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
            {canManage && (
              <button
                type="button"
                aria-label="Gỡ nguồn tham chiếu"
                className="ml-auto text-muted-foreground hover:text-danger"
                onClick={() => removeSourceRef.mutate(sourceRef.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {openRefId === sourceRef.id && (
            <SourceRefContent
              commitmentId={commitmentId}
              refId={sourceRef.id}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function EditCommitmentDialog({
  projectId,
  commitment,
  open,
  onOpenChange,
}: {
  projectId: string;
  commitment: CommitmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(commitment.title);
  const [description, setDescription] = useState(
    commitment.description ?? '',
  );
  const [ownerId, setOwnerId] = useState(commitment.ownerId ?? '');
  const [contactId, setContactId] = useState(commitment.contact?.id ?? '');
  const [dueAt, setDueAt] = useState<Date | undefined>(
    commitment.dueAt ? new Date(commitment.dueAt) : undefined,
  );
  const [promisedAt, setPromisedAt] = useState<Date | undefined>(
    commitment.promisedAt ? new Date(commitment.promisedAt) : undefined,
  );
  const [scopeStatus, setScopeStatus] = useState(commitment.scopeStatus);
  const [scopeItemId, setScopeItemId] = useState(
    commitment.scopeItemId ?? '',
  );

  const members = useMembers(projectId);
  const client = useProjectClient(projectId);
  const scope = useProjectScope(projectId);
  const update = useUpdateCommitment(projectId, commitment.id);

  const memberOptions = (members.data ?? []).map((member) => ({
    value: member.userId,
    label: member.displayName,
  }));
  const contactOptions = (client.data?.contacts ?? []).map((contact) => ({
    value: contact.id,
    label: contact.name,
  }));
  const scopeItemOptions = (scope.data?.items ?? []).map((item) => ({
    value: item.id,
    label: item.title,
  }));

  function handleSubmit() {
    update.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        ownerId: ownerId || null,
        requestedByContactId: contactId || null,
        dueAt: dueAt ? dueAt.toISOString() : null,
        promisedAt: promisedAt ? promisedAt.toISOString() : null,
        scopeStatus,
        scopeItemId: scopeItemId || null,
        version: commitment.version,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa cam kết</DialogTitle>
          <DialogDescription>Cập nhật thông tin cam kết.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            label="Tiêu đề"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Textarea
            label="Mô tả"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <ComboBox
            label="Người chịu trách nhiệm"
            value={ownerId}
            options={memberOptions}
            onValueChange={(value) =>
              setOwnerId(Array.isArray(value) ? (value[0] ?? '') : value)
            }
            placeholder="Chọn thành viên"
            emptyText="Không có thành viên."
          />
          <ComboBox
            label="Người yêu cầu phía khách"
            value={contactId}
            options={contactOptions}
            onValueChange={(value) =>
              setContactId(Array.isArray(value) ? (value[0] ?? '') : value)
            }
            placeholder="Chọn người liên hệ"
            emptyText="Chưa có người liên hệ nào."
          />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              mode="single"
              editable
              label="Đã hứa lúc"
              placeholder="dd/mm/yyyy"
              value={promisedAt}
              onChange={(date) =>
                setPromisedAt(date instanceof Date ? date : undefined)
              }
            />
            <DatePicker
              mode="single"
              editable
              label="Hạn hoàn thành"
              placeholder="dd/mm/yyyy"
              value={dueAt}
              onChange={(date) =>
                setDueAt(date instanceof Date ? date : undefined)
              }
            />
          </div>
          <ComboBox
            label="Trạng thái phạm vi"
            value={scopeStatus}
            options={Object.entries(SCOPE_STATUS_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            onValueChange={(value) =>
              setScopeStatus(
                (Array.isArray(value)
                  ? value[0]
                  : value) as CommitmentDetail['scopeStatus'],
              )
            }
          />
          <ComboBox
            label="Hạng mục scope liên quan"
            value={scopeItemId}
            options={scopeItemOptions}
            onValueChange={(value) =>
              setScopeItemId(Array.isArray(value) ? (value[0] ?? '') : value)
            }
            placeholder="Chọn hạng mục"
            emptyText="Chưa có hạng mục scope nào."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            isLoading={update.isPending}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEvidenceDialog({
  commitmentId,
  open,
  onOpenChange,
}: {
  commitmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [milestone, setMilestone] =
    useState<keyof typeof EVIDENCE_MILESTONE_LABELS>('IMPLEMENTED');
  const [type, setType] = useState<'URL' | 'NOTE'>('URL');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const addEvidence = useAddEvidence(commitmentId);

  function reset() {
    setMilestone('IMPLEMENTED');
    setType('URL');
    setUrl('');
    setNote('');
  }

  function handleSubmit() {
    addEvidence.mutate(
      {
        milestone,
        type,
        ...(type === 'URL' ? { url: url.trim() } : { note: note.trim() }),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  const canSubmit =
    type === 'URL' ? url.trim().startsWith('http') : note.trim().length > 0;

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
          <DialogTitle>Thêm bằng chứng</DialogTitle>
          <DialogDescription>
            Bằng chứng cho 1 mốc thực hiện cụ thể.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Mốc thực hiện"
            value={milestone}
            options={Object.entries(EVIDENCE_MILESTONE_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            onValueChange={(value) =>
              setMilestone(
                (Array.isArray(value) ? value[0] : value) as typeof milestone,
              )
            }
          />
          <ComboBox
            label="Loại"
            value={type}
            options={[
              { value: 'URL', label: 'Đường dẫn' },
              { value: 'NOTE', label: 'Ghi chú' },
            ]}
            onValueChange={(value) =>
              setType(
                (Array.isArray(value) ? value[0] : value) as 'URL' | 'NOTE',
              )
            }
          />
          {type === 'URL' ? (
            <Input
              label="URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
            />
          ) : (
            <Textarea
              label="Ghi chú"
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
            isLoading={addEvidence.isPending}
          >
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransitionDialog({
  projectId,
  commitment,
  open,
  onOpenChange,
}: {
  projectId: string;
  commitment: CommitmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState<DeliveryStatus>(
    (Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[]).find(
      (status) => status !== commitment.deliveryStatus,
    )!,
  );
  const [evidenceId, setEvidenceId] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [reason, setReason] = useState('');
  const transition = useTransitionCommitment(projectId, commitment.id);

  const needsEvidence = to === 'DELIVERED' || to === 'ACCEPTED';
  const needsOnBehalfOf = to === 'ACCEPTED';
  const needsReason = to === 'CHANGES_REQUESTED' || to === 'CANCELLED';
  const matchingEvidence = commitment.evidence.filter(
    (evidence) => evidence.milestone === to,
  );

  const canSubmit =
    (!needsEvidence || !!evidenceId) &&
    (!needsOnBehalfOf || onBehalfOf.trim().length > 0) &&
    (!needsReason || reason.trim().length > 0);

  function handleSubmit() {
    transition.mutate(
      {
        to,
        version: commitment.version,
        ...(needsEvidence && evidenceId ? { evidenceId } : {}),
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
          <DialogTitle>Chuyển trạng thái cam kết</DialogTitle>
          <DialogDescription>
            Đang ở &quot;
            {DELIVERY_STATUS_LABELS[commitment.deliveryStatus]}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Chuyển đến"
            value={to}
            options={Object.entries(DELIVERY_STATUS_LABELS)
              .filter(([value]) => value !== commitment.deliveryStatus)
              .map(([value, label]) => ({ value, label }))}
            onValueChange={(value) =>
              setTo(
                (Array.isArray(value) ? value[0] : value) as DeliveryStatus,
              )
            }
          />
          {needsEvidence &&
            (matchingEvidence.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có bằng chứng phù hợp — thêm bằng chứng có mốc &quot;
                {
                  EVIDENCE_MILESTONE_LABELS[
                    to as keyof typeof EVIDENCE_MILESTONE_LABELS
                  ]
                }
                &quot; trước.
              </p>
            ) : (
              <ComboBox
                label="Bằng chứng"
                value={evidenceId}
                options={matchingEvidence.map((evidence) => ({
                  value: evidence.id,
                  label:
                    evidence.type === 'URL'
                      ? (evidence.url ?? evidence.id)
                      : (evidence.note ?? evidence.id),
                }))}
                onValueChange={(value) =>
                  setEvidenceId(
                    Array.isArray(value) ? (value[0] ?? '') : value,
                  )
                }
                placeholder="Chọn bằng chứng"
                emptyText="Không có bằng chứng phù hợp."
              />
            ))}
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
              label="Lý do"
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

function SourceRefContent({
  commitmentId,
  refId,
}: {
  commitmentId: string;
  refId: string;
}) {
  const content = useQuery({
    queryKey: [
      'tasks',
      'commitment',
      commitmentId,
      'source-ref-content',
      refId,
    ],
    queryFn: async () => {
      try {
        return await commitmentsApi.getSourceRefContent(commitmentId, refId);
      } catch {
        toast.error('Không xem được nội dung tin nhắn nguồn');
        return [];
      }
    },
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
