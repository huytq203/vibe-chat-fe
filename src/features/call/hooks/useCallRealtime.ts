'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { leaveRoom } from '@/lib/livekit/room';
import {
  closeCallSocket,
  getCallSocket,
  refreshCallSocketAuth,
  setCallTokenProvider,
} from '@/lib/ws/call-socket';
import { useAuthStore } from '@/features/auth';
import { useCallStore } from '@/features/call/stores/call.store';
import { endedSchema, incomingSchema } from '@/features/call/schemas';
import { logger } from '@/lib/logger';
import type {
  AcceptedPayload,
  CancelledPayload,
  DeclinedPayload,
  EndedPayload,
  IncomingPayload,
} from '@/features/call/types';

/** Event có thuộc cuộc gọi hiện tại không (callId chưa biết = caller chưa nhận ack → vẫn nhận). */
function isCurrentCall(callId: string): boolean {
  const c = useCallStore.getState().call;
  return !!c && (c.callId === null || c.callId === callId);
}

/** Nghe event báo hiệu BE→FE trên socket /call. Mount 1 lần ở root (ChatLayout). */
export function useCallRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    setCallTokenProvider(() => apiAuth.getToken());
    apiAuth.onTokenChange((t) => refreshCallSocketAuth(t));
    return () => apiAuth.onTokenChange(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onUnload() {
      void leaveRoom();
      closeCallSocket();
    }
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      closeCallSocket();
      return;
    }
    const socket = getCallSocket(apiAuth.getToken());
    if (!socket) return;
    const s = useCallStore;

    function onIncoming(raw: IncomingPayload) {
      logger.info('[call] incoming received');
      const p = incomingSchema.safeParse(raw);
      if (!p.success) return;
      // Đang trong cuộc gọi khác → bỏ qua (BE sẽ tự xử lý BUSY).
      if (s.getState().phase !== 'idle') return;
      s.getState().receiveIncoming(p.data.callId, p.data.conversationId, p.data.type, {
        id: p.data.initiatorId,
        name: 'Cuộc gọi đến',
        avatarUrl: null,
      });
    }

    function onAccepted(payload: AcceptedPayload) {
      const st = s.getState();
      if (st.phase === 'outgoing' && st.call && isCurrentCall(payload.callId)) {
        s.getState().markOngoing(payload.callId, Date.now());
      }
    }

    // Spec §3.2/§5.4: declined CHỈ gửi tới initiator. 1-1 → BE bắn kèm call:ended (DECLINED);
    // group → chỉ 1 người rời, call vẫn chạy. Vì vậy KHÔNG đóng UI ở đây — chỉ toast.
    // Việc đóng UI để call:ended lo (idempotent, §128).
    function onDeclined(payload: DeclinedPayload) {
      if (isCurrentCall(payload.callId) && s.getState().phase === 'outgoing') {
        toast('Cuộc gọi bị từ chối');
      }
    }

    // Caller huỷ khi mình chưa bắt máy (hoặc caller đóng tab lúc đổ chuông) → tắt chuông callee.
    function onCancelled(payload: CancelledPayload) {
      if (isCurrentCall(payload.callId)) {
        void leaveRoom();
        s.getState().reset();
      }
    }

    // Nguồn sự thật kết thúc (§128) — đóng UI dứt điểm, idempotent. Có thể nhận nhiều lần.
    function onEnded(raw: EndedPayload) {
      const p = endedSchema.safeParse(raw);
      if (!p.success) return;
      if (!isCurrentCall(p.data.callId)) return;
      void leaveRoom();
      s.getState().reset();
      if (p.data.reason === 'MISSED') toast('Cuộc gọi nhỡ');
    }

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:declined', onDeclined);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:ended', onEnded);
    };
  }, [isAuthed]);
}
