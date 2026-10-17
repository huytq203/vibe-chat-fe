'use client';

import { ResizeHandle } from '@/components/common/ResizeHandle';
import type { AiWindowSize } from '@/features/chat/hooks/useAiWindowSize';

interface AiWindowResizeHandlesProps {
  size: AiWindowSize;
}

export function AiWindowResizeHandles({ size }: AiWindowResizeHandlesProps) {
  return (
    <>
      <ResizeHandle
        handleProps={size.width.handleProps}
        isResizing={size.width.isResizing}
        edge="left"
        label="Kéo để đổi độ rộng cửa sổ AI"
      />
      <ResizeHandle
        handleProps={size.height.handleProps}
        isResizing={size.height.isResizing}
        edge="top"
        label="Kéo để đổi chiều cao cửa sổ AI"
      />
    </>
  );
}
