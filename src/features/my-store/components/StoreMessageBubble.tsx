'use client';

import { useMemo, useState } from 'react';
import { Copy, Forward, MoreVertical, Pencil, Quote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { FriendPickerDialog } from '@/features/chat/components/contact/FriendPickerDialog';
import { MessageBubble } from '@/features/chat/components/messages/MessageBubble';
import { useForwardMessage } from '@/features/chat/hooks/useForwardMessage';
import type { Message } from '@/features/chat/types';
import { getMessageSnippet } from '@/features/chat/utils';
import { useMessageEditStore } from '@/features/chat/stores/message-edit.store';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import { useDeleteStoreMessage, useEditStoreMessage } from '@/features/my-store/hooks/use-mutations';
import type { StoreMessage } from '@/features/my-store/types';
import { cn } from '@/lib/utils/cn';

function toChatMessage(message: StoreMessage): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    type: message.type,
    encryptionType: 'NONE',
    plaintext: message.plaintext,
    attachments: message.attachments ?? [],
    reactions: message.reactions ?? [],
    myReaction: message.myReaction ?? null,
    contentPreview: message.contentPreview ?? message.plaintext,
    metadata: message.metadata as Record<string, unknown> | null,
    replyToMessageId: message.replyToMessageId ?? null,
    mentions: message.mentions ?? [],
    isEdited: message.isEdited ?? false,
    editedAt: message.editedAt ?? null,
    isDeleted: message.isDeleted,
    deletedFor: message.deletedFor ?? 'NONE',
    expireAt: message.expireAt ?? null,
    isView: message.isView ?? false,
    createdAt: message.createdAt,
  };
}

type StoreMessageBubbleProps = {
  message: StoreMessage;
  repliedTo?: StoreMessage | null;
};

function StoreMessageActions({ message, className }: { message: Message; className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(message.plaintext ?? message.contentPreview ?? '');
  const deleteMut = useDeleteStoreMessage();
  const editMut = useEditStoreMessage();
  const { forward } = useForwardMessage(message);
  const startReply = useMessageReplyStore((s) => s.startReply);

  const canEdit = message.type === 'TEXT';
  const canCopy = message.type === 'TEXT';
  const resolvedText = message.plaintext ?? message.contentPreview ?? '';

  function handleReply() {
    useMessageEditStore.getState().cancelEdit();
    startReply({
      conversationId: message.conversationId,
      messageId: message.id,
      senderName: 'Bạn',
      snippet: getMessageSnippet(message),
      type: message.type,
    });
  }

  function handleCopy() {
    if (!resolvedText || !navigator.clipboard) return;
    void navigator.clipboard.writeText(resolvedText).then(
      () => toast.success('Đã sao chép'),
      () => toast.error('Không sao chép được'),
    );
  }

  function openEdit() {
    setEditText(resolvedText);
    setEditOpen(true);
  }

  function handleEdit() {
    const text = editText.trim();
    if (!text || text === resolvedText) {
      setEditOpen(false);
      return;
    }
    editMut.mutate(
      { messageId: message.id, dto: { plaintext: text } },
      { onSuccess: () => setEditOpen(false) },
    );
  }

  function handleDelete() {
    deleteMut.mutate(message.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        className,
        menuOpen && '!pointer-events-auto !opacity-100',
      )}
    >
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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tùy chọn tin nhắn"
              title="Tùy chọn"
              className="h-6 w-6 bg-accent text-muted-foreground"
            >
              <MoreVertical className="h-[15px] w-[15px]" />
            </Button>
          }
        />
        <DropdownMenuContent side="top" align="start" className="min-w-[150px]">
          {canEdit && (
            <DropdownMenuItem onClick={openEdit}>
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
          {(canEdit || canCopy) && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-danger focus:text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Gỡ tin nhắn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chỉnh sửa tin nhắn</AlertDialogTitle>
          </AlertDialogHeader>
          <textarea
            autoFocus
            value={editText}
            rows={4}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[112px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <AlertDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={editMut.isPending}>
              Huỷ
            </Button>
            <Button
              variant="solid"
              size="sm"
              isLoading={editMut.isPending}
              disabled={!editText.trim()}
              onClick={handleEdit}
            >
              Lưu
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ tin nhắn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn sẽ bị xoá khỏi kho của tôi. Hành động này không thể hoàn tác.
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

function StoreDeleteAction({ message, className }: { message: Message; className: string }) {
  return (
    <StoreMessageActions
      message={message}
      className={className}
    />
  );
}

function scrollToStoreMessage(messageId: string) {
  const el = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function StoreMessageBubble({ message, repliedTo }: StoreMessageBubbleProps) {
  const chatMessage = useMemo(() => toChatMessage(message), [message]);
  const repliedToMessage = useMemo(
    () => (repliedTo ? toChatMessage(repliedTo) : null),
    [repliedTo],
  );

  return (
    <MessageBubble
      message={chatMessage}
      meId={message.senderId}
      showAvatar={false}
      repliedTo={repliedToMessage}
      repliedToName={repliedToMessage ? 'Bạn' : null}
      onQuoteClick={scrollToStoreMessage}
      enableDefaultActions={false}
      enableTouchMenu={false}
      enableLikeButton={false}
      showReactions={false}
      showBotMarkup={false}
      renderActions={({ className }) => <StoreDeleteAction message={chatMessage} className={className} />}
    />
  );
}
