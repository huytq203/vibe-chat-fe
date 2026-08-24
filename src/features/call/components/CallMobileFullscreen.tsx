'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCallStore } from '@/features/call/stores/call.store';
import { CallStage } from './CallStage';
import { CallControls } from './CallControls';
import { CallChatPanel } from './CallChatPanel';
import { UpgradePrompt } from './UpgradePrompt';
import type { CallWindowProps } from './call-window.types';

/**
 * Cuộc gọi toàn màn hình trên mobile — mode mặc định.
 *
 * Sân khấu tràn viền tới sát mép máy; tên + trạng thái nằm trên một lớp phủ gradient
 * để đọc được cả trên video sáng lẫn nền avatar, và lùi xuống dưới Dynamic Island.
 * Chỉ có một lối thoát: thu về pill mini (`onSetMode('mini')`).
 */
export function CallMobileFullscreen(props: CallWindowProps) {
  const {
    type,
    peer,
    isGroup,
    directory,
    remoteIds,
    participantCount,
    micOn,
    camOn,
    statusText,
    getRemoteRef,
    setLocalEl,
  } = props;
  const chatOpen = useCallStore((s) => s.chatOpen);
  const countLabel = isGroup ? `${participantCount} người` : '';
  const subtitle = [countLabel, statusText].filter(Boolean).join(' · ');
  // Sân khấu audio 1-1 đã in tên + trạng thái ở giữa màn hình → lớp phủ trên chỉ giữ
  // nút thu nhỏ, không lặp lại cùng một dòng chữ hai lần trên một màn.
  const stageShowsIdentity = type === 'AUDIO' && !isGroup;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[200] flex flex-col bg-popover text-popover-foreground">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
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
        </div>

        {chatOpen && (
          <div className="h-[45%] min-h-0 shrink-0 border-t border-border">
            <CallChatPanel />
          </div>
        )}

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pb-10 pt-[calc(var(--safe-top)+0.75rem)]',
            // Nền tối chỉ để chữ trắng đọc được trên video; không có chữ thì bỏ đi,
            // kẻo thành vệt xám vô cớ trên nền sáng của cuộc gọi thoại.
            !stageShowsIdentity && 'bg-gradient-to-b from-black/65 via-black/30 to-transparent',
          )}
        >
          <div className="min-w-0">
            {!stageShowsIdentity && (
              <>
                <p className="truncate text-[15.5px] font-bold leading-tight text-white">
                  {peer.name}
                </p>
                {subtitle && (
                  <p className="truncate text-[12.5px] leading-tight text-white/75">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Thu nhỏ"
            title="Thu nhỏ"
            onClick={() => props.onSetMode('mini')}
            className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors active:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      <UpgradePrompt onAccept={props.onAcceptUpgrade} onDecline={props.onDeclineUpgrade} />

      <CallControls
        micOn={micOn}
        camOn={camOn}
        onToggleMic={props.onToggleMic}
        onToggleCam={props.onToggleCam}
        onHangup={props.onHangup}
        onRequestUpgrade={props.onRequestUpgrade}
        className="gap-2.5 px-3 pb-[calc(var(--safe-bottom)+0.875rem)] pt-3.5"
      />
    </div>
  );
}
