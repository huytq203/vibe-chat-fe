'use client';

import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const deleteBot = useDeleteBot();

  function handleDelete() {
    deleteBot.mutate(bot.id, {
      onSuccess: () => {
        toast.success('Đã xoá bot');
        setOpen(false);
        onDeleted?.();
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Xoá bot thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          {/* Không dùng AlertDialogClose ở đây: Base UI đóng dialog ngay khi click (setOpen(false)
              chạy trong handler nội bộ của Close), bất kể mutation thành công hay lỗi — khiến
              isLoading không kịp hiển thị và dialog biến mất trước khi user thấy toast lỗi.
              Chỉ đóng dialog khi mutate thành công (onSuccess), giữ mở khi pending/lỗi. */}
          <Button variant="danger" size="sm" isLoading={deleteBot.isPending} onClick={handleDelete}>
            Xoá
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
