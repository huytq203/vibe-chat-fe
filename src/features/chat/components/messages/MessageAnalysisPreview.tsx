import { CheckCircle2 } from 'lucide-react';
import type { MessageAnalysis } from '@/features/chat/types';

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

export function MessageAnalysisPreview({ analysis }: { analysis: MessageAnalysis }) {
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
            {analysis.suggestedActions.map((action, index) => (
              <li key={`${action.type}-${index}`} className="flex gap-2 text-sm">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">{action.title}</strong>
                  <span className="text-muted-foreground"> — {action.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
