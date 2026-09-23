'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { MessageAnalysis } from '@/features/chat/types';
import { ConfirmCreateTaskForm } from './analysis/ConfirmCreateTaskForm';
import { ConfirmUpdateExistingTaskForm } from './analysis/ConfirmUpdateExistingTaskForm';

const SUPPORTED_ACTION_TYPES = new Set(['CREATE_TASK', 'UPDATE_EXISTING_TASK', 'ASK_CLARIFICATION']);

export function MessageAnalysisPreview({
  analysis,
  projectId,
}: {
  analysis: MessageAnalysis;
  projectId: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [doneIndexes, setDoneIndexes] = useState<Set<number>>(new Set());
  const suggestedActions = analysis.suggestedActions.filter((action) =>
    SUPPORTED_ACTION_TYPES.has(action.type),
  );

  return (
    <section aria-label="Kết quả phân tích" className="space-y-4 rounded-xl bg-muted/50 p-4">
      <p className="text-xs font-semibold tabular-nums text-muted-foreground">
        Độ tin cậy {Math.round(analysis.confidence * 100)}%
      </p>
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
        {suggestedActions.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Chưa có hành động phù hợp.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {suggestedActions.map((action, index) => {
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
                        — {action.rationale?.trim() || action.description}
                      </span>
                    </span>
                    {done ? (
                      <span className="shrink-0 text-xs font-medium text-success">
                        Đã tạo
                      </span>
                    ) : action.type !== 'ASK_CLARIFICATION' ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-primary underline"
                        onClick={() =>
                          setOpenIndex(openIndex === index ? null : index)
                        }
                      >
                        {openIndex === index ? 'Đóng' : 'Chọn phương án này'}
                      </button>
                    ) : null}
                  </div>
                  {action.type !== 'ASK_CLARIFICATION' && openIndex === index && (
                    <ActionForm
                      action={action}
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
  projectId,
  onDone,
}: {
  action: MessageAnalysis['suggestedActions'][number];
  projectId: string;
  onDone: () => void;
}) {
  switch (action.type) {
    case 'CREATE_TASK':
      return (
        <ConfirmCreateTaskForm
          projectId={projectId}
          action={action}
          onDone={onDone}
        />
      );
    case 'UPDATE_EXISTING_TASK':
      return action.targetTaskId ? (
        <ConfirmUpdateExistingTaskForm
          projectId={projectId}
          action={action}
          onDone={onDone}
        />
      ) : null;
    default:
      return null;
  }
}
