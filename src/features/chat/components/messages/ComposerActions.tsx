"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart2,
  Bot,
  CalendarClock,
  Check,
  Clock,
  IdCard,
  MoreHorizontal,
  PanelTopOpen,
  Smile,
  Sticker,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover/Popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import {
  EmojiPicker,
  prefetchEmojiPicker,
} from "@/components/common/EmojiPicker";
import { cn } from "@/lib/utils/cn";
import { SELF_DESTRUCT_OPTIONS } from "@/features/chat/utils";
import type { AttachmentKind } from "@/features/chat/hooks/useAttachments";
import { AttachmentButtons } from "./attachment/AttachmentButtons";
import { StickerPicker } from './StickerPicker';
import { useSendSticker } from '@/features/chat/hooks/use-stickers';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

type ComposerActionsProps = {
  conversationId: string;
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
  onWebappClick?: () => void;
  onAiClick?: () => void;
  onPollClick?: () => void;
  stickerBotConversation?: boolean;
};

/** Cụm nút trái của ô soạn: đính kèm, tin tự huỷ, emoji, mở rộng vùng soạn. */
export function ComposerActions({
  conversationId,
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
  onWebappClick,
  onAiClick,
  onPollClick,
  stickerBotConversation,
}: ComposerActionsProps) {
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreView, setMoreView] = useState<'actions' | 'emoji' | 'sticker'>('actions');
  const [stickerOpen, setStickerOpen] = useState(false);
  const sendSticker = useSendSticker(conversationId);

  function handleMoreAction(fn: () => void) {
    setMoreOpen(false);
    setMoreView('actions');
    fn();
  }

  function handleMoreOpenChange(open: boolean) {
    setMoreOpen(open);
    if (!open) setMoreView('actions');
  }

  return (
    <div className="flex items-center">
      {!isEditing && !isMobile && (
        <AttachmentButtons onFiles={onFiles} disabled={disabled} stickerMode={stickerBotConversation} />
      )}
      {!isMobile && (
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
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            showArrow={false}
            className="w-auto p-0"
          >
            <EmojiPicker onSelect={onEmojiSelect} />
          </PopoverContent>
        </Popover>
      )}

      {!isEditing && !isMobile && (
        <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
          <PopoverTrigger>
            <Button variant="ghost" size="icon-sm" disabled={disabled || sendSticker.isPending} title="Sticker" aria-label="Sticker" className="text-muted-foreground hover:text-primary">
              <Sticker className="h-[18px] w-[18px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
            <StickerPicker onPick={(sticker) => sendSticker.mutate(sticker, { onSuccess: () => setStickerOpen(false) })} />
          </PopoverContent>
        </Popover>
      )}

      {!isEditing && (
        <Popover open={moreOpen} onOpenChange={handleMoreOpenChange}>
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
            className={cn(
              'p-1.5',
              isMobile && moreView !== 'actions'
                ? 'w-[min(360px,calc(100vw-16px))] p-0'
                : 'w-auto',
            )}
          >
            {isMobile && moreView === 'emoji' ? (
              <div>
                <div className="flex h-12 items-center gap-1 border-b px-1.5">
                  <button
                    type="button"
                    onClick={() => setMoreView('actions')}
                    aria-label="Quay lại tuỳ chọn"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </button>
                  <span className="text-sm font-semibold">Emoji</span>
                </div>
                <EmojiPicker
                  onSelect={(emoji) => {
                    onEmojiSelect(emoji);
                    setMoreOpen(false);
                  }}
                />
              </div>
            ) : isMobile && moreView === 'sticker' ? (
              <div>
                <div className="flex h-12 items-center gap-1 border-b px-1.5">
                  <button
                    type="button"
                    onClick={() => setMoreView('actions')}
                    aria-label="Quay lại tuỳ chọn"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </button>
                  <span className="text-sm font-semibold">Sticker</span>
                </div>
                <StickerPicker
                  onPick={(sticker) =>
                    sendSticker.mutate(sticker, {
                      onSuccess: () => setMoreOpen(false),
                    })
                  }
                />
              </div>
            ) : (
              <div className="flex min-w-[180px] flex-col gap-0.5">
                {isMobile && (
                  <>
                    <AttachmentButtons variant="menu" onFiles={onFiles} disabled={disabled} stickerMode={stickerBotConversation} />
                    <ActionItem
                      icon={<Smile className="h-[18px] w-[18px]" />}
                      label="Emoji"
                      onClick={() => {
                        prefetchEmojiPicker();
                        setMoreView('emoji');
                      }}
                    />
                    <ActionItem
                      icon={<Sticker className="h-[18px] w-[18px]" />}
                      label="Sticker"
                      onClick={() => setMoreView('sticker')}
                    />
                  </>
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
                    onClick={() => handleMoreAction(onAiClick!)}
                  />
                )}
                {onPollClick && (
                  <ActionItem
                    icon={<BarChart2 className="h-[18px] w-[18px]" />}
                    label="Bình chọn"
                    onClick={() => handleMoreAction(onPollClick!)}
                  />
                )}
                <ActionItem
                  icon={<IdCard className="h-[18px] w-[18px]" />}
                  label="Danh thiếp"
                  onClick={() => handleMoreAction(onContactClick)}
                />
                <ActionItem
                  icon={
                    <Type
                      className={cn(
                        "h-[18px] w-[18px]",
                        expanded && "text-primary",
                      )}
                    />
                  }
                  label={expanded ? "Thu gọn" : "Mở rộng"}
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
                          "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0",
                          selfDestructTtl ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        <Clock className="h-[18px] w-[18px]" />
                        Tin nhắn tự huỷ
                      </button>
                    }
                  />
                  <DropdownMenuContent
                    side={isMobile ? "top" : "right"}
                    align="start"
                    className="min-w-[150px]"
                  >
                    {SELF_DESTRUCT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.label}
                        onClick={() => handleMoreAction(() => onSelfDestruct(opt.seconds))}
                        className={cn(
                          "justify-between",
                          selfDestructTtl === opt.seconds && "text-warning",
                        )}
                      >
                        {opt.label}
                        {selfDestructTtl === opt.seconds && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
