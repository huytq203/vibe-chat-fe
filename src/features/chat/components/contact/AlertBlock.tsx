import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertBlockProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isBlocked: boolean;
  isBusy: boolean;
  onConfirm: () => void;
};

export function AlertBlock({ open, onOpenChange, name, isBlocked, isBusy, onConfirm }: AlertBlockProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? "Bỏ chặn người dùng?" : "Chặn người dùng?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                Bạn sẽ bỏ chặn{" "}
                <span className="font-semibold text-foreground">{name}</span>.
                Họ có thể nhắn tin và gửi lời mời kết bạn cho bạn trở lại.
              </>
            ) : (
              <>
                Bạn sẽ chặn{" "}
                <span className="font-semibold text-foreground">{name}</span>.
                Họ không thể nhắn tin, gọi điện hay xem thông tin cá nhân của bạn.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Huỷ
          </Button>
          <Button
            variant="solid"
            className={isBlocked ? undefined : "bg-danger text-danger-foreground hover:bg-danger/90"}
            onClick={onConfirm}
            isLoading={isBusy}
          >
            {isBlocked ? "Xác nhận bỏ chặn" : "Xác nhận chặn"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
