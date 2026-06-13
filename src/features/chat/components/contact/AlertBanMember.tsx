import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertBanMemberProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
};

/** Xác nhận chặn (ban) thành viên — xem 28-group-settings.md §4. */
export function AlertBanMember({ open, onOpenChange, name, isPending, onConfirm }: AlertBanMemberProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chặn thành viên?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{name}</span> sẽ bị xoá khỏi nhóm và
            không thể được thêm lại hay vào lại qua link cho tới khi bạn bỏ chặn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button
            variant="solid"
            className="bg-danger text-danger-foreground hover:bg-danger/90"
            onClick={onConfirm}
            isLoading={isPending}
          >
            Chặn thành viên
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
