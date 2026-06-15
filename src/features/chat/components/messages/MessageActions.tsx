'use client';

import { useState } from 'react';
import { Copy, MoreVertical, Pencil, Pin, PinOff, Reply, Trash2 } from 'lucide-react';
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
import { useDeleteMessage, usePinMessage, useUnpinMessage } from '@/features/chat/hooks/use-mutations';
import { useToggleReaction } from '@/features/chat/hooks/useReactions';
import { QUICK_REACTIONS, REACTION_EMOJI, REACTION_LABEL } from '@/features/chat/reactions';
import type { ReactionType } from '@/features/chat/types';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { getRichText } from './rich-text-utils';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';

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
  // Kiểm soát mở dropdown để giữ bar hiện khi menu đang mở (dù chuột đã rê ra ngoài).
  const [menuOpen, setMenuOpen] = useState(false);
  const startEdit = useMessageEditStore((s) => s.startEdit);
  const startReply = useMessageReplyStore((s) => s.startReply);
  const deleteMut = useDeleteMessage();
  const pinMut = usePinMessage();
  const unpinMut = useUnpinMessage();
  const toggleReaction = useToggleReaction(message.conversationId);

  function handleTogglePin() {
    const vars = { conversationId: message.conversationId, messageId: message.id };
    if (isPinned) unpinMut.mutate(vars);
    else pinMut.mutate(vars);
  }

  function handleReact(type: ReactionType) {
    toggleReaction.mutate({
      messageId: message.id,
      type,
      current: message.myReaction ?? null,
    });
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
        'flex items-center gap-1',
        className,
        // Menu đang mở → ép hiện + nhận chuột, bất kể đã rê ra ngoài bubble (case 1).
        menuOpen && '!pointer-events-auto !opacity-100',
      )}
    >
      {/* Thanh cảm xúc nhanh dạng pill nổi — hiện ngay khi hover tin (không cần mở "..."). */}
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-popover px-1 py-0.5 shadow-sm">
        {QUICK_REACTIONS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleReact(type)}
            aria-label={`Thả ${REACTION_LABEL[type]}`}
            title={REACTION_LABEL[type]}
            className={cn(
              'rounded-full px-1 py-0.5 text-base leading-none transition-transform hover:scale-125',
              message.myReaction === type && 'bg-primary/25',
            )}
          >
            <EmojiText text={REACTION_EMOJI[type]} />
          </button>
        ))}
      </div>
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
          <DropdownMenuItem onClick={handleReply}>
            <Reply className="h-4 w-4" />
            Trả lời
          </DropdownMenuItem>
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
