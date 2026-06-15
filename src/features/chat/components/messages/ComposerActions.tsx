'use client';

import { Check, Clock, Maximize2, Minimize2, Smile } from 'lucide-react';
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

type ComposerActionsProps = {
  disabled?: boolean;
  isEditing: boolean;
  expanded: boolean;
  emojiOpen: boolean;
  selfDestructTtl: number | null;
  onFiles: (files: FileList | File[], kind: AttachmentKind) => void;
  onSelfDestruct: (seconds: number | null) => void;
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
  onEmojiOpenChange,
  onEmojiButtonClick,
  onEmojiSelect,
  onToggleExpanded,
}: ComposerActionsProps) {
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
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        title={expanded ? 'Thu gọn' : 'Mở rộng vùng soạn'}
        aria-label={expanded ? 'Thu gọn vùng soạn' : 'Mở rộng vùng soạn'}
        aria-pressed={expanded}
        onClick={onToggleExpanded}
        className={cn(
          expanded ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-primary',
        )}
      >
        {expanded ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
      </Button>
    </div>
  );
}
