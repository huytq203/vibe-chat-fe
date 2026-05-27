import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertDeleteConversationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isDirect: boolean;
  isPending: boolean;
  onConfirm: () => void;
};

export function AlertDeleteConversation({ open, onOpenChange, name, isDirect, isPending, onConfirm }: AlertDeleteConversationProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá cuộc trò chuyện?</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirect ? (
              <>
                Cuộc trò chuyện với{" "}
                <span className="font-semibold text-foreground">{name}</span>{" "}
                sẽ bị xoá ở cả hai bên. Toàn bộ tin nhắn sẽ không còn truy cập được.
              </>
            ) : (
              <>
                Nhóm{" "}
                <span className="font-semibold text-foreground">{name}</span>{" "}
                sẽ bị xoá. Tất cả thành viên sẽ không còn truy cập được cuộc trò chuyện này.
              </>
            )}
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
