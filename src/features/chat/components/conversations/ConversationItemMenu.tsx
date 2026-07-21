'use client';

import { memo, useState } from 'react';
import {
  Bell,
  BellOff,
  Archive,
  ArchiveRestore,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import type { Conversation } from '@/features/chat/types';
import { getConversationName } from '@/features/chat/utils';
import {
  useDeleteConversation,
  useLockConversation,
  useMuteConversation,
  useRemoveLock,
  useTogglePinConversation,
} from '@/features/chat/hooks/use-mutations';
import { useArchiveConversation } from '@/features/chat/hooks/use-archive-mutations';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { useSettingsStore } from '@/features/settings/stores/settings.store';
import { LockPasswordDialog } from '@/features/chat/components/contact/PinDialog';
import { AlertDeleteConversation } from '@/features/chat/components/contact/AlertDeleteConversation';

const HOUR = 60 * 60_000;
const MUTE_PRESETS: { label: string; ms: number | null }[] = [
  { label: '30 phút', ms: 30 * 60_000 },
  { label: '1 giờ', ms: HOUR },
  { label: '8 giờ', ms: 8 * HOUR },
  { label: '1 tuần', ms: 7 * 24 * HOUR },
  { label: 'Đến khi mở lại', ms: null },
];

/** Mốc ISO tự bật lại (ở module scope để Date.now() không nằm trong body component). */
function muteUntilIso(ms: number | null): string | null {
  return ms ? new Date(Date.now() + ms).toISOString() : null;
}

const itemCls =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12.5px] text-foreground transition-colors hover:bg-muted';

type ConversationItemMenuProps = {
  conversation: Conversation;
  meId: string | null;
};

/** Menu "..." (hover) của một item hội thoại: Ghim · Tắt thông báo · Ẩn (khoá) · Xoá. */
function ConversationItemMenuImpl({ conversation, meId }: ConversationItemMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pinMut = useTogglePinConversation();
  const muteMut = useMuteConversation();
  const lockMut = useLockConversation();
  const removeLockMut = useRemoveLock();
  const deleteMut = useDeleteConversation();
  const archiveMut = useArchiveConversation();
  const lockPin = useSettingsStore((s) => s.lockPin);
  const markUnlocked = useConvLockStore((s) => s.markUnlocked);

  const id = conversation.id;
  const isPinned = Boolean(conversation.isPinned);
  const isMuted = Boolean(conversation.isMuted);
  const isLocked = Boolean(conversation.isLocked);
  const isDirect = conversation.type === 'DIRECT';
  const isArchived = Boolean(conversation.isArchived);

  function lockWith(password: string) {
    lockMut.mutate(
      { conversationId: id, password },
      { onSuccess: () => markUnlocked(id) },
    );
  }

  function handleToggleLock() {
    setMenuOpen(false);
    // Đang khoá → cần nhập mật khẩu để tắt. Chưa khoá: có PIN mặc định → khoá thẳng,
    // không có → mở dialog đặt mật khẩu.
    if (isLocked || !lockPin) {
      setLockDialogOpen(true);
      return;
    }
    lockWith(lockPin);
  }

  function handleLockConfirm(password: string) {
    if (isLocked) removeLockMut.mutate({ conversationId: id, password });
    else lockWith(password);
  }

  function handleConfirmDelete(scope: "ME" | "BOTH" | undefined){
     deleteMut.mutate({ conversationId: id, scope })
     setDeleteOpen(false)
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger>
          <button
            type="button"
            aria-label="Tuỳ chọn cuộc trò chuyện"
            title="Tuỳ chọn"
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-popover text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent cursor-pointer hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" showArrow={false} className="w-52 p-1">
          <PopoverClose
            onClick={() => pinMut.mutate({ conversationId: id, pinned: !isPinned })}
            className={itemCls}
          >
            {isPinned ? <PinOff className="h-4 w-4 shrink-0" /> : <Pin className="h-4 w-4 shrink-0" />}
            {isPinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện'}
          </PopoverClose>

          <PopoverClose
            onClick={() => archiveMut.mutate({ conversationId: id, archived: !isArchived })}
            className={itemCls}
          >
            {isArchived ? <ArchiveRestore className="h-4 w-4 shrink-0" /> : <Archive className="h-4 w-4 shrink-0" />}
            {isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
          </PopoverClose>

          {/* Tắt thông báo: đang tắt → bỏ tắt; chưa tắt → submenu chọn thời lượng. */}
          {isMuted ? (
            <PopoverClose
              onClick={() => muteMut.mutate({ conversationId: id, isMuted: false })}
              className={itemCls}
            >
              <BellOff className="h-4 w-4 shrink-0 text-primary" />
              Bật lại thông báo
            </PopoverClose>
          ) : (
            <Popover>
              <PopoverTrigger>
                <button type="button" className={itemCls}>
                  <Bell className="h-4 w-4 shrink-0" />
                  Tắt thông báo
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" showArrow={false} className="w-44 p-1">
                <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tắt trong
                </div>
                {MUTE_PRESETS.map((p) => (
                  <PopoverClose
                    key={p.label}
                    onClick={() => {
                      setMenuOpen(false);
                      muteMut.mutate({
                        conversationId: id,
                        isMuted: true,
                        mutedUntil: muteUntilIso(p.ms),
                      });
                    }}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-foreground transition-colors hover:bg-muted"
                  >
                    {p.label}
                  </PopoverClose>
                ))}
              </PopoverContent>
            </Popover>
          )}

          <button type="button" onClick={handleToggleLock} className={itemCls}>
            {isLocked ? (
              <LockOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Lock className="h-4 w-4 shrink-0" />
            )}
            {isLocked ? 'Bỏ ẩn cuộc trò chuyện' : 'Ẩn cuộc trò chuyện'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className={cn(itemCls, 'text-danger hover:bg-danger/10')}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Xoá cuộc trò chuyện
          </button>
        </PopoverContent>
      </Popover>

      <LockPasswordDialog
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        mode={isLocked ? 'unlock' : 'lock'}
        onConfirm={handleLockConfirm}
      />

      <AlertDeleteConversation
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={getConversationName(conversation, meId)}
        isDirect={isDirect}
        isPending={deleteMut.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export const ConversationItemMenu = memo(ConversationItemMenuImpl);
