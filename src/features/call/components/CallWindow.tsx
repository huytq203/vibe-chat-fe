'use client';

import { useRef, type RefObject } from 'react';
import Draggable, { type DraggableData } from 'react-draggable';
import { Maximize2, Minimize2, Minus, PhoneOff, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type {
  CallDirectory,
  CallPeer,
  CallPhase,
  CallType,
  WindowMode,
} from '@/features/call/types';
import { CallStage } from './CallStage';
import { CallControls } from './CallControls';

type CallWindowProps = {
  type: CallType;
  peer: CallPeer;
  isGroup: boolean;
  directory: CallDirectory;
  remoteIds: string[];
  /** Số người trong cuộc gọi (roster báo hiệu) — hiển thị cho group. */
  participantCount: number;
  phase: CallPhase;
  mode: WindowMode;
  micOn: boolean;
  camOn: boolean;
  position: { x: number; y: number };
  statusText: string;
  getRemoteRef: (id: string) => (node: HTMLDivElement | null) => void;
  setLocalEl: (node: HTMLDivElement | null) => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
  onSetMode: (mode: WindowMode) => void;
  onClose: () => void;
  onDrag: (x: number, y: number) => void;
};

const SIZE_CLASS: Record<WindowMode, string> = {
  mini: 'h-[112px] w-[230px]',
  normal: 'h-[520px] w-[360px]',
  fullscreen: 'inset-0 h-screen w-screen rounded-none',
};

export function CallWindow(props: CallWindowProps) {
  const {
    mode,
    peer,
    type,
    isGroup,
    directory,
    remoteIds,
    participantCount,
    micOn,
    camOn,
    statusText,
    getRemoteRef,
    setLocalEl,
    position,
  } = props;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const draggable = mode !== 'fullscreen';
  const countLabel = isGroup ? `${participantCount} người` : '';

  // Điều khiển cửa sổ — LUÔN hiển thị ở mọi mode (đặt ngoài vùng kéo nhờ class no-drag).
  const windowControls = (
    <div className="no-drag flex shrink-0 items-center gap-0.5">
      {mode !== 'mini' && (
        <button
          type="button"
          aria-label="Thu nhỏ"
          onClick={() => props.onSetMode('mini')}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10"
        >
          <Minus className="h-4 w-4" />
        </button>
      )}
      {mode !== 'normal' && (
        <button
          type="button"
          aria-label="Cửa sổ vừa"
          onClick={() => props.onSetMode('normal')}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}
      {mode !== 'fullscreen' && (
        <button
          type="button"
          aria-label="Toàn màn hình"
          onClick={() => props.onSetMode('fullscreen')}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        aria-label="Thu gọn"
        title="Thu gọn (cuộc gọi vẫn tiếp tục)"
        onClick={props.onClose}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const card = (
    <div
      ref={nodeRef}
      className={cn(
        'pointer-events-auto fixed z-60 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
        mode === 'fullscreen' ? SIZE_CLASS.fullscreen : `bottom-6 right-6 ${SIZE_CLASS[mode]}`,
      )}
    >
      <div className="flex items-center justify-between gap-2 bg-accent px-2 py-1.5 text-xs text-muted-foreground">
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2',
            draggable && 'call-drag-handle cursor-move',
          )}
        >
          <span className="truncate font-medium">{peer.name}</span>
          {countLabel && <span className="shrink-0">· {countLabel}</span>}
          <span className="shrink-0">{statusText}</span>
        </div>
        {windowControls}
      </div>

      {mode === 'mini' ? (
        <div className="flex flex-1 items-center justify-between gap-2 px-3 pb-2 bg-sidebar">
          <Avatar name={peer.name} src={peer.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {peer.name}
            {countLabel && <span className="text-muted-foreground"> · {countLabel}</span>}
          </span>
          <button
            type="button"
            aria-label="Kết thúc"
            onClick={props.onHangup}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive text-white hover:bg-destructive/90"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <CallStage
            type={type}
            peer={peer}
            isGroup={isGroup}
            directory={directory}
            remoteIds={remoteIds}
            getRemoteRef={getRemoteRef}
            setLocalEl={setLocalEl}
            statusText={statusText}
          />
          <CallControls
            micOn={micOn}
            camOn={camOn}
            onToggleMic={props.onToggleMic}
            onToggleCam={props.onToggleCam}
            onHangup={props.onHangup}
          />
        </>
      )}
    </div>
  );

  if (!draggable) return card;

  return (
    <Draggable
      nodeRef={nodeRef as RefObject<HTMLElement>}
      handle=".call-drag-handle"
      cancel=".no-drag"
      position={position}
      onStop={(_e, data: DraggableData) => props.onDrag(data.x, data.y)}
      bounds="body"
    >
      {card}
    </Draggable>
  );
}
