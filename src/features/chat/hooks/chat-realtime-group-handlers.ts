import { toast } from 'sonner';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { chatKeys, friendKeys, userKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import type { Conversation } from '@/features/chat/types';
import type { RealtimeHandlerDeps } from './chat-realtime-cache';
import type {
  ConversationDeletedPayload,
  ConversationUpdatedPayload,
  JoinRequestPayload,
  JoinRequestResolvedPayload,
  MembersAddedPayload,
  MemberRemovedPayload,
  MuteUpdatedPayload,
  PinUpdatedPayload,
  TypingPayload,
  UserUpdatedPayload,
} from './chat-realtime-types';

const TYPING_AUTOCLEAR_MS = 6_000;

export function makeOnTyping(deps: RealtimeHandlerDeps): (payload: TypingPayload) => void {
  const { typingTimersRef } = deps;
  return function onTyping(payload: TypingPayload) {
    const meId = useAuthStore.getState().user?.id ?? null;
    if (payload.userId === meId) return;
    const isStart = payload.state === 'start';
    useTypingStore
      .getState()
      .setTyping(payload.conversationId, payload.userId, isStart);
    const key = `${payload.conversationId}:${payload.userId}`;
    const timer = typingTimersRef.current[key];
    if (timer) clearTimeout(timer);
    if (isStart) {
      typingTimersRef.current[key] = setTimeout(() => {
        useTypingStore
          .getState()
          .setTyping(payload.conversationId, payload.userId, false);
        delete typingTimersRef.current[key];
      }, TYPING_AUTOCLEAR_MS);
    } else {
      delete typingTimersRef.current[key];
    }
  };
}

export function makeOnConversationDeleted(
  deps: RealtimeHandlerDeps,
): (payload: ConversationDeletedPayload) => void {
  const { qc, joinedRef, setSelected } = deps;
  return function onConversationDeleted(payload: ConversationDeletedPayload) {
    qc.removeQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
    qc.removeQueries({ queryKey: chatKeys.messages(payload.conversationId) });
    debouncedInvalidate(qc, chatKeys.conversationLists());
    if (joinedRef.current === payload.conversationId) {
      joinedRef.current = null;
      setSelected(null);
    }
  };
}

// Mute đồng bộ đa thiết bị của chính user (xem 22-mute-notifications.md).
export function makeOnMuteUpdated(
  deps: RealtimeHandlerDeps,
): (payload: MuteUpdatedPayload) => void {
  const { qc } = deps;
  return function onMuteUpdated(payload: MuteUpdatedPayload) {
    qc.setQueriesData<Conversation[]>(
      { queryKey: chatKeys.conversationLists() },
      (prev) =>
        prev
          ? prev.map((c) =>
              c.id === payload.conversationId
                ? { ...c, isMuted: payload.isMuted, mutedUntil: payload.mutedUntil }
                : c,
            )
          : prev,
    );
    qc.setQueryData<Conversation | undefined>(
      chatKeys.conversationDetail(payload.conversationId),
      (prev) =>
        prev ? { ...prev, isMuted: payload.isMuted, mutedUntil: payload.mutedUntil } : prev,
    );
  };
}

// ─── Thành viên nhóm & yêu cầu vào nhóm (xem 16-group-members.md) ───────
export function makeOnMembersAdded(
  deps: RealtimeHandlerDeps,
): (payload: MembersAddedPayload) => void {
  const { qc } = deps;
  return function onMembersAdded(payload: MembersAddedPayload) {
    qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
    debouncedInvalidate(qc, chatKeys.conversationLists());
  };
}

export function makeOnMemberRemoved(
  deps: RealtimeHandlerDeps,
): (payload: MemberRemovedPayload) => void {
  const { qc, joinedRef, setSelected } = deps;
  return function onMemberRemoved(payload: MemberRemovedPayload) {
    const meId = useAuthStore.getState().user?.id ?? null;
    if (payload.userId === meId) {
      // Mình bị kick / vừa rời → gỡ conversation khỏi state, đóng nếu đang mở.
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(payload.conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      if (joinedRef.current === payload.conversationId) {
        joinedRef.current = null;
        setSelected(null);
        toast.info(payload.reason === 'LEFT' ? 'Bạn đã rời nhóm' : 'Bạn đã bị xoá khỏi nhóm');
      }
    } else {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }
  };
}

export function makeOnJoinRequest(
  deps: RealtimeHandlerDeps,
): (payload: JoinRequestPayload) => void {
  const { qc } = deps;
  return function onJoinRequest(payload: JoinRequestPayload) {
    // Người duyệt nhận event → refetch danh sách yêu cầu chờ duyệt.
    qc.invalidateQueries({ queryKey: chatKeys.joinRequests(payload.conversationId) });
  };
}

export function makeOnJoinRequestResolved(
  deps: RealtimeHandlerDeps,
): (payload: JoinRequestResolvedPayload) => void {
  const { qc } = deps;
  return function onJoinRequestResolved(payload: JoinRequestResolvedPayload) {
    if (payload.status === 'ACCEPTED') {
      toast.success('Bạn đã được duyệt vào nhóm');
      debouncedInvalidate(qc, chatKeys.conversationLists());
    } else if (payload.status === 'REJECTED') {
      toast.info('Yêu cầu vào nhóm bị từ chối');
    }
  };
}

// Tên/mô tả/settings/isPublic đổi → refetch detail để lấy bản mới.
export function makeOnConversationUpdated(
  deps: RealtimeHandlerDeps,
): (payload: ConversationUpdatedPayload) => void {
  const { qc } = deps;
  return function onConversationUpdated(payload: ConversationUpdatedPayload) {
    qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
    debouncedInvalidate(qc, chatKeys.conversationLists());
  };
}

// 1 user đổi hồ sơ (tên/avatar...) → cập nhật mọi nơi hiển thị user đó mà không
// cần user mở lại màn hình. Bao gồm chính chủ đổi ở thiết bị khác (đồng bộ header).
export function makeOnUserUpdated(
  deps: RealtimeHandlerDeps,
): (payload: UserUpdatedPayload) => void {
  const { qc, joinedRef } = deps;
  return function onUserUpdated(payload: UserUpdatedPayload) {
    const cur = useAuthStore.getState().user;
    // Chính mình đổi ở thiết bị/tab khác → đồng bộ auth store ngay (avatar/tên ở header).
    if (cur && cur.id === payload.userId) {
      useAuthStore.getState().setUser({
        ...cur,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
      });
    }
    // Màn profile của user này lấy bản mới.
    qc.invalidateQueries({ queryKey: userKeys.profile(payload.userId) });
    // Hẹp lại: chỉ sidebar (list) + member nhóm đang mở, KHÔNG kéo theo mọi detail/
    // joinRequests/bannedMembers như chatKeys.conversations().
    debouncedInvalidate(qc, chatKeys.conversationLists());
    if (joinedRef.current) {
      debouncedInvalidate(qc, chatKeys.conversationDetail(joinedRef.current));
    }
    // Danh sách bạn bè (tên/avatar) — chỉ list, không đụng incoming/outgoing requests.
    debouncedInvalidate(qc, friendKeys.list());
  };
}

// Ghim/bỏ ghim tin → refetch danh sách ghim + detail (pinnedCount).
export function makeOnPinUpdated(
  deps: RealtimeHandlerDeps,
): (payload: PinUpdatedPayload) => void {
  const { qc } = deps;
  return function onPinUpdated(payload: PinUpdatedPayload) {
    qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(payload.conversationId) });
    qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
  };
}

