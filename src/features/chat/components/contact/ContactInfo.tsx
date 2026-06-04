"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Bell, BellOff, Lock, LogOut, PenIcon, Phone, Pin, PinOff, Search, Settings, Trash2, UserMinus, UserPlus, Users, UserX, Video, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import useContactInfor from "../../hooks/useContactInfor";
import { useChatUIStore } from "../../stores/chat-ui.store";
import { SharedTabs } from "./SharedTabs";
import { Avatar, AvatarStatus } from "../common/Avatar";
import { QuickAction } from "../common/QuickAction";
import { OptionRow } from "../common/OptionRow";
import { NicknameDialog } from "./NicknameDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AlertDeleteFriend } from "./AlertDeleteFriend";
import { AlertDeleteConversation } from "./AlertDeleteConversation";
import { AlertBlock } from "./AlertBlock";
import { AlertLeaveGroup } from "./AlertLeaveGroup";
import { GroupMembersPanel } from "./GroupMembersPanel";
import { GroupSettingsPanel } from "./GroupSettingsPanel";
import { JoinRequestsPanel } from "./JoinRequestsPanel";
import { ToggleRow } from "../common/ToggleRow";

export function ContactInfo() {
  const data = useContactInfor();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [view, setView] = useState<"info" | "members" | "requests" | "settings">("info");
  const isMobile = useIsMobile();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);

  if (!data) return null;

  const {
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
    isBlocked,
    blockBusy,
    isPinned,
    handleTogglePin,
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
  } = data;

  if (!isDirect && view === "settings") {
    return (
      <GroupSettingsPanel
        conversation={conversation}
        onBack={() => setView("info")}
        onClose={handleClose}
      />
    );
  }

  if (!isDirect && view === "members") {
    return (
      <GroupMembersPanel
        conversation={conversation}
        meId={meId}
        onBack={() => setView("info")}
        onClose={handleClose}
        onShowRequests={() => setView("requests")}
      />
    );
  }

  if (!isDirect && view === "requests") {
    return (
      <JoinRequestsPanel
        conversation={conversation}
        onBack={() => setView("members")}
        onClose={handleClose}
      />
    );
  }

  // Trên mobile, nút đóng panel quay về chat thay vì đóng sidebar.
  function handleClose() {
    if (isMobile) {
      setMobilePanel('chat');
    } else {
      setRightOpen(false);
    }
  }

  // Role của mình trong group — dùng để gate entry point Settings.
  const meRole = !isDirect
    ? conversation.members?.find((m) => m.userId === meId)?.role
    : undefined;
  const canManageSettings =
    meRole === 'OWNER' || meRole === 'ADMIN' || meRole === 'MODERATOR';

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClose}
          title="Đóng"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col items-center border-b border-border px-4 pb-4 pt-5">
          <Avatar name={name} seed={seed} size="lg" status={status as AvatarStatus} className="mb-3" />
          <div className="text-[17px] font-bold text-foreground flex items-center gap-2">
            {name}
            <button
              type="button"
              onClick={() => setNicknameOpen(true)}
              className="border border-border p-1 rounded-md hover:bg-secondary transition-colors duration-200"
              aria-label="Đặt tên gợi nhớ"
            >
              <PenIcon className="h-[14px] w-[14px] text-muted-foreground" />
            </button>
          </div>
          <Badge variant={statusVariant} size="sm" className="mt-1.5">
            {statusText}
          </Badge>
        </section>

        <section className="grid grid-cols-4 gap-2 px-3 py-3">
          <QuickAction icon={<Phone className="h-[18px] w-[18px]" />} label="Gọi" />
          <QuickAction icon={<Video className="h-[18px] w-[18px]" />} label="Video" />
          <QuickAction icon={<Search className="h-[18px] w-[18px]" />} label="Tìm" />
          <QuickAction
            icon={muted ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
            label={muted ? "Bỏ tắt" : "Tắt t.báo"}
            active={muted}
            onClick={() => setMuted((m) => !m)}
          />
        </section>

        <section className="px-3 pt-2">
          <SharedTabs conversationId={conversation.id} />
        </section>

        <section className="px-3 pb-4 pt-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tuỳ chọn
          </div>
          <div className="flex flex-col gap-0.5">
            <OptionRow
              icon={isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              label={isPinned ? "Bỏ ghim cuộc trò chuyện" : "Ghim cuộc trò chuyện"}
              onClick={handleTogglePin}
            />
            {isDirect && (
              <ToggleRow
                icon={<Lock className="h-4 w-4" />}
                label="Chế độ bí mật"
                subtitle={
                  conversation.encryptionType === 'E2E'
                    ? 'Đang bật — tin nhắn mã hoá đầu cuối'
                    : 'Mã hoá đầu cuối — không có preview, không tìm kiếm'
                }
                checked={conversation.encryptionType === 'E2E'}
                disabled
                comingSoon
              />
            )}
            {!isDirect && canManageSettings && (
              <OptionRow
                icon={<Settings className="h-4 w-4" />}
                label="Cài đặt nhóm"
                onClick={() => setView("settings")}
              />
            )}
            {isDirect && canUnfriend && (
              <OptionRow icon={<Users className="h-4 w-4" />} label="Tạo nhóm" onClick={() => setCreateGroupOpen(true)} />
            )}
            {!isDirect && (
              <OptionRow icon={<Users className="h-4 w-4" />} label="Thành viên nhóm" onClick={() => setView("members")} />
            )}
            {canUnfriend ? (
              <OptionRow
                icon={<UserMinus className="h-4 w-4" />}
                label="Xóa bạn"
                danger
                onClick={() => setConfirmUnfriendOpen(true)}
              />
            ) : canCancelRequest ? (
              <OptionRow
                icon={<Clock className="h-4 w-4" />}
                label={cancelFriendMut.isPending ? "Đang huỷ lời mời..." : "Huỷ lời mời kết bạn"}
                onClick={handleCancelFriendRequest}
              />
            ) : isDirect && otherUserId ? (
              <OptionRow
                icon={<UserPlus className="h-4 w-4" />}
                label={sendFriendMut.isPending ? "Đang gửi lời mời..." : "Thêm bạn"}
                onClick={handleSendFriendRequest}
              />
            ) : null}
            {canBlock && (
              <OptionRow
                icon={<UserX className="h-4 w-4" />}
                label={isBlocked ? "Bỏ chặn người dùng" : "Chặn người dùng"}
                danger={!isBlocked}
                onClick={() => setConfirmBlockOpen(true)}
              />
            )}

            {canLeave && (
              <OptionRow
                icon={<LogOut className="h-4 w-4" />}
                label="Rời nhóm"
                danger
                onClick={() => setConfirmLeaveOpen(true)}
              />
            )}

            {canDelete && (
              <OptionRow
                icon={<Trash2 className="h-4 w-4" />}
                label="Xoá cuộc trò chuyện"
                danger
                onClick={() => setConfirmDeleteOpen(true)}
              />
            )}
          </div>
        </section>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        preselected={isDirect && otherUserId ? {
          id: otherUserId,
          name,
          avatarUrl: conversation.members?.find((m) => m.userId === otherUserId)?.avatarUrl,
        } : undefined}
      />

      {isDirect && otherUserId && (
        <NicknameDialog
          open={nicknameOpen}
          onOpenChange={setNicknameOpen}
          conversationId={conversation.id}
          userId={otherUserId}
          displayName={name}
          currentNickname={conversation.members?.find((m) => m.userId === otherUserId)?.nickname ?? null}
          avatarUrl={conversation.members?.find((m) => m.userId === otherUserId)?.avatarUrl}
          avatarSeed={seed}
        />
      )}

      <AlertDeleteFriend
        open={confirmUnfriendOpen}
        onOpenChange={setConfirmUnfriendOpen}
        name={name}
        isPending={unfriendMut.isPending}
        onConfirm={handleConfirmUnfriend}
      />

      <AlertDeleteConversation
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        name={name}
        isDirect={isDirect}
        isPending={deleteConvMut.isPending}
        onConfirm={handleConfirmDelete}
      />

      <AlertBlock
        open={confirmBlockOpen}
        onOpenChange={setConfirmBlockOpen}
        name={name}
        isBlocked={isBlocked}
        isBusy={blockBusy}
        onConfirm={handleConfirmBlock}
      />

      <AlertLeaveGroup
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        name={name}
        isPending={leaveConvMut.isPending}
        onConfirm={handleConfirmLeave}
      />
    </aside>
  );
}
