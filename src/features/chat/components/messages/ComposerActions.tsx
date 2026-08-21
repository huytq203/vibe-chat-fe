'use client';
import { useState, type ReactNode } from 'react';
import { BarChart2, Bot, CalendarClock, Check, Clock, IdCard, MoreHorizontal, PanelTopOpen, Type } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu/DropdownMenu';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { SELF_DESTRUCT_OPTIONS } from '@/features/chat/utils';
import type { AttachmentKind } from '@/features/chat/hooks/useAttachments';
import { AttachmentButtons } from './attachment/AttachmentButtons';
import { MediaPickerTrigger } from './media-picker';
interface ActionItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}
function ActionItem({ icon, label, onClick, active }: ActionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
interface ComposerActionsProps {
  conversationId: string;
  disabled?: boolean;
  isEditing: boolean;
  expanded: boolean;
  selfDestructTtl: number | null;
  onFiles: (files: FileList | File[], kind: AttachmentKind) => void;
  onSelfDestruct: (seconds: number | null) => void;
  onScheduleClick: () => void;
  onContactClick: () => void;
  onEmojiSelect: (emoji: string) => void;
  onToggleExpanded: () => void;
  onWebappClick?: () => void;
  onAiClick?: () => void;
  onPollClick?: () => void;
  stickerBotConversation?: boolean;
}
export function ComposerActions({
  conversationId,
  disabled,
  isEditing,
  expanded,
  selfDestructTtl,
  onFiles,
  onSelfDestruct,
  onScheduleClick,
  onContactClick,
  onEmojiSelect,
  onToggleExpanded,
  onWebappClick,
  onAiClick,
  onPollClick,
  stickerBotConversation,
}: ComposerActionsProps) {
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  function handleMoreAction(action: () => void): void {
    setMoreOpen(false);
    action();
  }
  return (
    <div className="flex items-center">
      {!isEditing && !isMobile && (
        <AttachmentButtons
          onFiles={onFiles}
          disabled={disabled}
          stickerMode={stickerBotConversation}
        />
      )}
      <MediaPickerTrigger
        conversationId={conversationId}
        disabled={disabled}
        emojiOnly={isEditing}
        onEmojiSelect={onEmojiSelect}
      />
      {!isEditing && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              title="Thêm tuỳ chọn"
              aria-label="Thêm tuỳ chọn"
              className="h-11 w-11 text-muted-foreground hover:text-primary md:h-8 md:w-8"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            showArrow={false}
            className="w-auto p-1.5"
          >
            <div className="flex min-w-[180px] flex-col gap-0.5">
              {isMobile && (
                <AttachmentButtons
                  variant="menu"
                  onFiles={onFiles}
                  disabled={disabled}
                  stickerMode={stickerBotConversation}
                />
              )}
              {onWebappClick && (
                <ActionItem
                  icon={<PanelTopOpen className="h-[18px] w-[18px]" />}
                  label="Mở WebApp"
                  onClick={() => handleMoreAction(onWebappClick)}
                />
              )}
              {onAiClick && (
                <ActionItem
                  icon={<Bot className="h-[18px] w-[18px]" />}
                  label="Hỏi AI"
                  onClick={() => handleMoreAction(onAiClick)}
                />
              )}
              {onPollClick && (
                <ActionItem
                  icon={<BarChart2 className="h-[18px] w-[18px]" />}
                  label="Bình chọn"
                  onClick={() => handleMoreAction(onPollClick)}
                />
              )}
              <ActionItem
                icon={<IdCard className="h-[18px] w-[18px]" />}
                label="Danh thiếp"
                onClick={() => handleMoreAction(onContactClick)}
              />
              <ActionItem
                icon={<Type className={cn('h-[18px] w-[18px]', expanded && 'text-primary')} />}
                label={expanded ? 'Thu gọn' : 'Mở rộng'}
                onClick={() => handleMoreAction(onToggleExpanded)}
                active={expanded}
              />
              <ActionItem
                icon={<CalendarClock className="h-[18px] w-[18px]" />}
                label="Hẹn giờ"
                onClick={() => handleMoreAction(onScheduleClick)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0',
                        selfDestructTtl ? 'text-warning' : 'text-muted-foreground',
                      )}
                    >
                      <Clock className="h-[18px] w-[18px]" />
                      Tin nhắn tự huỷ
                    </button>
                  }
                />
                <DropdownMenuContent
                  side={isMobile ? 'top' : 'right'}
                  align="start"
                  className="min-w-[150px]"
                >
                  {SELF_DESTRUCT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.label}
                      onClick={() => handleMoreAction(() => onSelfDestruct(option.seconds))}
                      className={cn(
                        'justify-between',
                        selfDestructTtl === option.seconds && 'text-warning',
                      )}
                    >
                      {option.label}
                      {selfDestructTtl === option.seconds && <Check className="h-3.5 w-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
