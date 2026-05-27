import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertDeleteFriendProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function AlertDeleteFriend({ open, onOpenChange, name, isPending, onConfirm }: AlertDeleteFriendProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bạn bè?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sẽ huỷ kết bạn với{" "}
            <span className="font-semibold text-foreground">{name}</span>.
            Cuộc trò chuyện vẫn được giữ lại, nhưng để nhắn tin lại bạn có thể
            cần gửi lời mời kết bạn mới.
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
