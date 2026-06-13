import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertTransferOwnerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
};

/** Xác nhận nhượng quyền trưởng nhóm — xem 28-group-settings.md. */
export function AlertTransferOwner({ open, onOpenChange, name, isPending, onConfirm }: AlertTransferOwnerProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nhượng quyền trưởng nhóm?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{name}</span> sẽ trở thành trưởng nhóm.
            Bạn sẽ trở thành phó nhóm và mất các quyền của trưởng nhóm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button variant="solid" onClick={onConfirm} isLoading={isPending}>
            Nhượng quyền
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
