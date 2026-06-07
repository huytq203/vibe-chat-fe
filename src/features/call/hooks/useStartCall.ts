'use client';

import { useCallback } from 'react';
import { useCallActions } from '@/features/call/hooks/useCallActions';
import { useCallStore } from '@/features/call/stores/call.store';
import type { CallPeer, CallType } from '@/features/call/types';

/** Bắt đầu cuộc gọi audio/video + xử lý ack (attach callId, join LiveKit).
 *  Dùng chung cho mọi entry point gọi (ChatHeader, ContactInfo, ...). */
export function useStartCall() {
  const { startCall } = useCallActions();
  const phase = useCallStore((s) => s.phase);
  const busy = phase !== 'idle';

  const start = useCallback(
    async (conversationId: string, type: CallType, peer: CallPeer) => {
      const ack = await startCall(conversationId, type, peer);
      if (!ack) return;
      // Lưu callId để có thể call:cancel khi huỷ/timeout (tránh để cuộc gọi treo RINGING trên BE).
      useCallStore.getState().attachCallId(ack.callId);
      // Group có call đang chạy → BE trả status ONGOING (không có call:accepted). Vào thẳng,
      // không kẹt ở "Đang gọi…". 1-1 luôn RINGING → giữ outgoing tới khi có call:accepted.
      if (ack.status === 'ONGOING') {
        useCallStore.getState().markOngoing(ack.callId, Date.now());
      }
      // Đặt token để CallContainer join LiveKit.
      useCallStore.getState().setPendingJoin({
        url: ack.livekitUrl,
        token: ack.livekitToken,
        type: ack.type,
      });
    },
    [startCall],
  );

  return { start, busy };
}
