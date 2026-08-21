'use client';

import dynamic from 'next/dynamic';
import { EmojiStyle, type EmojiClickData, type Theme } from 'emoji-picker-react';

const Picker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
});

// Prefetch the picker chunk so the popup opens instantly (gọi khi hover/focus nút emoji).
// import() được dedupe nên gọi nhiều lần không tải lại.
export function prefetchEmojiPicker() {
  void import('emoji-picker-react');
}

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  theme?: Theme;
  width?: number | string;
  height?: number | string;
};

export function EmojiPicker({ onSelect, theme, width = 350, height = 400 }: EmojiPickerProps) {
  return (
    <Picker
      onEmojiClick={(data: EmojiClickData) => onSelect(data.emoji)}
      theme={theme}
      // Twitter style = twemoji → đồng bộ với emoji hiển thị trong tin nhắn
      emojiStyle={EmojiStyle.TWITTER}
      // Chỉ tải ảnh emoji khi cuộn tới → mở picker nhanh hơn nhiều
      lazyLoadEmojis
      skinTonesDisabled
      previewConfig={{ showPreview: false }}
      height={height}
      width={width}
    />
  );
}
