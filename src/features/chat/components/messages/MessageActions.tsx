'use client';

import { useState } from 'react';
import { Copy, Flag, Forward, MoreVertical, Pencil, Pin, PinOff, Quote, Reply, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/features/chat/types';
import { canEditMessage, getMessageSnippet } from '@/features/chat/utils';
import { useDeleteMessage, usePinMessage, useUnpinMessage } from '@/features/chat/hooks/use-mutations';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { getRichText } from './rich-text-utils';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import { ReportDialog } from '@/features/reports/components/ReportDialog';
import { FriendPickerDialog } from '@/features/chat/components/contact/FriendPickerDialog';
import { useForwardMessage } from '@/features/chat/hooks/useForwardMessage';
import { useDecryptedBody } from '@/features/chat/hooks/use-decrypted-message';

type MessageActionsProps = {
  message: Message;
  meId: string | null;
  /** true nếu tin của chính mình → mở khoá Sửa/Gỡ. Reply luôn có cho mọi tin. */
  isMe: boolean;
  /** Tên người gửi tin này (để dựng snapshot reply); null khi là tin của mình. */
  senderName?: string | null;
  /** Có quyền ghim/bỏ ghim không (DIRECT luôn được; GROUP theo whoCanPin). */
  canPin?: boolean;
  /** Tin này đang được ghim (tra từ danh sách ghim ở MessageList). */
  isPinned?: boolean;
  /** Vị trí + hiệu ứng hiện khi hover bubble (parent set qua group-hover/msg). */
  className?: string;
};

/**
 * Menu hành động cho tin nhắn: Trả lời (mọi tin) / Sửa / Sao chép / Gỡ (tin của mình).
 * - Trả lời: đẩy snapshot vào MessageInput qua store (loại trừ với edit).
 * - Sửa: chỉ áp dụng tin TEXT → đẩy vào MessageInput qua store.
 * - Gỡ: xác nhận rồi gọi mutation (optimistic isDeleted=true).
 */
export function MessageActions({
  message, meId, isMe, senderName, canPin, isPinned, className,
}: MessageActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const { forward } = useForwardMessage(message);
  // Kiểm soát mở dropdown để giữ bar hiện khi menu đang mở (dù chuột đã rê ra ngoài).
  const [menuOpen, setMenuOpen] = useState(false);
  const startEdit = useMessageEditStore((s) => s.startEdit);
  const startReply = useMessageReplyStore((s) => s.startReply);
  const deleteMut = useDeleteMessage();
  const pinMut = usePinMessage();
  const unpinMut = useUnpinMessage();

  function handleTogglePin() {
    const vars = { conversationId: message.conversationId, messageId: message.id };
    if (isPinned) unpinMut.mutate(vars);
    else pinMut.mutate(vars);
  }

  // Sửa: tin TEXT của mình, còn trong cửa sổ 5 phút (xem doc 15). Gỡ: không giới hạn.
  const canEdit = isMe && canEditMessage(message, meId);
  const canCopy = message.type === 'TEXT';
  // Plaintext đã giải mã (tin mã hoá) hoặc plaintext gốc (tin thường) cho copy/sửa.
  const decrypted = useDecryptedBody(message);
  const resolvedText = decrypted.text ?? message.plaintext ?? message.contentPreview ?? '';

  function handleCopy() {
    const text = resolvedText;
    if (!text || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(
      () => toast.success('Đã sao chép'),
      () => toast.error('Không sao chép được'),
    );
  }

  function handleReply() {
    // Reply & edit loại trừ nhau — vào reply thì huỷ phiên sửa đang dở.
    useMessageEditStore.getState().cancelEdit();
    startReply({
      conversationId: message.conversationId,
      messageId: message.id,
      senderName: isMe ? 'Bạn' : senderName || 'Người dùng',
      snippet: getMessageSnippet(message),
      type: message.type,
    });
  }

  function handleEdit() {
    // Vào sửa thì huỷ phiên trả lời đang dở.
    useMessageReplyStore.getState().cancelReply();
    startEdit({
      conversationId: message.conversationId,
      messageId: message.id,
      text: resolvedText,
      mentions: message.mentions,
      richText: getRichText(message.metadata) ?? undefined,
    });
  }

  function handleDelete() {
    deleteMut.mutate({ conversationId: message.conversationId, messageId: message.id });
    setConfirmOpen(false);
  }

  return (
    <div
      className={cn(
        'flex  items-center gap-1',
        className,
        // Menu đang mở → ép hiện + nhận chuột, bất kể đã rê ra ngoài bubble (case 1).
        menuOpen && '!pointer-events-auto !opacity-100',
      )}
    >
      {/* Reply nhanh — không cần mở menu "...". */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleReply}
        aria-label="Trả lời"
        title="Trả lời"
        className="h-6 w-6 bg-accent text-muted-foreground"
      >
        <Quote className="h-[15px] w-[15px]" />
      </Button>
      {/* Chuyển tiếp tới bạn bè / nhóm. */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setForwardOpen(true)}
        aria-label="Chuyển tiếp"
        title="Chuyển tiếp"
        className="h-6 w-6 bg-accent text-muted-foreground"
      >
        <Forward className="h-[15px] w-[15px]" />
      </Button>
      <DropdownMenu open={menuOpen} onOpenChange={(o) => setMenuOpen(o)}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tùy chọn tin nhắn"
              title="Tùy chọn"
              className="h-6 w-6 text-muted-foreground bg-accent"
            >
              <MoreVertical className="h-[15px] w-[15px]" />
            </Button>
          }
        />
        <DropdownMenuContent side="top" align="start" className="min-w-[150px]">
          {canPin && (
            <DropdownMenuItem onClick={handleTogglePin}>
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
            </DropdownMenuItem>
          )}
          {(canEdit || canCopy || isMe) && <DropdownMenuSeparator />}
          {canEdit && (
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
          )}
          {canCopy && (
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Sao chép
            </DropdownMenuItem>
          )}
          {/* Báo cáo: chỉ tin của người khác (không tự báo cáo tin của mình). */}
          {!isMe && (
            <>
              {(canEdit || canCopy) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setReportOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Flag className="h-4 w-4" />
                Báo cáo
              </DropdownMenuItem>
            </>
          )}
          {/* Gỡ tin: chỉ tin của mình. */}
          {isMe && (
            <>
              {(canEdit || canCopy) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Gỡ tin nhắn
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ tin nhắn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn sẽ bị thu hồi với mọi người trong cuộc trò chuyện. Hành động này không thể
              hoàn tác.
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
    </div>
  );
}
