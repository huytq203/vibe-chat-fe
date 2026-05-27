"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/features/auth";
import { useBlockedUsers, useFriends } from "@/features/friends/hooks/use-query";
import { useBlockUser, useUnblockUser, useUnfriend } from "@/features/friends/hooks/use-mutations";
import { useChatUIStore } from "../stores/chat-ui.store";
import { useSelectedConversation } from "./useSelectedConversation";
import { useConversation, usePresence } from "./use-query";
import { useDeleteConversation } from "./use-mutations";
import { getConversationName, getConversationSeed } from "../utils";

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

  const [muted, setMuted] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const deleteConvMut = useDeleteConversation();
  const otherUserId = otherIds[0] ?? null;
  const friendsQuery = useFriends();
  const blockedQuery = useBlockedUsers();
  const unfriendMut = useUnfriend();
  const blockMut = useBlockUser();
  const unblockMut = useUnblockUser();

  const isFriend = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(friendsQuery.data?.items.some((it) => it.user.id === otherUserId));
  }, [friendsQuery.data, otherUserId]);

  const isBlocked = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(blockedQuery.data?.items.some((it) => it.user.id === otherUserId));
  }, [blockedQuery.data, otherUserId]);

  if (!conversation) return null;

  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const isDirect = conversation.type === "DIRECT";
  const canUnfriend = isDirect && isFriend && Boolean(otherUserId);
  const canBlock = isDirect && Boolean(otherUserId);
  const canDelete = isDirect || conversation.ownerId === meId;
  const blockBusy = blockMut.isPending || unblockMut.isPending;

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

  const handleConfirmDelete = () => {
    if (!selectedConversationId) return;
    deleteConvMut.mutate(selectedConversationId, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        setRightOpen(false);
        setSelected(null);
      },
    });
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
    canBlock,
    canDelete,
    isFriend,
    isBlocked,
    blockBusy,
    status,
    statusText,
    statusVariant,
    muted,
    setMuted,
    nicknameOpen,
    setNicknameOpen,
    confirmUnfriendOpen,
    setConfirmUnfriendOpen,
    confirmBlockOpen,
    setConfirmBlockOpen,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    setRightOpen,
    handleConfirmUnfriend,
    handleConfirmDelete,
    handleConfirmBlock,
    unfriendMut,
    deleteConvMut,
  };
};

export default useContactInfor;
