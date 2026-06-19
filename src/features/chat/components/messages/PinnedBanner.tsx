'use client';

import { useState } from 'react';
import { ChevronDown, Copy, MoreVertical, Pin, PinOff } from 'lucide-react';
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
import { cn } from '@/lib/utils/cn';
import type { Conversation, Message } from '@/features/chat/types';
import { canPinMessage, getMessageSnippet } from '@/features/chat/utils';
import { useEnsureDecrypted } from '@/features/chat/hooks/use-decrypted-message';
import { peekDecrypted } from '@/lib/crypto/decrypt-cache';
import { usePinnedMessages } from '@/features/chat/hooks/use-query';
import { useUnpinMessage } from '@/features/chat/hooks/use-mutations';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';

type PinnedBannerProps = {
  conversation: Conversation;
  meId: string | null;
};

/**
 * Thanh "Tin đã ghim" ngay dưới ChatHeader (xem 29-pinned-messages.md).
 * Bấm thanh → mở rộng/thu gọn danh sách; bấm 1 tin → nhảy tới tin gốc;
 * nút "…" → popover (Sao chép / Bỏ ghim — Bỏ ghim mở dialog xác nhận).
 * Trạng thái loading/error/empty → ẩn banner.
 */
export function PinnedBanner({ conversation, meId }: PinnedBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [unpinTarget, setUnpinTarget] = useState<Message | null>(null);
  const requestJump = useMessageJumpStore((s) => s.requestJump);
  const unpinMut = useUnpinMessage();
  // Chỉ gọi endpoint khi conversation có tin ghim (tránh fetch thừa).
  const hasPins = (conversation.pinnedCount ?? 0) > 0;
  const { data, isError } = usePinnedMessages(conversation.id, hasPins);
  const pinned = Array.isArray(data) ? data : [];
  // Giải mã sẵn các tin ghim FE-encrypted vào cache để snippet hiển thị đúng (hook vô điều kiện).
  useEnsureDecrypted(pinned);

  if (!hasPins || isError || pinned.length === 0) return null;

  const canUnpin = canPinMessage(conversation, meId);
  const top = pinned[0];
  const multiple = pinned.length > 1;

  function jumpTo(id: string, createdAt: string) {
    requestJump({ id, createdAt });
    setExpanded(false);
  }

  function handleConfirmUnpin() {
    if (!unpinTarget) return;
    unpinMut.mutate(
      { conversationId: conversation.id, messageId: unpinTarget.id },
      { onSuccess: () => setUnpinTarget(null) },
    );
  }

  return (
    <div className="shrink-0 border-b border-border bg-sidebar">
      {/* Hàng tóm tắt: bấm để mở rộng danh sách (nếu nhiều tin) + nút "…" tuỳ chọn tin trên cùng. */}
      <div className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-muted/50">
        <Pin className="h-4 w-4 shrink-0 text-primary" />
        <button
          type="button"
          onClick={() => (multiple ? setExpanded((v) => !v) : jumpTo(top.id, top.createdAt))}
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="text-[11px] font-semibold text-primary">
            Tin đã ghim {multiple && `(${pinned.length})`}
          </span>
          <span className="truncate text-[12.5px] text-foreground">{getMessageSnippet(top)}</span>
        </button>
        {multiple && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Thu gọn' : 'Xem tất cả tin ghim'}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
        <PinItemMenu message={top} canUnpin={canUnpin} onUnpin={setUnpinTarget} />
      </div>

      {expanded && multiple && (
        <ul className="max-h-60 overflow-y-auto border-t border-border/60 px-2 pb-2">
          {pinned.map((m) => (
            <li key={m.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
              <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <button
                type="button"
                onClick={() => jumpTo(m.id, m.createdAt)}
                className="min-w-0 flex-1 truncate text-left text-[12.5px] text-foreground"
              >
                {getMessageSnippet(m)}
              </button>
              <PinItemMenu
                message={m}
                canUnpin={canUnpin}
                onUnpin={setUnpinTarget}
                className="opacity-0 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
              />
            </li>
          ))}
        </ul>
      )}

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
    </div>
  );
}

type PinItemMenuProps = {
  message: Message;
  canUnpin: boolean;
  onUnpin: (message: Message) => void;
  className?: string;
};

/** Popover "…" cho 1 tin ghim: Sao chép (tin TEXT) + Bỏ ghim (nếu đủ quyền). */
function PinItemMenu({ message, canUnpin, onUnpin, className }: PinItemMenuProps) {
  const canCopy = message.type === 'TEXT';
  if (!canCopy && !canUnpin) return null;

  function handleCopy() {
    const text = peekDecrypted(message) ?? message.plaintext ?? message.contentPreview ?? '';
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
            className={cn('shrink-0 text-muted-foreground', className)}
            aria-label="Tuỳ chọn tin ghim"
            title="Tuỳ chọn"
          >
            <MoreVertical className="h-4 w-4" />
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
