'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { MessageAnalysis } from '@/features/chat/types';
import { ConfirmCreateChangeRequestForm } from './analysis/ConfirmCreateChangeRequestForm';
import { ConfirmCreateCommitmentForm } from './analysis/ConfirmCreateCommitmentForm';
import { ConfirmCreateTaskForm } from './analysis/ConfirmCreateTaskForm';
import { ConfirmLinkExistingCommitmentForm } from './analysis/ConfirmLinkExistingCommitmentForm';

const classificationLabels: Record<MessageAnalysis['classification'], string> = {
  TASK: 'Công việc',
  SCOPE_CHANGE: 'Thay đổi phạm vi',
  COMMITMENT: 'Cam kết',
  DECISION: 'Quyết định',
  BLOCKER: 'Vướng mắc',
  UNCLEAR: 'Chưa rõ',
};

const scopeLabels: Record<MessageAnalysis['scopeStatus'], string> = {
  IN_SCOPE: 'Trong phạm vi',
  OUT_OF_SCOPE: 'Ngoài phạm vi',
  UNCLEAR: 'Chưa xác định phạm vi',
};

const SUPPORTED_ACTION_TYPES = new Set([
  'CREATE_COMMITMENT',
  'CREATE_CHANGE_REQUEST',
  'CREATE_TASK',
  'LINK_EXISTING_COMMITMENT',
]);

export function MessageAnalysisPreview({
  analysis,
  projectId,
}: {
  analysis: MessageAnalysis;
  projectId: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [doneIndexes, setDoneIndexes] = useState<Set<number>>(new Set());

  return (
    <section aria-label="Kết quả phân tích" className="space-y-4 rounded-xl bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
          {classificationLabels[analysis.classification]}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
          {scopeLabels[analysis.scopeStatus]}
        </span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          Độ tin cậy {Math.round(analysis.confidence * 100)}%
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tóm tắt</h3>
        <p className="mt-1 text-sm leading-6 text-foreground">{analysis.summary}</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Nhận định</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{analysis.reasoning}</p>
      </div>
      {analysis.clarifyingQuestion && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Cần làm rõ</h3>
          <p className="mt-1 text-sm leading-6 text-foreground">{analysis.clarifyingQuestion}</p>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Đề xuất tiếp theo</h3>
        {analysis.suggestedActions.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Chưa có hành động phù hợp.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {analysis.suggestedActions.map((action, index) => {
              const supported = SUPPORTED_ACTION_TYPES.has(action.type);
              const done = doneIndexes.has(index);

              return (
                <li key={`${action.type}-${index}`} className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <span className="flex-1">
                      <strong className="font-semibold text-foreground">
                        {action.title}
                      </strong>
                      <span className="text-muted-foreground">
                        {' '}
                        — {action.description}
                      </span>
                    </span>
                    {done ? (
                      <span className="shrink-0 text-xs font-medium text-success">
                        Đã tạo
                      </span>
                    ) : supported ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-primary underline"
                        onClick={() =>
                          setOpenIndex(openIndex === index ? null : index)
                        }
                      >
                        {openIndex === index ? 'Đóng' : 'Chọn phương án này'}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Sắp có
                      </span>
                    )}
                  </div>
                  {openIndex === index && (
                    <ActionForm
                      action={action}
                      analysis={analysis}
                      projectId={projectId}
                      onDone={() => {
                        setDoneIndexes((previous) =>
                          new Set(previous).add(index),
                        );
                        setOpenIndex(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActionForm({
  action,
  analysis,
  projectId,
  onDone,
}: {
  action: MessageAnalysis['suggestedActions'][number];
  analysis: MessageAnalysis;
  projectId: string;
  onDone: () => void;
}) {
  switch (action.type) {
    case 'CREATE_COMMITMENT':
      return (
        <ConfirmCreateCommitmentForm
          projectId={projectId}
          action={action}
          scopeStatus={analysis.scopeStatus}
          source={analysis.source}
          onDone={onDone}
        />
      );
    case 'CREATE_CHANGE_REQUEST':
      return (
        <ConfirmCreateChangeRequestForm
          projectId={projectId}
          action={action}
          source={analysis.source}
          onDone={onDone}
        />
      );
    case 'CREATE_TASK':
      return (
        <ConfirmCreateTaskForm
          projectId={projectId}
          action={action}
          onDone={onDone}
        />
      );
    case 'LINK_EXISTING_COMMITMENT':
      return (
        <ConfirmLinkExistingCommitmentForm
          projectId={projectId}
          action={action}
          source={analysis.source}
          onDone={onDone}
        />
      );
    default:
      return null;
  }
}
