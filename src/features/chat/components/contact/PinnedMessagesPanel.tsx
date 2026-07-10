'use client';

import { ArrowLeft, Copy, Pin, PinOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { usePinnedMessages } from '@/features/chat/hooks/use-query';
import { useUnpinMessage } from '@/features/chat/hooks/use-mutations';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';
import { canPinMessage, getMessageSnippet } from '@/features/chat/utils';
import type { Conversation, Message } from '@/features/chat/types';
import { useState } from 'react';

interface PinnedMessagesPanelProps {
  conversation: Conversation;
  meId: string | null;
  onBack: () => void;
  onClose: () => void;
}

export function PinnedMessagesPanel({ conversation, meId, onBack, onClose }: PinnedMessagesPanelProps) {
  const [unpinTarget, setUnpinTarget] = useState<Message | null>(null);
  const isMobile = useIsMobile();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const requestJump = useMessageJumpStore((s) => s.requestJump);
  const unpinMut = useUnpinMessage();

  const hasPins = (conversation.pinnedCount ?? 0) > 0;
  const { data, isLoading, isError } = usePinnedMessages(conversation.id, hasPins);
  const pinned = Array.isArray(data) ? data : [];

  const canUnpin = canPinMessage(conversation, meId);

  function handleJump(id: string, createdAt: string) {
    requestJump({ id, createdAt });
    if (isMobile) setMobilePanel('chat');
  }

  function handleConfirmUnpin() {
    if (!unpinTarget) return;
    unpinMut.mutate(
      { conversationId: conversation.id, messageId: unpinTarget.id },
      { onSuccess: () => setUnpinTarget(null) },
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Tin đã ghim</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        )}
        {isError && (
          <p className="px-4 py-6 text-center text-sm text-destructive">Không tải được tin ghim.</p>
        )}
        {!isLoading && !isError && pinned.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Pin className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào được ghim.</p>
          </div>
        )}
        {pinned.length > 0 && (
          <ul className="flex flex-col gap-0.5 px-2 py-2">
            {pinned.map((msg) => (
              <li
                key={msg.id}
                className="group flex items-start gap-2 rounded-lg px-2 py-2.5 hover:bg-muted/50"
              >
                <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <button
                  type="button"
                  onClick={() => handleJump(msg.id, msg.createdAt)}
                  className="min-w-0 flex-1 text-left text-[12.5px] text-foreground"
                >
                  {getMessageSnippet(msg)}
                </button>
                <PinItemMenu
                  message={msg}
                  canUnpin={canUnpin}
                  onUnpin={setUnpinTarget}
                  className="opacity-0 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={Boolean(unpinTarget)} onOpenChange={(o) => !o && setUnpinTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ ghim tin nhắn?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn sẽ được gỡ khỏi danh sách ghim của cuộc trò chuyện này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setUnpinTarget(null)} disabled={unpinMut.isPending}>
              Huỷ
            </Button>
            <Button variant="solid" onClick={handleConfirmUnpin} isLoading={unpinMut.isPending}>
              Bỏ ghim
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

interface PinItemMenuProps {
  message: Message;
  canUnpin: boolean;
  onUnpin: (m: Message) => void;
  className?: string;
}

function PinItemMenu({ message, canUnpin, onUnpin, className }: PinItemMenuProps) {
  const canCopy = message.type === 'TEXT';
  if (!canCopy && !canUnpin) return null;

  function handleCopy() {
    const text = message.plaintext ?? message.contentPreview ?? '';
    if (!text || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(
      () => toast.success('Đã sao chép'),
      () => toast.error('Không sao chép được'),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label="Tuỳ chọn"
            title="Tuỳ chọn"
          >
            <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {canCopy && (
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            Sao chép
          </DropdownMenuItem>
        )}
        {canUnpin && (
          <DropdownMenuItem onClick={() => onUnpin(message)}>
            <PinOff className="h-4 w-4" />
            Bỏ ghim
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
