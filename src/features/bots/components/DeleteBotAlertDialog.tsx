'use client';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useDeleteBot } from '../hooks/use-mutations';
import type { Bot } from '../types';

export function DeleteBotAlertDialog({
  bot,
  onDeleted,
}: {
  bot: Bot;
  onDeleted?: () => void;
}) {
  const deleteBot = useDeleteBot();

  function handleDelete() {
    deleteBot.mutate(bot.id, {
      onSuccess: () => {
        toast.success('Đã xoá bot');
        onDeleted?.();
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Xoá bot thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Button variant="danger" size="sm">
          Xoá bot
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bot &quot;{bot.displayName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Xoá sẽ thu hồi toàn bộ token của bot này ngay lập tức. Hành động không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
          <AlertDialogClose
            render={
              <Button variant="danger" size="sm" isLoading={deleteBot.isPending} onClick={handleDelete}>
                Xoá
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
