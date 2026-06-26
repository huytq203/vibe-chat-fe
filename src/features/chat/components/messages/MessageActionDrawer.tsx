'use client';

import type { ReactNode } from 'react';
import { Copy, Flag, Forward, Pencil, Pin, PinOff, Quote, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer/Drawer';
import { cn } from '@/lib/utils/cn';
import type { Message, ReactionType } from '@/features/chat/types';
import { useMessageActions } from '@/features/chat/hooks/useMessageActions';
import { useToggleReaction } from '@/features/chat/hooks/useReactions';
import { ReactionPickerRow } from './ReactionPickerRow';
import { MessageActionDialogs } from './MessageActionDialogs';

type MessageActionDrawerProps = {
  message: Message;
  meId: string | null;
  isMe: boolean;
  senderName?: string | null;
  canPin?: boolean;
  isPinned?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ActionItem = {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  show: boolean;
};

/** Menu cảm xúc + action dạng bottom drawer, mở bằng long-press trên mobile. */
export function MessageActionDrawer({
  message, meId, isMe, senderName, canPin, isPinned, open, onOpenChange,
}: MessageActionDrawerProps) {
  const a = useMessageActions({ message, meId, isMe, senderName, isPinned });
  const toggleReaction = useToggleReaction(message.conversationId);
  const myReaction = message.myReaction ?? null;

  const close = () => onOpenChange(false);
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  function pickReaction(type: ReactionType) {
    toggleReaction.mutate({ messageId: message.id, type, current: myReaction });
    close();
  }

  const items: ActionItem[] = [
    { key: 'reply', icon: <Quote className="h-5 w-5" />, label: 'Trả lời', onClick: run(a.handleReply), show: true },
    { key: 'forward', icon: <Forward className="h-5 w-5" />, label: 'Chuyển tiếp', onClick: run(() => a.setForwardOpen(true)), show: true },
    { key: 'pin', icon: isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />, label: isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn', onClick: run(a.handleTogglePin), show: !!canPin },
    { key: 'edit', icon: <Pencil className="h-5 w-5" />, label: 'Chỉnh sửa', onClick: run(a.handleEdit), show: a.canEdit },
    { key: 'copy', icon: <Copy className="h-5 w-5" />, label: 'Sao chép', onClick: run(a.handleCopy), show: a.canCopy },
    { key: 'report', icon: <Flag className="h-5 w-5" />, label: 'Báo cáo', onClick: run(() => a.setReportOpen(true)), danger: true, show: !isMe },
    { key: 'delete', icon: <Trash2 className="h-5 w-5" />, label: 'Gỡ tin nhắn', onClick: run(() => a.setConfirmOpen(true)), danger: true, show: isMe },
  ];

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          direction="bottom"
          className="h-auto max-h-[85vh] rounded-t-2xl pb-[max(env(safe-area-inset-bottom),0.5rem)]"
        >
          <div className="flex justify-center px-4 pt-3 pb-1">
            <ReactionPickerRow myReaction={myReaction} onPick={pickReaction} size="lg" />
          </div>
          <div className="mx-3 my-1 border-t border-border/50" />
          <div className="flex flex-col py-1">
            {items
              .filter((it) => it.show)
              .map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={it.onClick}
                  className={cn(
                    'flex items-center gap-4 px-6 py-3 text-left text-[15px] transition-colors active:bg-muted',
                    it.danger ? 'text-danger' : 'text-foreground',
                  )}
                >
                  {it.icon}
                  {it.label}
                </button>
              ))}
          </div>
        </DrawerContent>
      </Drawer>

      <MessageActionDialogs actions={a} message={message} isMe={isMe} />
    </>
  );
}
