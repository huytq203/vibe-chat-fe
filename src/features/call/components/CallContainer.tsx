'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallActions } from '@/features/call/hooks/useCallActions';
import { useLiveKitRoom } from '@/features/call/hooks/useLiveKitRoom';
import { describeMediaError, formatDuration } from '@/features/call/utils';
import { startRingtone, stopRingtone } from '@/features/call/ringtone';
import { logger } from '@/lib/logger';
import type { CallType } from '@/features/call/types';
import { CallWindow } from './CallWindow';
import { IncomingCallDialog } from './IncomingCallDialog';

const RING_TIMEOUT_MS = 45_000;

/** Orchestrator: đọc store, ghép LiveKit + actions, render cửa sổ call qua Portal. */
export function CallContainer() {
  const phase = useCallStore((s) => s.phase);
  const call = useCallStore((s) => s.call);
  const mode = useCallStore((s) => s.window.mode);
  const windowState = useCallStore((s) => s.window);
  const micOn = useCallStore((s) => s.micOn);
  const camOn = useCallStore((s) => s.camOn);
  const startedAt = useCallStore((s) => s.startedAt);
  const pendingJoin = useCallStore((s) => s.pendingJoin);
  const windowOpen = useCallStore((s) => s.windowOpen);
  const participants = useCallStore((s) => s.participants);

  const actions = useCallActions();
  const { remoteIds, getRemoteRef, setLocalEl, join, leave } = useLiveKitRoom();
  const [elapsed, setElapsed] = useState(0);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LiveKit rớt KHÔNG kết thúc cuộc gọi (nó tự reconnect). Nguồn sự thật kết thúc = call:ended.
  // Trước đây reset() ở đây khiến popup "tự nhiên biến mất" khi negotiation timeout.
  const onDisconnected = useCallback(() => {
    logger.info('LiveKit disconnected — giữ cuộc gọi, chỉ kết thúc khi có call:ended/hangup');
  }, []);

  // Kết thúc cuộc gọi hiện tại đúng tín hiệu theo phase:
  // outgoing (đang đổ chuông) → cancel; incoming → decline; ongoing → leave; chưa có id → dọn cục bộ.
  const endCurrentCall = useCallback(() => {
    const st = useCallStore.getState();
    const id = st.call?.callId ?? null;
    if (id && st.phase === 'outgoing') actions.cancelCall(id);
    else if (id && st.phase === 'incoming') actions.declineCall(id);
    else if (id) actions.hangup(id);
    else {
      useCallStore.getState().reset();
      void leave();
    }
  }, [actions, leave]);

  // Join LiveKit có thể fail (user chặn mic/cam, hoặc connect lỗi) → toast + dọn dẹp.
  // Định nghĩa TRƯỚC mọi effect dùng nó để tránh TDZ (Cannot access before initialization).
  const joinMedia = useCallback(
    async (url: string, token: string, type: CallType) => {
      try {
        await join(url, token, type, onDisconnected);
      } catch (err) {
        // Log lỗi THẬT để chẩn đoán (secure-context / permission / LiveKit connect).
        logger.error('LiveKit join failed', {
          url,
          name: err instanceof Error ? err.name : undefined,
          message: err instanceof Error ? err.message : String(err),
        });
        toast.error(describeMediaError(err));
        endCurrentCall();
      }
    },
    [join, onDisconnected, endCurrentCall],
  );

  // Timer hiển thị khi đang trong cuộc gọi (cập nhật trong callback interval, không sync trong effect body).
  useEffect(() => {
    if (phase !== 'ongoing' || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  // Ringtone: kêu khi đang đổ chuông (gọi đi / gọi đến), tắt khi vào cuộc gọi hoặc kết thúc.
  useEffect(() => {
    if (phase === 'outgoing' || phase === 'incoming') {
      startRingtone();
      return () => stopRingtone();
    }
    stopRingtone();
  }, [phase]);

  // Ring timeout cho caller: 45s không ai bắt máy → emit cancel để BE đóng cuộc gọi (không treo RINGING).
  useEffect(() => {
    if (phase !== 'outgoing') return;
    ringTimer.current = setTimeout(() => {
      void endCurrentCall();
    }, RING_TIMEOUT_MS);
    return () => {
      if (ringTimer.current) clearTimeout(ringTimer.current);
    };
  }, [phase, endCurrentCall]);

  // Caller: token nằm trong pendingJoin (đặt bởi CallButtons) → join LiveKit ở đây.
  useEffect(() => {
    if (!pendingJoin) return;
    const p = pendingJoin;
    useCallStore.getState().setPendingJoin(null);
    void joinMedia(p.url, p.token, p.type);
  }, [pendingJoin, joinMedia]);

  if (phase === 'idle' || !call || typeof document === 'undefined') return null;

  const handleAccept = async () => {
    if (!call.callId) return;
    const ack = await actions.acceptCall(call.callId);
    if (!ack) return;
    useCallStore.getState().markOngoing(ack.callId, Date.now());
    await joinMedia(ack.livekitUrl, ack.livekitToken, ack.type);
  };

  const handleDecline = () => {
    if (call.callId) void actions.declineCall(call.callId);
  };

  const handleHangup = () => {
    void endCurrentCall();
  };

  const statusText =
    phase === 'outgoing' ? 'Đang gọi…' : phase === 'ongoing' ? formatDuration(elapsed) : '';

  // "N người" = số đã JOINED theo roster báo hiệu; fallback theo media LiveKit (mình + remote).
  const joinedCount = participants.filter((p) => p.state === 'JOINED').length;
  const participantCount = joinedCount || remoteIds.length + 1;

  let content: ReactNode = null;
  if (phase === 'incoming') {
    content = (
      <IncomingCallDialog
        peer={call.peer}
        type={call.type}
        isGroup={call.isGroup}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    );
  } else if (windowOpen) {
    // Thu gọn (windowOpen=false) → ẩn cửa sổ nhưng call vẫn chạy; banner dưới ChatHeader để mở lại.
    content = (
      <CallWindow
        type={call.type}
        peer={call.peer}
        isGroup={call.isGroup}
        directory={call.directory}
        remoteIds={remoteIds}
        participantCount={participantCount}
        phase={phase}
        mode={mode}
        micOn={micOn}
        camOn={camOn}
        position={{ x: windowState.x, y: windowState.y }}
        statusText={statusText}
        getRemoteRef={getRemoteRef}
        setLocalEl={setLocalEl}
        onToggleMic={actions.toggleMic}
        onToggleCam={actions.toggleCam}
        onHangup={handleHangup}
        onSetMode={(m) => useCallStore.getState().setWindowMode(m)}
        onClose={() => useCallStore.getState().setWindowOpen(false)}
        onDrag={(x, y) => useCallStore.getState().setPosition(x, y)}
      />
    );
  }

  if (!content) return null;
  return createPortal(content, document.body);
}
