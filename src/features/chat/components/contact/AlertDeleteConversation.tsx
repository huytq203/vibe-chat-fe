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
  /** DIRECT: onConfirm nhận scope để phân biệt "chỉ mình" vs "cả hai". GROUP: scope bị bỏ qua. */
  onConfirm: (scope: 'ME' | 'BOTH') => void;
};

export function AlertDeleteConversation({
  open,
  onOpenChange,
  name,
  isDirect,
  isPending,
  onConfirm,
}: AlertDeleteConversationProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá cuộc trò chuyện?</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirect ? (
              <>
                Bạn muốn xoá cuộc trò chuyện với{' '}
                <span className="font-semibold text-foreground">{name}</span> theo cách nào?
              </>
            ) : (
              <>
                Nhóm{' '}
                <span className="font-semibold text-foreground">{name}</span>{' '}
                sẽ bị xoá. Tất cả thành viên mất quyền truy cập.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isDirect ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Huỷ
              </Button>
              <Button
                variant="outline"
                className="border-danger/50 text-danger hover:bg-danger/10"
                onClick={() => onConfirm('ME')}
                isLoading={isPending}
              >
                Xoá với tôi
              </Button>
              <Button
                variant="solid"
                className="bg-danger text-danger-foreground hover:bg-danger/90"
                onClick={() => onConfirm('BOTH')}
                isLoading={isPending}
              >
                Xoá với cả hai
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Huỷ
              </Button>
              <Button
                variant="solid"
                className="bg-danger text-danger-foreground hover:bg-danger/90"
                onClick={() => onConfirm('BOTH')}
                isLoading={isPending}
              >
                Xác nhận xoá
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
