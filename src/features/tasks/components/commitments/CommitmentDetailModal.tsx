'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Text } from '@/components/ui/typography/Typography';
import {
  DELIVERY_STATUS_LABELS,
  EVIDENCE_MILESTONE_LABELS,
  RISK_LABELS,
  SCOPE_STATUS_LABELS,
} from '../../lib/commitment-labels';
import { useMembers } from '../../hooks/useMembers';
import { useCommitmentDetail } from '../../hooks/useCommitments';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { SourceRef } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function CommitmentDetailModal({ projectId }: { projectId: string }) {
  const selectedId = useTasksUIStore((state) => state.selectedCommitmentId);
  const close = useTasksUIStore((state) => state.closeCommitmentDetail);
  const detail = useCommitmentDetail(selectedId ?? '');
  const members = useMembers(projectId);

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
                <Badge variant="soft-primary" size="sm">
                  {SCOPE_STATUS_LABELS[detail.data.scopeStatus]}
                </Badge>
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

              <Section title="Task liên kết">
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
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Bằng chứng">
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
              </Section>

              <Section title="Nguồn tham chiếu">
                {detail.data.sourceRefs.length === 0 ? (
                  <EmptyText>Chưa gắn nguồn tham chiếu.</EmptyText>
                ) : (
                  <SourceRefList
                    commitmentId={detail.data.id}
                    refs={detail.data.sourceRefs}
                  />
                )}
              </Section>
            </div>
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
  commitmentId,
  refs,
}: {
  commitmentId: string;
  refs: SourceRef[];
}) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);

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
    queryFn: () => commitmentsApi.getSourceRefContent(commitmentId, refId),
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
