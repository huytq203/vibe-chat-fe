'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { ReportDialog } from '@/features/reports/components/ReportDialog';
import { FriendPickerDialog } from '@/features/chat/components/contact/FriendPickerDialog';
import type { Message } from '@/features/chat/types';
import type { MessageActionsApi } from '@/features/chat/hooks/useMessageActions';

type MessageActionDialogsProps = {
  actions: MessageActionsApi;
  message: Message;
  isMe: boolean;
};

/** Cụm dialog (Gỡ / Báo cáo / Chuyển tiếp) tách khỏi trigger để dùng chung. */
export function MessageActionDialogs({
  actions,
  message,
  isMe,
}: MessageActionDialogsProps) {
  const {
    confirmOpen,
    setConfirmOpen,
    reportOpen,
    setReportOpen,
    forwardOpen,
    setForwardOpen,
    forward,
    deleteMut,
    handleDelete,
  } = actions;

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ tin nhắn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn sẽ bị thu hồi với mọi người trong cuộc trò chuyện. Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMut.isPending}
              onClick={handleDelete}
            >
              Gỡ tin nhắn
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isMe && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="MESSAGE"
          targetId={message.id}
        />
      )}

      <FriendPickerDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        onPick={(targets) => void forward(targets)}
        title="Chuyển tiếp tới"
        actionLabel="Chuyển tiếp"
      />
    </>
  );
}
