'use client';

import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useAnalyzeMessages } from '@/features/chat/hooks/useAnalyzeMessages';
import { useProjects } from '@/features/tasks/hooks/useProjects';
import { MessageAnalysisPreview } from './MessageAnalysisPreview';

type MessageAnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  messageIds: string[];
};

export function MessageAnalysisDialog({
  open,
  onOpenChange,
  conversationId,
  messageIds,
}: MessageAnalysisDialogProps) {
  const projects = useProjects();
  const analysis = useAnalyzeMessages();
  const [projectId, setProjectId] = useState('');
  const [instruction, setInstruction] = useState('');

  function handleOpenChange(next: boolean) {
    if (!next) {
      analysis.reset();
      setInstruction('');
    }
    onOpenChange(next);
  }

  function handleAnalyze() {
    if (!resolvedProjectId) return;
    analysis.mutate({
      projectId: resolvedProjectId,
      conversationId,
      messageIds,
      instruction,
    });
  }

  const projectOptions = (projects.data ?? []).map((project) => ({
    value: project.id,
    label: project.name,
  }));
  const resolvedProjectId = projectId || projects.data?.[0]?.id || '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-5 text-primary" />
            Phân tích và xử lý
          </DialogTitle>
          <DialogDescription>
            AI đối chiếu tin nhắn với project và đề xuất bước tiếp theo. Chưa có dữ liệu nào được ghi tự động.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
          {projects.isPending ? (
            <div aria-label="Đang tải project" className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : projects.isError ? (
            <StatusMessage
              message="Không tải được danh sách project."
              actionLabel="Thử lại"
              onAction={() => void projects.refetch()}
            />
          ) : projectOptions.length === 0 ? (
            <StatusMessage message="Bạn cần có ít nhất một project trước khi phân tích tin nhắn." />
          ) : (
            <>
              <ComboBox
                ref={(node) => node?.setAttribute('aria-label', 'Project phân tích')}
                label="Project đối chiếu"
                value={resolvedProjectId}
                options={projectOptions}
                onValueChange={(value) => setProjectId(Array.isArray(value) ? value[0] ?? '' : value)}
                placeholder="Chọn project"
                emptyText="Không tìm thấy project."
                clearIcon={false}
                className="[&_[role=combobox]]:min-h-11"
              />
              <Textarea
                label="Chỉ dẫn thêm (không bắt buộc)"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Ví dụ: ưu tiên nhận diện thay đổi phạm vi"
                maxLength={500}
                showCount
                disabled={analysis.isPending}
              />
            </>
          )}

          {analysis.isPending && <AnalysisLoading />}
          {analysis.isError && (
            <StatusMessage
              message={analysis.error instanceof Error ? analysis.error.message : 'Không thể phân tích tin nhắn.'}
              actionLabel="Phân tích lại"
              onAction={handleAnalyze}
              danger
            />
          )}
          {analysis.data && (
            <MessageAnalysisPreview
              analysis={analysis.data}
              projectId={resolvedProjectId}
            />
          )}
        </div>

        <DialogFooter className="mt-6 shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Đóng
          </Button>
          {!analysis.data && !projects.isPending && !projects.isError && projectOptions.length > 0 && (
            <Button onClick={handleAnalyze} disabled={!resolvedProjectId} isLoading={analysis.isPending}>
              Phân tích tin nhắn
            </Button>
          )}
          {analysis.data && (
            <Button variant="secondary" onClick={handleAnalyze} isLoading={analysis.isPending}>
              Phân tích lại
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisLoading() {
  return (
    <div aria-label="AI đang phân tích" className="space-y-3 rounded-xl bg-muted/60 p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

type StatusMessageProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  danger?: boolean;
};

function StatusMessage({ message, actionLabel, onAction, danger }: StatusMessageProps) {
  return (
    <div role={danger ? 'alert' : 'status'} className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
      <AlertCircle aria-hidden="true" className={danger ? 'mt-0.5 size-5 text-danger' : 'mt-0.5 size-5 text-muted-foreground'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{message}</p>
        {actionLabel && onAction && (
          <Button variant="link" className="mt-2" onClick={onAction}>{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}
