import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertLeaveGroupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function AlertLeaveGroup({ open, onOpenChange, name, isPending, onConfirm }: AlertLeaveGroupProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời nhóm?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sẽ rời khỏi <span className="font-semibold text-foreground">{name}</span> và
            không còn nhận được tin nhắn mới. Có thể được thêm lại sau.
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
            Rời nhóm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
