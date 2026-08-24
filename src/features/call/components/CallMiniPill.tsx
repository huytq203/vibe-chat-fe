'use client';

import { useRef, type RefObject } from 'react';
import Draggable, { type DraggableData } from 'react-draggable';
import { Maximize2, PhoneOff } from 'lucide-react';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallWindowProps } from './call-window.types';

/**
 * Mode thu nhỏ trên mobile: pill kéo thả được, nổi trên toàn app.
 *
 * Chạm vào thân pill → mở lại toàn màn hình; nút đỏ kết thúc cuộc gọi. Vị trí neo
 * theo safe-area để không đè lên home indicator.
 */
export function CallMiniPill(props: CallWindowProps) {
  const { peer, isGroup, participantCount, statusText, position } = props;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const didDragRef = useRef(false);
  const countLabel = isGroup ? `${participantCount} người` : '';
  const subtitle = [countLabel, statusText].filter(Boolean).join(' · ') || 'Đang kết nối…';

  // Neo phía trên ô nhập tin nhắn (~95px kể cả safe-area) để không che chỗ gõ.
  return (
    <Draggable
      nodeRef={nodeRef as RefObject<HTMLElement>}
      cancel=".no-drag"
      position={position}
      bounds="body"
      onStart={() => {
        didDragRef.current = false;
      }}
      onDrag={() => {
        didDragRef.current = true;
      }}
      onStop={(_e, data: DraggableData) => {
        props.onDrag(data.x, data.y);
        // Nhả chuột/ngón tay xong mới tới lượt click → xoá cờ ở tick kế tiếp.
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
    >
      <div
        ref={nodeRef}
        className="pointer-events-auto fixed right-4 z-[200] flex h-[62px] w-[232px] touch-none items-center gap-2.5 rounded-2xl border border-border bg-popover/95 pl-2.5 pr-2 text-popover-foreground shadow-2xl backdrop-blur-md"
        style={{ bottom: 'calc(var(--safe-bottom) + 4.5rem)' }}
      >
        <button
          type="button"
          aria-label="Mở lại cuộc gọi"
          onClick={() => {
            if (didDragRef.current) return;
            props.onSetMode('fullscreen');
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Avatar name={peer.name} src={peer.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold leading-tight">
              {peer.name}
            </span>
            <span className="block truncate text-[11.5px] leading-tight text-muted-foreground">
              {subtitle}
            </span>
          </span>
          <Maximize2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          aria-label="Kết thúc"
          onClick={props.onHangup}
          className="no-drag grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive text-white transition-colors active:bg-destructive/85"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
        </button>
      </div>
    </Draggable>
  );
}
