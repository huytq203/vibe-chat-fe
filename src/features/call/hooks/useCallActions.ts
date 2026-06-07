'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import { getCallSocket } from '@/lib/ws/call-socket';
import { leaveRoom, setCam, setMic } from '@/lib/livekit/room';
import { useCallStore } from '@/features/call/stores/call.store';
import { callTokenAckSchema } from '@/features/call/schemas';
import { mapCallErrorCode } from '@/features/call/utils';
import { logger } from '@/lib/logger';
import type { CallPeer, CallTokenAck, CallType } from '@/features/call/types';

type Ack = { ok: boolean; code?: string; message?: string } & Record<string, unknown>;

function emitWithAck(event: string, payload: unknown): Promise<Ack> {
  return new Promise((resolve) => {
    const socket = getCallSocket(apiAuth.getToken());
    if (!socket) return resolve({ ok: false, code: 'NO_SOCKET', message: 'Mất kết nối' });
    // Đo latency ack từ BE để biết BE có bị chậm (vd provision LiveKit) không.
    const t0 = Date.now();
    logger.info('[call] emit', { event, connected: socket.connected });
    socket.emit(event, payload, (ack: Ack) => {
      logger.info('[call] ack', { event, ms: Date.now() - t0, ok: ack?.ok });
      resolve(ack ?? { ok: false });
    });
  });
}

/** Hành động FE→BE cho cuộc gọi: emit qua call-socket + drive LiveKit + store. */
export function useCallActions() {
  const store = useCallStore;

  const startCall = useCallback(
    async (
      conversationId: string,
      type: CallType,
      peer: CallPeer,
    ): Promise<CallTokenAck | null> => {
      store.getState().startOutgoing(conversationId, type, peer);
      const ack = await emitWithAck('call:initiate', { conversationId, type });
      if (!ack.ok) {
        toast.error(mapCallErrorCode(ack.code ?? '', ack.message));
        store.getState().reset();
        return null;
      }
      const parsed = callTokenAckSchema.safeParse(ack);
      if (!parsed.success) {
        toast.error('Phản hồi cuộc gọi không hợp lệ');
        store.getState().reset();
        return null;
      }
      return parsed.data;
    },
    [store],
  );

  const acceptCall = useCallback(
    async (callId: string): Promise<CallTokenAck | null> => {
      const ack = await emitWithAck('call:accept', { callId });
      if (!ack.ok) {
        toast.error(mapCallErrorCode(ack.code ?? '', ack.message));
        store.getState().reset();
        return null;
      }
      const parsed = callTokenAckSchema.safeParse(ack);
      if (!parsed.success) {
        store.getState().reset();
        return null;
      }
      return parsed.data;
    },
    [store],
  );

  // Các hành động kết thúc: đóng UI NGAY, gửi tín hiệu BE + ngắt LiveKit chạy nền
  // (không await ack — BE có thể chậm tới ~16s do treo LiveKit, không để UI chờ theo).
  const declineCall = useCallback(
    (callId: string, reason?: string) => {
      store.getState().reset();
      void emitWithAck('call:decline', { callId, reason });
    },
    [store],
  );

  const cancelCall = useCallback(
    (callId: string) => {
      store.getState().reset();
      void leaveRoom();
      void emitWithAck('call:cancel', { callId });
    },
    [store],
  );

  const hangup = useCallback(
    (callId: string) => {
      store.getState().reset();
      void leaveRoom();
      void emitWithAck('call:leave', { callId });
    },
    [store],
  );

  // Toggle mic/cam: cập nhật UI trước, áp dụng vào LiveKit chạy nền.
  const toggleMic = useCallback(() => {
    const next = !store.getState().micOn;
    store.getState().setMic(next);
    void setMic(next);
  }, [store]);

  const toggleCam = useCallback(() => {
    const next = !store.getState().camOn;
    store.getState().setCam(next);
    void setCam(next);
  }, [store]);

  return { startCall, acceptCall, declineCall, cancelCall, hangup, toggleMic, toggleCam };
}
