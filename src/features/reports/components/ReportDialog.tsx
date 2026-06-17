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
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { ApiError } from '@/lib/api/client';
import { reportsApi } from '@/services/reports.api';
import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from '@/features/reports/types';

const DESCRIPTION_MAX = 1000;

const REASON_OPTIONS = (Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(
  ([value, label]) => ({ value, label }),
);

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
          <ComboBox
            label="Lý do báo cáo"
            placeholder="Chọn lý do báo cáo…"
            options={REASON_OPTIONS}
            value={reason ?? ''}
            onValueChange={(v) =>
              setReason(((typeof v === 'string' ? v : '') as ReportReason) || null)
            }
            emptyText="Không tìm thấy lý do phù hợp."
            required
          />

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
