'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { EmojiPicker } from '@/components/common/EmojiPicker';
import type { GiphyItem } from '@/features/chat/types/gif';
import type { Sticker } from '@/features/chat/types/sticker';
import { StickerPicker } from '../StickerPicker';
import { GifPicker } from './GifPicker';
import { isPickerTab, usePickerTab } from './use-picker-tab';

interface MediaPickerPanelProps {
  onEmojiSelect: (emoji: string) => void;
  onPickSticker: (sticker: Sticker) => void;
  onPickGif: (gif: GiphyItem) => void;
  sendingGifId?: string | null;
  sendingStickerId?: string | null;
  emojiOnly?: boolean;
}

export function MediaPickerPanel({
  onEmojiSelect,
  onPickSticker,
  onPickGif,
  sendingGifId,
  sendingStickerId,
  emojiOnly,
}: MediaPickerPanelProps) {
  const [tab, selectTab] = usePickerTab();

  if (emojiOnly) {
    return (
      <div className="h-[70dvh] w-full overflow-hidden md:h-[440px] md:w-[352px]">
        <EmojiPicker onSelect={onEmojiSelect} width="100%" height="100%" />
      </div>
    );
  }

  function handleTabChange(value: unknown): void {
    if (isPickerTab(value)) selectTab(value);
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="h-[70dvh] w-full md:h-[440px] md:w-[352px]">
      <TabsList className="m-2 w-[calc(100%-1rem)] shrink-0 justify-around">
        <TabsTrigger value="emoji" className="flex-1">Emoji</TabsTrigger>
        <TabsTrigger value="gif" className="flex-1">GIF</TabsTrigger>
        <TabsTrigger value="sticker" className="flex-1">Sticker</TabsTrigger>
      </TabsList>

      <TabsContent value="emoji" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <EmojiPicker onSelect={onEmojiSelect} width="100%" height="100%" />
      </TabsContent>
      <TabsContent value="gif" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <GifPicker onPick={onPickGif} sendingId={sendingGifId} />
      </TabsContent>
      <TabsContent value="sticker" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <StickerPicker onPick={onPickSticker} sendingId={sendingStickerId} />
      </TabsContent>
    </Tabs>
  );
}
