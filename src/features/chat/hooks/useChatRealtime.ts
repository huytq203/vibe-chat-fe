'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import {
  onEvent,
  closeSocket,
  getSocket,
  refreshSocketAuth,
  setForceLogoutHandler,
  setTokenProvider,
} from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { chatKeys } from '@/services/keys';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useSelectedConversation } from './useSelectedConversation';
import {
  makeOnConversationDeleted,
  makeOnConversationNotify,
  makeOnConversationUpdated,
  makeOnJoinRequest,
  makeOnJoinRequestResolved,
  makeOnMembersAdded,
  makeOnMemberRemoved,
  makeOnMessageDeleted,
  makeOnMessageEdited,
  makeOnMessageNew,
  makeOnMessageRead,
  makeOnMuteUpdated,
  makeOnPinUpdated,
  makeOnPresenceUpdate,
  makeOnReactionUpdated,
  makeOnScheduledSent,
  makeOnScheduledUpdate,
  makeOnTyping,
  makeOnUserUpdated,
  makePatchConvInList,
  makeShouldBumpUnread,
  makeUpsertMessage,
  type RealtimeHandlerDeps,
} from './chat-realtime-handlers';

const HEARTBEAT_MS = 30_000;

export function useChatRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clear);
  const clearConvLocks = useConvLockStore((s) => s.clearAll);
  const router = useRouter();
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Phân biệt initial connect (không cần invalidate) vs reconnect (cần bù event bị miss).
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    setTokenProvider(() => apiAuth.getToken());
    apiAuth.onTokenChange((t) => refreshSocketAuth(t));
    // BE kick phiên cũ khi login thiết bị khác → xoá session local + về login ngay.
    setForceLogoutHandler(() => {
      clearSession();
      clearConvLocks();
      qc.clear();
      toast.error('Tài khoản được đăng nhập trên thiết bị khác');
      router.replace('/login');
    });
    return () => {
      apiAuth.onTokenChange(null);
      setForceLogoutHandler(null);
    };
  }, [clearSession, clearConvLocks, qc, router]);

  // Khi tab close / refresh: chủ động disconnect WS để BE đánh dấu offline ngay,
  // không phải đợi pingTimeout (~20s).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onUnload() {
      closeSocket();
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
      joinedRef.current = null;
      closeSocket();
      return;
    }
    const token = apiAuth.getToken();
    const socket = getSocket(token);
    if (!socket) return;
    // Alias non-null để dùng an toàn trong các closure (TS widen socket về null trong closure).
    const s = socket;

    const patchConvInList = makePatchConvInList(qc);
    const upsertMessage = makeUpsertMessage(qc);
    const shouldBumpUnread = makeShouldBumpUnread();
    const deps: RealtimeHandlerDeps = {
      qc,
      joinedRef,
      setSelected,
      typingTimersRef,
      patchConvInList,
      upsertMessage,
      shouldBumpUnread,
    };

    const onMessageNew = makeOnMessageNew(deps);
    const onMessageEdited = makeOnMessageEdited(deps);
    const onMessageDeleted = makeOnMessageDeleted(deps);
    const onConversationNotify = makeOnConversationNotify(deps);

    // Nếu socket đã connected sẵn (singleton tái dùng) → coi như đã qua initial-connect,
    // để lần 'connect' kế tiếp được xử lý như reconnect thật (tránh kẹt cờ → bỏ lỡ catch-up).
    hasConnectedRef.current = s.connected;

    function onReconnect() {
      if (!hasConnectedRef.current) {
        // Initial connect — data vừa được fetch REST, không cần invalidate.
        hasConnectedRef.current = true;
        return;
      }
      // Reconnect thật (mất mạng, tab background lâu): connection mới mất hết room đã join
      // → re-join conv đang mở để typing/read-receipt/message:new room-scoped sống lại.
      if (joinedRef.current) {
        s.emit('conversation:join', { conversationId: joinedRef.current });
      }
      // Bù event đã miss trong gap.
      qc.invalidateQueries({ queryKey: chatKeys.all });
    }

    const onMessageRead = makeOnMessageRead(deps);
    const onPresenceUpdate = makeOnPresenceUpdate(deps);
    const onTyping = makeOnTyping(deps);
    const onConversationDeleted = makeOnConversationDeleted(deps);
    const onMuteUpdated = makeOnMuteUpdated(deps);
    const onMembersAdded = makeOnMembersAdded(deps);
    const onMemberRemoved = makeOnMemberRemoved(deps);
    const onJoinRequest = makeOnJoinRequest(deps);
    const onJoinRequestResolved = makeOnJoinRequestResolved(deps);
    const onConversationUpdated = makeOnConversationUpdated(deps);
    const onUserUpdated = makeOnUserUpdated(deps);
    const onReactionUpdated = makeOnReactionUpdated(deps);
    const onPinUpdated = makeOnPinUpdated(deps);
    const onScheduledUpdate = makeOnScheduledUpdate(deps);
    const onScheduledSent = makeOnScheduledSent(deps);

    const unsubMessageNew = onEvent('message:new', onMessageNew as (data: unknown) => void);
    const unsubScheduledUpdate = onEvent('scheduled_message:update', onScheduledUpdate as (data: unknown) => void);
    const unsubScheduledSent = onEvent('scheduled_message:sent', onScheduledSent as (data: unknown) => void);
    const unsubConvUpdated = onEvent('conversation:updated', onConversationUpdated as (data: unknown) => void);
    const unsubPinUpdated = onEvent('conversation:pin_updated', onPinUpdated as (data: unknown) => void);
    const unsubReactionUpdated = onEvent('message:reaction_updated', onReactionUpdated as (data: unknown) => void);
    const unsubMessageEdited = onEvent('message:edited', onMessageEdited as (data: unknown) => void);
    const unsubMessageDeleted = onEvent('message:deleted', onMessageDeleted as (data: unknown) => void);
    const unsubConvNotify = onEvent('conversation:notify', onConversationNotify as (data: unknown) => void);
    const unsubConvDeleted = onEvent('conversation:deleted', onConversationDeleted as (data: unknown) => void);
    const unsubMuteUpdated = onEvent('conversation:mute_updated', onMuteUpdated as (data: unknown) => void);
    const unsubMembersAdded = onEvent('conversation:members_added', onMembersAdded as (data: unknown) => void);
    const unsubMemberRemoved = onEvent('conversation:member_removed', onMemberRemoved as (data: unknown) => void);
    const unsubJoinRequest = onEvent('conversation:join_request', onJoinRequest as (data: unknown) => void);
    const unsubJoinRequestResolved = onEvent('conversation:join_request_resolved', onJoinRequestResolved as (data: unknown) => void);
    const unsubMessageRead = onEvent('message:read', onMessageRead as (data: unknown) => void);
    const unsubPresenceUpdate = onEvent('presence:update', onPresenceUpdate as (data: unknown) => void);
    const unsubTyping = onEvent('typing', onTyping as (data: unknown) => void);
    const unsubUserUpdated = onEvent('user:updated', onUserUpdated as (data: unknown) => void);
    socket.on('connect', onReconnect);

    function sendHeartbeat() {
      if (!s.connected) return;
      // BE prune socket sau 60s mất heartbeat → trả ack { reconnect: true }
      // để FE chủ động reconnect cho sạch split-brain state.
      s.emit('presence:heartbeat', (ack: { reconnect?: boolean } | undefined) => {
        if (ack?.reconnect) {
          s.disconnect();
          s.connect();
        }
      });
    }
    const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_MS);
    // Tab background → setInterval bị throttle ~1 phút → dễ bị prune. Khi tab visible
    // lại, emit ngay để đồng bộ presence trước khi user thấy stale state.
    function onVisibility() {
      if (document.visibilityState === 'visible') sendHeartbeat();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubMessageNew();
      unsubScheduledUpdate();
      unsubScheduledSent();
      unsubConvUpdated();
      unsubPinUpdated();
      unsubReactionUpdated();
      unsubMessageEdited();
      unsubMessageDeleted();
      unsubConvNotify();
      unsubConvDeleted();
      unsubMuteUpdated();
      unsubMembersAdded();
      unsubMemberRemoved();
      unsubJoinRequest();
      unsubJoinRequestResolved();
      unsubMessageRead();
      unsubPresenceUpdate();
      unsubTyping();
      unsubUserUpdated();
      socket.off('connect', onReconnect);
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const t of Object.values(typingTimersRef.current)) clearTimeout(t);
      typingTimersRef.current = {};
    };
  }, [isAuthed, qc, setSelected]);

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;

    const next = selectedConversationId;
    const prev = joinedRef.current;
    if (prev === next) return;

    if (prev) {
      socket.emit('conversation:leave', { conversationId: prev });
      useTypingStore.getState().clearConv(prev);
    }
    if (next) socket.emit('conversation:join', { conversationId: next });
    joinedRef.current = next;
  }, [isAuthed, selectedConversationId]);
}
