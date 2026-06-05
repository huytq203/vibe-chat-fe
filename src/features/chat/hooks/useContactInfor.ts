"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/features/auth";
import {
  useBlockedUsers,
  useFriends,
  useOutgoingFriendRequests,
} from "@/features/friends/hooks/use-query";
import {
  useBlockUser,
  useCancelFriendRequest,
  useSendFriendRequest,
  useUnblockUser,
  useUnfriend,
} from "@/features/friends/hooks/use-mutations";
import { useChatUIStore } from "@/features/chat/stores/chat-ui.store";
import { useSelectedConversation } from "./useSelectedConversation";
import { useConversation, usePresence } from "./use-query";
import {
  useDeleteConversation,
  useLeaveConversation,
  useTogglePinConversation,
} from "./use-mutations";
import { getConversationName, getConversationSeed } from "@/features/chat/utils";

const useContactInfor = () => {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const setRightOpen = useChatUIStore((s) => s.setRightOpen);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const { data: conversation } = useConversation(selectedConversationId);
  const otherIds =
    conversation && conversation.type === "DIRECT"
      ? conversation.memberIds.filter((id) => id !== meId)
      : [];
  const { data: presenceList } = usePresence(otherIds);
  const otherPresence = presenceList?.[0] ?? null;

  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const deleteConvMut = useDeleteConversation();
  const leaveConvMut = useLeaveConversation();
  const togglePinMut = useTogglePinConversation();
  const otherUserId = otherIds[0] ?? null;
  const friendsQuery = useFriends();
  const blockedQuery = useBlockedUsers();
  const outgoingQuery = useOutgoingFriendRequests();
  const unfriendMut = useUnfriend();
  const blockMut = useBlockUser();
  const unblockMut = useUnblockUser();
  const sendFriendMut = useSendFriendRequest();
  const cancelFriendMut = useCancelFriendRequest();

  const isFriend = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(friendsQuery.data?.items.some((it) => it.user.id === otherUserId));
  }, [friendsQuery.data, otherUserId]);

  const isBlocked = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(blockedQuery.data?.items.some((it) => it.user.id === otherUserId));
  }, [blockedQuery.data, otherUserId]);

  const hasOutgoingRequest = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(
      outgoingQuery.data?.items.some(
        (it) => it.user.id === otherUserId && it.status === "PENDING_OUT",
      ),
    );
  }, [outgoingQuery.data, otherUserId]);

  if (!conversation) return null;

  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const isDirect = conversation.type === "DIRECT";
  const canUnfriend = isDirect && isFriend && Boolean(otherUserId);
  const canCancelRequest = isDirect && !isFriend && hasOutgoingRequest && Boolean(otherUserId);
  const canBlock = isDirect && Boolean(otherUserId);
  const canDelete = isDirect || conversation.ownerId === meId;
  // Rời nhóm: group/channel và mình KHÔNG phải owner (owner phải xoá nhóm).
  const canLeave = !isDirect && conversation.ownerId !== meId;
  const blockBusy = blockMut.isPending || unblockMut.isPending;
  const isPinned = Boolean(conversation.isPinned);

  const handleTogglePin = () => {
    if (togglePinMut.isPending) return;
    togglePinMut.mutate({ conversationId: conversation.id, pinned: !isPinned });
  };

  const status = otherPresence?.isOnline ? "online" : otherPresence ? "offline" : null;
  const statusText = otherPresence?.isOnline
    ? "Đang hoạt động"
    : (otherPresence?.lastSeenLabel ??
      (conversation.type === "DIRECT" ? "Ngoại tuyến" : `${conversation.memberCount} thành viên`));
  const statusVariant: "soft-success" | "soft-warning" | "secondary" =
    otherPresence?.isOnline ? "soft-success" : "secondary";

  const handleConfirmUnfriend = () => {
    if (!otherUserId) return;
    unfriendMut.mutate(otherUserId, {
      onSuccess: () => setConfirmUnfriendOpen(false),
    });
  };

  const handleConfirmDelete = (scope: 'ME' | 'BOTH') => {
    if (!selectedConversationId) return;
    deleteConvMut.mutate({ conversationId: selectedConversationId, scope }, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        setRightOpen(false);
        setSelected(null);
      },
    });
  };

  const handleConfirmLeave = () => {
    if (!selectedConversationId || leaveConvMut.isPending) return;
    leaveConvMut.mutate(selectedConversationId, {
      onSuccess: () => {
        setConfirmLeaveOpen(false);
        setRightOpen(false);
        setSelected(null);
      },
    });
  };

  const handleSendFriendRequest = () => {
    if (!otherUserId || sendFriendMut.isPending) return;
    sendFriendMut.mutate({ targetUserId: otherUserId, source: "SEARCH" });
  };

  const handleCancelFriendRequest = () => {
    if (!otherUserId || cancelFriendMut.isPending) return;
    cancelFriendMut.mutate(otherUserId);
  };

  const handleConfirmBlock = () => {
    if (!otherUserId) return;
    if (isBlocked) {
      unblockMut.mutate(otherUserId, { onSuccess: () => setConfirmBlockOpen(false) });
    } else {
      blockMut.mutate({ targetUserId: otherUserId }, { onSuccess: () => setConfirmBlockOpen(false) });
    }
  };

  return {
    conversation,
    meId,
    otherUserId,
    name,
    seed,
    isDirect,
    canUnfriend,
    canCancelRequest,
    canBlock,
    canDelete,
    canLeave,
    isFriend,
    isBlocked,
    hasOutgoingRequest,
    blockBusy,
    isPinned,
    handleTogglePin,
    status,
    statusText,
    statusVariant,
    nicknameOpen,
    setNicknameOpen,
    confirmUnfriendOpen,
    setConfirmUnfriendOpen,
    confirmBlockOpen,
    setConfirmBlockOpen,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    confirmLeaveOpen,
    setConfirmLeaveOpen,
    setRightOpen,
    handleConfirmUnfriend,
    handleConfirmDelete,
    handleConfirmLeave,
    handleConfirmBlock,
    handleSendFriendRequest,
    handleCancelFriendRequest,
    unfriendMut,
    deleteConvMut,
    leaveConvMut,
    sendFriendMut,
    cancelFriendMut,
  };
};

export default useContactInfor;
