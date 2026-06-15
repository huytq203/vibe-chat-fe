'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { useDeleteAccount } from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Xác nhận xoá tài khoản (xoá mềm). BE đá mọi phiên + lên lịch xoá vĩnh viễn 7 ngày. */
export const DeleteAccountDialog = ({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) => {
  const router = useRouter();
  const deleteAccount = useDeleteAccount();

  const handleConfirm = async () => {
    try {
      await deleteAccount.mutateAsync();
      toast.success('Đã gửi yêu cầu xoá tài khoản');
      onOpenChange(false);
      router.push('/login');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Xoá tài khoản thất bại.');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá tài khoản?</AlertDialogTitle>
          <AlertDialogDescription>
            Tài khoản sẽ bị vô hiệu hoá ngay và mọi phiên đăng nhập bị đóng. Dữ
            liệu sẽ bị xoá vĩnh viễn sau 7 ngày nếu bạn không đăng nhập lại để khôi
            phục. Bạn chắc chắn muốn tiếp tục?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteAccount.isPending}
          >
            Huỷ
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirm()}
            isLoading={deleteAccount.isPending}
          >
            Xoá tài khoản
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
