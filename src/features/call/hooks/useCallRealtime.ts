'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiAuth } from '@/lib/api/client';
import { leaveRoom } from '@/lib/livekit/room';
import {
  closeCallSocket,
  getCallSocket,
  refreshCallSocketAuth,
  setCallTokenProvider,
} from '@/lib/ws/call-socket';
import { chatKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { useCallStore } from '@/features/call/stores/call.store';
import { endedSchema, incomingSchema } from '@/features/call/schemas';
import { buildCallDirectory } from '@/features/call/utils';
import { getConversationName } from '@/features/chat/utils';
import { logger } from '@/lib/logger';
import type { Conversation } from '@/features/chat/types';
import type {
  AcceptedPayload,
  CancelledPayload,
  DeclinedPayload,
  EndedPayload,
  IncomingPayload,
  ParticipantPayload,
} from '@/features/call/types';

/** Tìm conversation trong cache TanStack (detail trước, rồi quét các trang list). */
function findConversation(qc: QueryClient, id: string): Conversation | undefined {
  const detail = qc.getQueryData<Conversation>(chatKeys.conversationDetail(id));
  if (detail) return detail;
  const lists = qc.getQueriesData<Conversation[]>({ queryKey: chatKeys.conversationLists() });
  for (const [, data] of lists) {
    const found = data?.find((c) => c.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Event có thuộc cuộc gọi hiện tại không (callId chưa biết = caller chưa nhận ack → vẫn nhận). */
function isCurrentCall(callId: string): boolean {
  const c = useCallStore.getState().call;
  return !!c && (c.callId === null || c.callId === callId);
}

/** Nghe event báo hiệu BE→FE trên socket /call. Mount 1 lần ở root (ChatLayout). */
export function useCallRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

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

      // Resolve tên/avatar + group từ cache conversation (để gắn nhãn lưới + tiêu đề).
      const conv = findConversation(qc, p.data.conversationId);
      const isGroup = conv ? conv.type !== 'DIRECT' : false;
      const directory = buildCallDirectory(conv);
      const meId = useAuthStore.getState().user?.id ?? null;
      const initiator = directory[p.data.initiatorId];

      let name = 'Cuộc gọi đến';
      let avatarUrl: string | null = null;
      if (isGroup && conv) {
        name = getConversationName(conv, meId);
        avatarUrl = conv.avatarUrl;
      } else if (initiator) {
        name = initiator.name;
        avatarUrl = initiator.avatarUrl;
      } else if (conv) {
        name = getConversationName(conv, meId);
      }

      s.getState().receiveIncoming(
        p.data.callId,
        p.data.conversationId,
        p.data.type,
        { id: p.data.initiatorId, name, avatarUrl },
        isGroup,
        directory,
      );
    }

    function onAccepted(payload: AcceptedPayload) {
      const st = s.getState();
      if (st.phase === 'outgoing' && st.call && isCurrentCall(payload.callId)) {
        s.getState().markOngoing(payload.callId, Date.now());
      }
    }

    // Spec §3.2/§5.4: declined CHỈ gửi tới initiator. 1-1 → BE bắn kèm call:ended (DECLINED);
    // group → chỉ 1 người rời, call vẫn chạy. Vì vậy KHÔNG đóng UI ở đây — chỉ gỡ người đó + toast.
    // Việc đóng UI để call:ended lo (idempotent, §128).
    function onDeclined(payload: DeclinedPayload) {
      if (!isCurrentCall(payload.callId)) return;
      s.getState().participantLeft(payload.by);
      if (s.getState().phase === 'outgoing') toast('Cuộc gọi bị từ chối');
    }

    // Group (§5.4): cập nhật roster khi có người vào/ra room — đổi nhãn "N người" ở header.
    function onParticipantJoined(payload: ParticipantPayload) {
      if (isCurrentCall(payload.callId)) s.getState().participantJoined(payload.userId);
    }
    function onParticipantLeft(payload: ParticipantPayload) {
      if (isCurrentCall(payload.callId)) s.getState().participantLeft(payload.userId);
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
    socket.on('call:participant_joined', onParticipantJoined);
    socket.on('call:participant_left', onParticipantLeft);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:participant_joined', onParticipantJoined);
      socket.off('call:participant_left', onParticipantLeft);
      socket.off('call:ended', onEnded);
    };
  }, [isAuthed, qc]);
}
