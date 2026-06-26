'use client';

import { useState } from 'react';
import { Copy, Flag, Forward, MoreVertical, Pencil, Pin, PinOff, Quote, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/features/chat/types';
import { useMessageActions } from '@/features/chat/hooks/useMessageActions';
import { MessageActionDialogs } from './MessageActionDialogs';

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
 * Thanh action nổi cạnh bubble (desktop, hiện khi hover). Logic dùng chung qua
 * useMessageActions; bản mobile là MessageActionDrawer (mở bằng long-press).
 */
export function MessageActions({
  message, meId, isMe, senderName, canPin, isPinned, className,
}: MessageActionsProps) {
  // Kiểm soát mở dropdown để giữ bar hiện khi menu đang mở (dù chuột đã rê ra ngoài).
  const [menuOpen, setMenuOpen] = useState(false);
  const a = useMessageActions({ message, meId, isMe, senderName, isPinned });

  return (
    <div
      className={cn(
        'flex  items-center gap-1',
        className,
        // Menu đang mở → ép hiện + nhận chuột, bất kể đã rê ra ngoài bubble (case 1).
        menuOpen && '!pointer-events-auto !opacity-100',
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={a.handleReply}
        aria-label="Trả lời"
        title="Trả lời"
        className="h-6 w-6 bg-accent text-muted-foreground"
      >
        <Quote className="h-[15px] w-[15px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => a.setForwardOpen(true)}
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
              className="h-6 w-6 text-muted-foreground bg-accent"
            >
              <MoreVertical className="h-[15px] w-[15px]" />
            </Button>
          }
        />
        <DropdownMenuContent side="top" align="start" className="min-w-[150px]">
          {canPin && (
            <DropdownMenuItem onClick={a.handleTogglePin}>
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
            </DropdownMenuItem>
          )}
          {(a.canEdit || a.canCopy || isMe) && <DropdownMenuSeparator />}
          {a.canEdit && (
            <DropdownMenuItem onClick={a.handleEdit}>
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
          )}
          {a.canCopy && (
            <DropdownMenuItem onClick={a.handleCopy}>
              <Copy className="h-4 w-4" />
              Sao chép
            </DropdownMenuItem>
          )}
          {!isMe && (
            <>
              {(a.canEdit || a.canCopy) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => a.setReportOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Flag className="h-4 w-4" />
                Báo cáo
              </DropdownMenuItem>
            </>
          )}
          {isMe && (
            <>
              {(a.canEdit || a.canCopy) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => a.setConfirmOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Gỡ tin nhắn
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <MessageActionDialogs actions={a} message={message} isMe={isMe} />
    </div>
  );
}
