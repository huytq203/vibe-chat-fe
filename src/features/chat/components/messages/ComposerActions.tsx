'use client';

import { useState, type ReactNode } from 'react';
import { CalendarClock, Check, Clock, IdCard, MoreHorizontal, Smile, Type } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { EmojiPicker, prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { cn } from '@/lib/utils/cn';
import { SELF_DESTRUCT_OPTIONS } from '@/features/chat/utils';
import type { AttachmentKind } from '@/features/chat/hooks/useAttachments';
import { AttachmentButtons } from './AttachmentButtons';

type ActionItemProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
};

function ActionItem({ icon, label, onClick, active }: ActionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors hover:bg-muted',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

type ComposerActionsProps = {
  disabled?: boolean;
  isEditing: boolean;
  expanded: boolean;
  emojiOpen: boolean;
  selfDestructTtl: number | null;
  onFiles: (files: FileList | File[], kind: AttachmentKind) => void;
  onSelfDestruct: (seconds: number | null) => void;
  onScheduleClick: () => void;
  onContactClick: () => void;
  onEmojiOpenChange: (open: boolean) => void;
  onEmojiButtonClick: () => void;
  onEmojiSelect: (emoji: string) => void;
  onToggleExpanded: () => void;
};

/** Cụm nút trái của ô soạn: đính kèm, tin tự huỷ, emoji, mở rộng vùng soạn. */
export function ComposerActions({
  disabled,
  isEditing,
  expanded,
  emojiOpen,
  selfDestructTtl,
  onFiles,
  onSelfDestruct,
  onScheduleClick,
  onContactClick,
  onEmojiOpenChange,
  onEmojiButtonClick,
  onEmojiSelect,
  onToggleExpanded,
}: ComposerActionsProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  function handleMoreAction(fn: () => void) {
    setMoreOpen(false);
    fn();
  }

  return (
    <div className="flex items-center">
      {!isEditing && (
        <>
          <AttachmentButtons onFiles={onFiles} disabled={disabled} />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  title={selfDestructTtl ? 'Tin nhắn tự huỷ đang bật' : 'Tin nhắn tự huỷ'}
                  aria-label="Tin nhắn tự huỷ"
                  className={cn(
                    selfDestructTtl
                      ? 'text-warning hover:text-warning'
                      : 'text-muted-foreground hover:text-warning',
                  )}
                >
                  <Clock className="h-[18px] w-[18px]" />
                </Button>
              }
            />
            <DropdownMenuContent side="top" align="start" className="min-w-[150px]">
              {SELF_DESTRUCT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => onSelfDestruct(opt.seconds)}
                  className={cn('justify-between', selfDestructTtl === opt.seconds && 'text-warning')}
                >
                  {opt.label}
                  {selfDestructTtl === opt.seconds && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                title="Thêm tuỳ chọn"
                aria-label="Thêm tuỳ chọn"
                className="text-muted-foreground hover:text-primary"
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-1.5">
              <div className="flex items-center gap-0.5">
                <ActionItem icon={<IdCard className="h-[18px] w-[18px]" />} label="Danh thiếp" onClick={() => handleMoreAction(onContactClick)} />
                <ActionItem
                  icon={<Type className={cn('h-[18px] w-[18px]', expanded && 'text-primary')} />}
                  label={expanded ? 'Thu gọn' : 'Mở rộng'}
                  onClick={() => handleMoreAction(onToggleExpanded)}
                  active={expanded}
                />
                <ActionItem icon={<CalendarClock className="h-[18px] w-[18px]" />} label="Hẹn giờ" onClick={() => handleMoreAction(onScheduleClick)} />
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
      <Popover open={emojiOpen} onOpenChange={onEmojiOpenChange}>
        <PopoverTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Emoji"
            aria-label="Emoji"
            className="text-muted-foreground hover:text-primary"
            onMouseEnter={prefetchEmojiPicker}
            onFocus={prefetchEmojiPicker}
            onClick={onEmojiButtonClick}
          >
            <Smile className="h-[18px] w-[18px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
          <EmojiPicker onSelect={onEmojiSelect} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
