'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSendSticker } from '@/features/chat/hooks/use-stickers';
import { useSendGif } from '@/features/chat/hooks/use-giphy';
import type { GiphyItem } from '@/features/chat/types/gif';
import type { Sticker } from '@/features/chat/types/sticker';
import { cn } from '@/lib/utils/cn';
import { MediaPickerPanel } from './MediaPickerPanel';

interface MediaPickerTriggerProps {
  conversationId: string;
  disabled?: boolean;
  emojiOnly?: boolean;
  onEmojiSelect: (emoji: string) => void;
  mobilePanelHost?: HTMLElement | null;
  onRequestEditorFocus?: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function MediaPickerTrigger({
  conversationId,
  disabled,
  emojiOnly,
  onEmojiSelect,
  mobilePanelHost,
  onRequestEditorFocus,
  mobileOpen,
  onMobileOpenChange,
}: MediaPickerTriggerProps) {
  const isMobile = useIsMobile();
  const panelId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isMobile && mobileOpen !== undefined ? mobileOpen : internalOpen;
  const [sendingGifId, setSendingGifId] = useState<string | null>(null);
  const [sendingStickerId, setSendingStickerId] = useState<string | null>(null);
  const sendSticker = useSendSticker(conversationId);
  const sendGif = useSendGif(conversationId);

  function setOpen(nextOpen: boolean): void {
    if (isMobile) {
      if (mobileOpen === undefined) setInternalOpen(nextOpen);
      onMobileOpenChange?.(nextOpen);
      return;
    }
    setInternalOpen(nextOpen);
  }

  // Mobile không có hover để kích hoạt prefetch. Nạp chunk sau khi composer ổn định để
  // lần chạm đầu tiên không phải vừa mở drawer vừa tải/parse toàn bộ emoji picker.
  useEffect(() => {
    const timer = window.setTimeout(prefetchEmojiPicker, 600);
    return () => window.clearTimeout(timer);
  }, []);

  function handleEmojiSelect(emoji: string): void {
    onEmojiSelect(emoji);
  }

  function handlePickSticker(sticker: Sticker): void {
    if (sendingStickerId) return;
    setSendingStickerId(sticker.id);
    sendSticker.mutate(sticker, {
      onSuccess: () => setOpen(false),
      onError: () => toast.error('Gửi sticker thất bại. Bạn thử lại nhé.'),
      onSettled: () => setSendingStickerId(null),
    });
  }

  function handlePickGif(gif: GiphyItem): void {
    if (sendingGifId) return;
    setSendingGifId(gif.id);
    sendGif.mutate(gif, {
      onSuccess: () => setOpen(false),
      onSettled: () => setSendingGifId(null),
    });
  }

  const panel = (
    <MediaPickerPanel
      emojiOnly={emojiOnly}
      sendingGifId={sendingGifId}
      sendingStickerId={sendingStickerId}
      onEmojiSelect={handleEmojiSelect}
      onPickSticker={handlePickSticker}
      onPickGif={handlePickGif}
    />
  );
  const triggerButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      title={isMobile && open ? 'Mở bàn phím' : 'Emoji, GIF và sticker'}
      aria-label={isMobile && open ? 'Mở bàn phím' : 'Emoji, GIF và sticker'}
      aria-expanded={open}
      aria-controls={isMobile && open ? panelId : undefined}
      className={cn(
        'h-11 w-11 text-muted-foreground hover:text-primary md:h-8 md:w-8',
        open && 'bg-primary/10 text-primary',
      )}
      onMouseEnter={prefetchEmojiPicker}
      onPointerDown={() => {
        prefetchEmojiPicker();
        if (isMobile && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}
      onFocus={prefetchEmojiPicker}
      onClick={isMobile
        ? () => {
            if (open) {
              setOpen(false);
              onRequestEditorFocus?.();
              return;
            }
            setOpen(true);
          }
        : undefined}
    >
      {isMobile && open
        ? <Keyboard className="h-[18px] w-[18px]" />
        : <Smile className="h-[18px] w-[18px]" />}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        {open && mobilePanelHost
          ? createPortal(
              <section
                id={panelId}
                aria-label="Emoji, GIF và sticker"
                data-mobile-media-picker
                className="mt-2 h-[min(52dvh,26rem)] min-h-64 overflow-hidden border-t border-border bg-background pt-1"
              >
                {panel}
              </section>,
              mobilePanelHost,
            )
          : null}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{triggerButton}</PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
        {panel}
      </PopoverContent>
    </Popover>
  );
}
