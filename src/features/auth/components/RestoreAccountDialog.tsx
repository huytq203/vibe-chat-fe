'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import {
  useConfirmRestore,
  useRequestRestore,
} from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

type RestoreAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreToken: string;
  /** Email đã che (vd j***@x.com) — hiển thị để người dùng biết mã gửi đi đâu. */
  maskedEmail: string | null;
};

/** Dialog khôi phục tài khoản đã xoá: gửi OTP về email → nhập mã xác nhận. */
export const RestoreAccountDialog = ({
  open,
  onOpenChange,
  restoreToken,
  maskedEmail,
}: RestoreAccountDialogProps) => {
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const request = useRequestRestore();
  const confirm = useConfirmRestore();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSent(false);
      setOtp('');
    }
    onOpenChange(next);
  };

  const sendOtp = async () => {
    if (request.isPending) return;
    try {
      await request.mutateAsync(restoreToken);
      toast.success('Đã gửi mã khôi phục tới email của bạn');
      setSent(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không gửi được mã. Thử lại.');
    }
  };

  const submit = async () => {
    if (confirm.isPending) return;
    if (!/^\d{6}$/.test(otp)) return toast.error('Mã gồm 6 chữ số');
    try {
      await confirm.mutateAsync({ restoreToken, otp });
      toast.success('Khôi phục tài khoản thành công! Hãy đăng nhập lại.');
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Khôi phục thất bại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Khôi phục tài khoản</DialogTitle>
        <DialogDescription>
          Tài khoản của bạn đang trong thời gian chờ xoá. Bạn có thể khôi phục bằng
          mã OTP gửi qua email{maskedEmail ? ` ${maskedEmail}` : ''}.
        </DialogDescription>

        <form
          className="mt-2 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!sent) void sendOtp();
            else void submit();
          }}
        >
          {!sent ? (
            <Button
              type="submit"
              className="w-full"
              isLoading={request.isPending}
              disabled={request.isPending}
            >
              Gửi mã khôi phục
            </Button>
          ) : (
            <>
              <Input
                label="Mã OTP"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-[0.4em]"
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={confirm.isPending}
                disabled={confirm.isPending}
              >
                Xác nhận khôi phục
              </Button>
              <Button
                variant="link"
                type="button"
                className="w-full"
                disabled={request.isPending}
                onClick={() => void sendOtp()}
              >
                Gửi lại mã
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
