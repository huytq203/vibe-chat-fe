'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';

type ChangeLockPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Đổi — nhận giá trị hiện tại + mới. KHÔNG tự đóng: cha đóng khi xác nhận thành công. */
  onConfirm: (current: string, next: string) => void;
  isPending?: boolean;
  /** Danh từ hiển thị: 'mật khẩu' (mặc định) hoặc 'mã PIN'. */
  label?: string;
};

export function ChangeLockPasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  label = 'mật khẩu',
}: ChangeLockPasswordDialogProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');

  const Label = label.charAt(0).toUpperCase() + label.slice(1);

  function handleClose() {
    setCurrent('');
    setNext('');
    setError('');
    onOpenChange(false);
  }

  function handleSubmit() {
    if (current.length < 1) {
      setError(`Nhập ${label} hiện tại`);
      return;
    }
    if (next.length < 6) {
      setError(`${Label} mới phải có ít nhất 6 ký tự`);
      return;
    }
    if (next.length > 50) {
      setError(`${Label} mới tối đa 50 ký tự`);
      return;
    }
    if (next === current) {
      setError(`${Label} mới phải khác ${label} hiện tại`);
      return;
    }
    setError('');
    // Không đóng ở đây — cha gọi onOpenChange(false) khi xác nhận + đổi thành công.
    onConfirm(current, next);
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🔑 Đổi {label}</AlertDialogTitle>
          <AlertDialogDescription>
            Nhập {label} hiện tại để xác nhận, rồi đặt {label} mới.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 px-1 py-1">
          <Input
            type="password"
            placeholder={`${Label} hiện tại`}
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setError(''); }}
            autoFocus
          />
          <Input
            type="password"
            placeholder={`${Label} mới (6–50 ký tự)`}
            value={next}
            onChange={(e) => { setNext(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>Huỷ</Button>
          <Button variant="solid" onClick={handleSubmit} isLoading={isPending}>Đổi {label}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
