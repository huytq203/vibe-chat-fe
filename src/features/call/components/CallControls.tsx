'use client';

import type { ComponentType } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Sparkles,
  Video,
  VideoOff,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallPro } from '@/features/call/hooks/useCallPro';
import { DevicePicker } from './DevicePicker';

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
  /** AUDIO 1-1: xin chuyển sang video (cần 2 bên đồng ý). */
  onRequestUpgrade?: () => void;
};

type CtrlButtonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  /** off = nền đỏ đặc (tắt mic/cam); active = nền primary (đang bật tính năng pro). */
  variant?: 'default' | 'off' | 'active';
  disabled?: boolean;
  pulse?: boolean;
};

function CtrlButton({
  label,
  icon: Icon,
  onClick,
  variant = 'default',
  disabled,
  pulse,
}: CtrlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-full transition-colors disabled:opacity-60',
        variant === 'off' && 'bg-destructive text-white hover:bg-destructive/90',
        variant === 'active' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'default' && 'bg-foreground/5 text-foreground hover:bg-foreground/10',
      )}
    >
      <Icon className={cn('h-5 w-5', pulse && 'animate-pulse')} />
    </button>
  );
}

export function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangup,
  onRequestUpgrade,
}: CallControlsProps) {
  const isOngoing = useCallStore((s) => s.phase === 'ongoing');
  const screenOn = useCallStore((s) => s.screenOn);
  const blurOn = useCallStore((s) => s.blurOn);
  const chatOpen = useCallStore((s) => s.chatOpen);
  const setChatOpen = useCallStore((s) => s.setChatOpen);
  const callType = useCallStore((s) => s.call?.type);
  const isGroup = useCallStore((s) => s.call?.isGroup ?? false);
  const upgradeState = useCallStore((s) => s.upgrade.state);
  const { toggleScreen, toggleBlur } = useCallPro();

  // AUDIO 1-1 đang gọi: bật cam phải qua cơ chế 2 bên đồng ý (không bật trực tiếp).
  const needsConsent = isOngoing && callType === 'AUDIO' && !isGroup;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-accent p-3">
      <CtrlButton
        label={micOn ? 'Tắt micro' : 'Bật micro'}
        icon={micOn ? Mic : MicOff}
        variant={micOn ? 'default' : 'off'}
        onClick={onToggleMic}
      />

      {needsConsent ? (
        <CtrlButton
          label={upgradeState === 'requesting' ? 'Đang chờ đồng ý…' : 'Chuyển sang video'}
          icon={Video}
          variant={upgradeState === 'requesting' ? 'active' : 'default'}
          pulse={upgradeState === 'requesting'}
          disabled={upgradeState === 'requesting'}
          onClick={onRequestUpgrade}
        />
      ) : (
        <CtrlButton
          label={camOn ? 'Tắt camera' : 'Bật camera'}
          icon={camOn ? Video : VideoOff}
          variant={camOn ? 'default' : 'off'}
          onClick={onToggleCam}
        />
      )}

      {isOngoing && (
        <>
          <CtrlButton
            label={screenOn ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            icon={MonitorUp}
            variant={screenOn ? 'active' : 'default'}
            onClick={() => void toggleScreen()}
          />
          {camOn && (
            <CtrlButton
              label={blurOn ? 'Tắt làm mờ nền' : 'Làm mờ nền'}
              icon={Sparkles}
              variant={blurOn ? 'active' : 'default'}
              onClick={() => void toggleBlur()}
            />
          )}
          <DevicePicker />
          <CtrlButton
            label={chatOpen ? 'Đóng chat' : 'Mở chat'}
            icon={MessageSquare}
            variant={chatOpen ? 'active' : 'default'}
            onClick={() => setChatOpen(!chatOpen)}
          />
        </>
      )}

      <CtrlButton label="Kết thúc" icon={PhoneOff} variant="off" onClick={onHangup} />
    </div>
  );
}
