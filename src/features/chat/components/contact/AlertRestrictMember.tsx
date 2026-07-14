import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';

type AlertRestrictMemberProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isRestricted: boolean;
  isPending: boolean;
  onConfirm: () => void;
};

export function AlertRestrictMember({
  open,
  onOpenChange,
  name,
  isRestricted,
  isPending,
  onConfirm,
}: AlertRestrictMemberProps) {
  const title = isRestricted ? 'Bỏ chặn chat?' : 'Chặn chat thành viên?';
  const action = isRestricted ? 'Bỏ chặn chat' : 'Chặn chat';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {isRestricted ? (
              <>
                <span className="font-semibold text-foreground">{name}</span> sẽ có thể gửi tin
                nhắn lại trong nhóm.
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{name}</span> vẫn ở trong nhóm
                nhưng sẽ không thể gửi tin nhắn cho tới khi quản trị viên bỏ chặn.
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
            className={isRestricted ? undefined : 'bg-danger text-danger-foreground hover:bg-danger/90'}
            onClick={onConfirm}
            isLoading={isPending}
          >
            {action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
