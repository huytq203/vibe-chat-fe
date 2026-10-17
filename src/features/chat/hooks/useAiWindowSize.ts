'use client';

import { useResizable } from '@/lib/hooks/useResizable';

// Cửa sổ neo góc dưới-phải → tay nắm ở cạnh trái/trên, kéo ra ngoài làm cửa sổ lớn lên.
const WIDTH = { storageKey: 'halo-ai-window-width', defaultSize: 360, min: 320, max: 720, reverse: true };
const HEIGHT = {
  storageKey: 'halo-ai-window-height', defaultSize: 520, min: 400, max: 860, axis: 'y', reverse: true,
} as const;

type Resizable = ReturnType<typeof useResizable>;

export type AiWindowSize = {
  style: { width: number; height: number };
  width: Resizable;
  height: Resizable;
};

export function useAiWindowSize(): AiWindowSize {
  const width = useResizable(WIDTH);
  const height = useResizable(HEIGHT);
  return { style: { width: width.size, height: height.size }, width, height };
}
