import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertRemoveMemberProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function AlertRemoveMember({ open, onOpenChange, name, isPending, onConfirm }: AlertRemoveMemberProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá thành viên?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{name}</span> sẽ bị xoá khỏi nhóm
            và không còn nhận được tin nhắn mới.
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
            Xác nhận xoá
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
