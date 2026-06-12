'use client';

import { useState } from 'react';
import { Copy, MoreVertical, Pencil, Reply, Trash2 } from 'lucide-react';
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
import { EmojiText } from '@/components/common/EmojiText';
import type { Message } from '@/features/chat/types';
import { canEditMessage, getMessageSnippet } from '@/features/chat/utils';
import { useDeleteMessage } from '@/features/chat/hooks/use-mutations';
import { useToggleReaction } from '@/features/chat/hooks/useReactions';
import { QUICK_REACTIONS, REACTIONS_ENABLED } from '@/features/chat/reactions';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';

type MessageActionsProps = {
  message: Message;
  meId: string | null;
  /** true nếu tin của chính mình → mở khoá Sửa/Gỡ. Reply luôn có cho mọi tin. */
  isMe: boolean;
  /** Tên người gửi tin này (để dựng snapshot reply); null khi là tin của mình. */
  senderName?: string | null;
  /** Chỉ hiện menu khi hover dòng tin (parent set qua group-hover). */
  className?: string;
};

/**
 * Menu hành động cho tin nhắn: Trả lời (mọi tin) / Sửa / Sao chép / Gỡ (tin của mình).
 * - Trả lời: đẩy snapshot vào MessageInput qua store (loại trừ với edit).
 * - Sửa: chỉ áp dụng tin TEXT → đẩy vào MessageInput qua store.
 * - Gỡ: xác nhận rồi gọi mutation (optimistic isDeleted=true).
 */
export function MessageActions({ message, meId, isMe, senderName, className }: MessageActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startEdit = useMessageEditStore((s) => s.startEdit);
  const startReply = useMessageReplyStore((s) => s.startReply);
  const deleteMut = useDeleteMessage();
  const toggleReaction = useToggleReaction(message.conversationId);

  function handleReact(emoji: string) {
    const existing = message.reactions?.find((r) => r.emoji === emoji);
    toggleReaction.mutate({ messageId: message.id, emoji, active: existing?.reactedByMe ?? false });
  }

  // Sửa: tin TEXT của mình, còn trong cửa sổ 5 phút (xem doc 15). Gỡ: không giới hạn.
  const canEdit = isMe && canEditMessage(message, meId);
  const canCopy = message.type === 'TEXT';

  function handleCopy() {
    const text = message.plaintext ?? message.contentPreview ?? '';
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
      text: message.plaintext ?? message.contentPreview ?? '',
    });
  }

  function handleDelete() {
    deleteMut.mutate({ conversationId: message.conversationId, messageId: message.id });
    setConfirmOpen(false);
  }

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tùy chọn tin nhắn"
              title="Tùy chọn"
              className="h-6 w-6 text-muted-foreground"
            >
              <MoreVertical className="h-[15px] w-[15px]" />
            </Button>
          }
        />
        <DropdownMenuContent side="top" align="end" className="min-w-[150px]">
          {/* Hàng cảm xúc nhanh — chờ API BE (xem reactions.ts). Ẩn khi REACTIONS_ENABLED=false. */}
          {REACTIONS_ENABLED && (
            <>
              <div className="flex items-center gap-0.5 px-1 py-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    aria-label={`Thả ${emoji}`}
                    className="rounded-md px-1 py-0.5 text-base transition-transform hover:scale-125"
                  >
                    <EmojiText text={emoji} />
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleReply}>
            <Reply className="h-4 w-4" />
            Trả lời
          </DropdownMenuItem>
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
    </div>
  );
}
