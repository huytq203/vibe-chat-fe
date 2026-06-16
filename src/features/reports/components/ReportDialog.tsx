'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { reportsApi } from '@/services/reports.api';
import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from '@/features/reports/types';

const DESCRIPTION_MAX = 1000;

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
};

/** Map mã lỗi BE → thông báo tiếng Việt thân thiện cho người dùng. */
function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'REPORT_DUPLICATE') return 'Bạn đã báo cáo nội dung này rồi.';
    if (error.code === 'REPORT_SELF') return 'Không thể tự báo cáo chính mình.';
  }
  return 'Gửi báo cáo thất bại. Vui lòng thử lại sau.';
}

/** Dialog gửi báo cáo (E1) cho 1 user/tin nhắn/cuộc trò chuyện. */
export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      reportsApi.create({
        targetType,
        targetId,
        reason: reason as ReportReason,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.');
      handleOpenChange(false);
    },
  });

  function reset() {
    setReason(null);
    setDescription('');
    mutation.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!reason || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Báo cáo nội dung</DialogTitle>
          <DialogDescription>
            Chọn lý do phù hợp. Báo cáo của bạn được giữ bí mật.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5" role="radiogroup" aria-label="Lý do báo cáo">
            {REASONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={reason === value}
                onClick={() => setReason(value)}
                className={cn(
                  'flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  reason === value
                    ? 'border-primary bg-primary/5 font-medium text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Textarea
            label="Mô tả thêm (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            showCount
            placeholder="Cung cấp thêm chi tiết giúp chúng tôi xử lý nhanh hơn…"
          />

          {mutation.isError && (
            <p className="text-sm text-danger">{resolveErrorMessage(mutation.error)}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!reason}
            isLoading={mutation.isPending}
            onClick={handleSubmit}
          >
            Gửi báo cáo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