// Tin hẹn giờ thay đổi vòng đời (tạo/sửa/huỷ/gửi/lỗi) ở thiết bị khác của chính
// mình → đồng bộ danh sách hẹn giờ. scheduled.conversationId là UUID conversation.
export function makeOnScheduledUpdate(
  deps: RealtimeHandlerDeps,
): (payload: { scheduled?: { conversationId?: string } }) => void {
  const { qc } = deps;
  return function onScheduledUpdate(payload: {
    scheduled?: { conversationId?: string };
  }) {
    const convId = payload?.scheduled?.conversationId;
    if (convId) {
      qc.invalidateQueries({ queryKey: chatKeys.scheduledMessages(convId) });
    }
  };
}

// Tin hẹn giờ đã tới giờ & gửi: tin thật tới qua 'message:new', còn đây để
// chuyển trạng thái PENDING → SENT trong danh sách hẹn giờ.
export function makeOnScheduledSent(
  deps: RealtimeHandlerDeps,
): (payload: { conversationId?: string }) => void {
  const { qc } = deps;
  return function onScheduledSent(payload: { conversationId?: string }) {
    if (payload?.conversationId) {
      qc.invalidateQueries({
        queryKey: chatKeys.scheduledMessages(payload.conversationId),
      });
    }
  };
}
