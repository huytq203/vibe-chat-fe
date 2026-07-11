'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type PromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  maxLength?: number;
  isPending?: boolean;
  /** Giá trị prefill sẵn trong input (vd: tên hiện tại khi đổi tên). */
  defaultValue?: string;
  onSubmit: (value: string) => void;
};

/** Hộp thoại nhập 1 dòng text dùng chung — thay cho window.prompt. Dùng cho cả tạo mới (input rỗng) và đổi tên (prefill `defaultValue`). */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  confirmLabel = 'Tạo',
  maxLength = 100,
  isPending = false,
  defaultValue = '',
  onSubmit,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  // Theo dõi `open` của lần render trước để phát hiện thời điểm dialog vừa mở
  // (đồng bộ state lúc render thay vì trong effect — dialog không unmount
  // giữa các lần dùng nên cần đồng bộ lại `defaultValue` mỗi lần mở).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(defaultValue);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setValue('');
    onOpenChange(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <form onSubmit={submit}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </AlertDialogHeader>
          <input
            autoFocus
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <AlertDialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Huỷ
            </Button>
            <Button type="submit" variant="solid" isLoading={isPending} disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
