'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer/Drawer';
import { prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSendSticker } from '@/features/chat/hooks/use-stickers';
import { useSendGif } from '@/features/chat/hooks/use-giphy';
import type { GiphyItem } from '@/features/chat/types/gif';
import type { Sticker } from '@/features/chat/types/sticker';
import { MediaPickerPanel } from './MediaPickerPanel';

interface MediaPickerTriggerProps {
  conversationId: string;
  disabled?: boolean;
  emojiOnly?: boolean;
  onEmojiSelect: (emoji: string) => void;
}

export function MediaPickerTrigger({
  conversationId,
  disabled,
  emojiOnly,
  onEmojiSelect,
}: MediaPickerTriggerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [sendingGifId, setSendingGifId] = useState<string | null>(null);
  const [sendingStickerId, setSendingStickerId] = useState<string | null>(null);
  const sendSticker = useSendSticker(conversationId);
  const sendGif = useSendGif(conversationId);

  function handleEmojiSelect(emoji: string): void {
    onEmojiSelect(emoji);
    setOpen(false);
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
      title="Emoji, GIF và sticker"
      aria-label="Emoji, GIF và sticker"
      className="h-11 w-11 text-muted-foreground hover:text-primary md:h-8 md:w-8"
      onMouseEnter={prefetchEmojiPicker}
      onFocus={prefetchEmojiPicker}
    >
      <Smile className="h-[18px] w-[18px]" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger>{triggerButton}</DrawerTrigger>
        <DrawerContent direction="bottom" className="h-[70dvh] rounded-t-2xl">
          <DrawerTitle className="sr-only">Emoji, GIF và sticker</DrawerTitle>
          {panel}
        </DrawerContent>
      </Drawer>
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
