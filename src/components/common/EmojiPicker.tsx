'use client';

import dynamic from 'next/dynamic';
import type { EmojiClickData, Theme } from 'emoji-picker-react';

const Picker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <div className="h-[450px] w-[350px] animate-pulse rounded-lg bg-muted" />,
});

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  theme?: Theme;
};

export function EmojiPicker({ onSelect, theme }: EmojiPickerProps) {
  return (
    <Picker
      onEmojiClick={(data: EmojiClickData) => onSelect(data.emoji)}
      theme={theme}
      previewConfig={{ showPreview: false }}
      height={400}
      width={350}
    />
  );
}
