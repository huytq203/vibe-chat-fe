"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  Clock,
  Link2,
  LogOut,
  Palette,
  PenIcon,
  Phone,
  Pin,
  PinOff,
  Search,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import useContactInfor from "@/features/chat/hooks/useContactInfor";
import { useConvLockStore } from "@/features/chat/stores/conv-lock.store";
import { useLockConversation, useRemoveLock } from "@/features/chat/hooks/use-mutations";
import { useChatUIStore } from "@/features/chat/stores/chat-ui.store";
import { useSettingsStore } from "@/features/settings";
import { buildCallDirectory, useStartCall } from "@/features/call";
import { canEditGroupInfo, getConversationAvatar } from "@/features/chat/utils";
import { SharedTabs } from "./SharedTabs";
import { Avatar, AvatarStatus } from "@/features/chat/components/common/Avatar";
import { QuickAction } from "@/features/chat/components/common/QuickAction";
import { OptionRow } from "@/features/chat/components/common/OptionRow";
import { NicknameDialog } from "./NicknameDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AlertDeleteFriend } from "./AlertDeleteFriend";
import { AlertDeleteConversation } from "./AlertDeleteConversation";
import { AlertBlock } from "./AlertBlock";
import { AlertLeaveGroup } from "./AlertLeaveGroup";
import { LockPasswordDialog } from "./PinDialog";
import { GroupMembersPanel } from "./GroupMembersPanel";
import { GroupSettingsPanel } from "./GroupSettingsPanel";
import { BannedMembersPanel } from "./BannedMembersPanel";
import { AdminsPanel } from "./AdminsPanel";
import { JoinRequestsPanel } from "./JoinRequestsPanel";
import { MessageSearchPanel } from "./MessageSearchPanel";
import { PinnedMessagesPanel } from "./PinnedMessagesPanel";
import { MuteButton } from "./MuteButton";
import { UserProfileDialog } from "./UserProfileDialog";
import { GroupShareDialog } from "@/features/share-links";
import { ConversationSettingsDialog } from "./ConversationSettingsDialog";
import { WallpaperPickerDialog } from "./WallpaperPickerDialog";
import { Separator } from "@/components/ui/separator/Separator";

export function ContactInfo() {
  const data = useContactInfor();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [view, setView] = useState<"info" | "members" | "requests" | "settings" | "banned" | "admins" | "search" | "pinned">("info");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [shareGroupOpen, setShareGroupOpen] = useState(false);
  const [convSettingsOpen, setConvSettingsOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isMobile = useIsMobile();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const convLockStore = useConvLockStore();
  // Subscribe vào unlockedIds (state) để khi markUnlocked() chạy thì re-render mở nội dung ngay.
  const unlockedIds = useConvLockStore((s) => s.unlockedIds);
  const lockMut = useLockConversation();
  const removeLockMut = useRemoveLock();
  const lockPin = useSettingsStore((s) => s.lockPin);
  const { start: startCall, busy: callBusy } = useStartCall();

  if (!data) return null;

  const {
    conversation,
    meId,
    otherUserId,
    name,
    description,
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

  const isLocked = Boolean(conversation.isLocked);
  // Nội dung bị khoá: hội thoại đang khoá VÀ chưa mở khoá trong phiên này.
  // Dùng để ẩn ảnh/tài liệu/liên kết + tìm kiếm tin nhắn cho tới khi mở khoá (giống ChatPanel).
  const isContentLocked = isLocked && !unlockedIds.has(conversation.id);
  const lockDialogMode: "lock" | "unlock" = isLocked ? "unlock" : "lock";
  // DIRECT → avatar người kia; GROUP → avatar nhóm (giống ConversationList/ChatHeader).
  const avatarUrl = getConversationAvatar(conversation, meId);

  // Hội thoại đang khoá & chưa mở trong phiên → chặn toàn bộ panel, chỉ cho nhập mật khẩu.
  if (isContentLocked) {
    return (
      <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
          <span className="text-sm font-bold">Thông tin</span>
          <Button variant="ghost" size="icon-sm" onClick={handleClose} title="Đóng" aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1" />
      </aside>
    );
  }

  // Gọi audio/video — DIRECT và GROUP, chặn CHANNEL (giống ChatHeader).
  const isGroup = conversation.type === "GROUP";
  const canCall = (isDirect && Boolean(otherUserId)) || isGroup;
  function handleCall(type: "AUDIO" | "VIDEO") {
    if (isDirect) {
      if (!otherUserId) return;
      void startCall(conversation.id, type, { id: otherUserId, name, avatarUrl });
      return;
    }
    void startCall(
      conversation.id,
      type,
      { id: conversation.id, name, avatarUrl },
      true,
      buildCallDirectory(conversation),
    );
  }

  function lockWith(password: string) {
    lockMut.mutate(
      { conversationId: conversation.id, password },
      { onSuccess: () => convLockStore.markUnlocked(conversation.id) },
    );
  }

  // Bật khoá: nếu đã có PIN mặc định → khoá thẳng (không hỏi mật khẩu). Chưa có,
  // hoặc đang tắt khoá (cần xác nhận mật khẩu) → mở dialog.
  function handleLockToggle() {
    if (!isLocked && lockPin) {
      lockWith(lockPin);
      return;
    }
    setLockDialogOpen(true);
  }

  function handleLockConfirm(password: string) {
    if (isLocked) {
      removeLockMut.mutate({ conversationId: conversation.id, password });
    } else {
      lockWith(password);
    }
  }

  if (!isDirect && view === "settings") {
    return (
      <GroupSettingsPanel
        conversation={conversation}
        meId={meId}
        onBack={() => setView("info")}
        onClose={handleClose}
        onManageBanned={() => setView("banned")}
        onManageAdmins={() => setView("admins")}
      />
    );
  }

  if (!isDirect && view === "banned") {
    return (
      <BannedMembersPanel
        conversationId={conversation.id}
        onBack={() => setView("settings")}
        onClose={handleClose}
      />
    );
  }

  if (!isDirect && view === "admins") {
    return (
      <AdminsPanel
        conversation={conversation}
        meId={meId}
        onBack={() => setView("settings")}
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
    return <JoinRequestsPanel conversation={conversation} onBack={() => setView("members")} onClose={handleClose} />;
  }

  if (view === "search") {
    return <MessageSearchPanel conversation={conversation} onBack={() => setView("info")} onClose={handleClose} />;
  }

  if (view === "pinned") {
    return <PinnedMessagesPanel conversation={conversation} meId={meId} onBack={() => setView("info")} onClose={handleClose} />;
  }

  // Trên mobile, nút đóng panel quay về chat thay vì đóng sidebar.
  function handleClose() {
    if (isMobile) {
      setMobilePanel("chat");
    } else {
      setRightOpen(false);
    }
  }

  // Role của mình trong group — dùng để gate entry point Settings.
  const meRole = !isDirect ? conversation.members?.find((m) => m.userId === meId)?.role : undefined;
  const canManageSettings = meRole === "OWNER" || meRole === "ADMIN" || meRole === "MODERATOR";
  // MEMBER cũng vào được Cài đặt nhóm khi whoCanEditInfo=ALL (chỉ để sửa tên/mô tả/ảnh).
  const canOpenSettings =
    !isDirect && (canManageSettings || canEditGroupInfo(conversation, meId));
  // Mời qua link: chỉ OWNER/ADMIN/MODERATOR + nhóm đang bật joinByLink (xem 25/28).
  const canShareGroup =
    !isDirect && canManageSettings && conversation.settings?.joinByLink !== false;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button variant="ghost" size="icon-sm" onClick={handleClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto mt-3">
        <section className="flex flex-col items-center">
          {isDirect && otherUserId ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Xem trang cá nhân"
              title="Xem trang cá nhân"
              className="mb-3 rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary">
              <Avatar name={name} src={avatarUrl} size="lg" status={status as AvatarStatus} />
            </button>
          ) : (
            <Avatar
              name={name}
              src={avatarUrl}
              type={isGroup ? 'group' : 'user'}
              size="lg"
              status={status as AvatarStatus}
              className=""
            />
          )}
            <Badge variant={statusVariant} size="sm" >
            {statusText}
          </Badge>
          <div className="text-[17px] text-foreground flex items-center gap-2">
            <div className="flex items-center gap-2 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold">{name}</span>
                {/* Nút đặt biệt danh chỉ cho DIRECT — group đổi tên trong Cài đặt nhóm. */}
                {isDirect && otherUserId && (
                  <button
                    type="button"
                    onClick={() => setNicknameOpen(true)}
                    className="border border-border p-1 rounded-md hover:bg-secondary transition-colors duration-200"
                    aria-label="Đặt tên gợi nhớ">
                    <PenIcon className="h-[14px] w-[14px] text-muted-foreground" />
                  </button>
                )}
              </div>
              {description && <div className="text-sm text-muted-foreground">{description}</div>}
            </div>
          </div>
        
        </section>
        <section className="flex justify-center items-center">
          {isDirect && (
            <QuickAction icon={<Users className="h-[18px] w-[18px]" />} label="Tạo nhóm" onClick={() => setCreateGroupOpen(true)} />
          )}
          {!isDirect && (
            <QuickAction icon={isPinned ? <PinOff className="h-[18px] w-[18px]" /> : <Pin className="h-[18px] w-[18px]" />} label={isPinned ? "Bỏ ghim" : "Ghim"} onClick={handleTogglePin} />
          )}
          <QuickAction icon={<Search className="h-[18px] w-[18px]" />} label="Tìm" onClick={() => setView("search")} />
          <MuteButton conversation={conversation} />
        </section>
        <Separator className="h-px" />

        <section className="px-3 pt-2">
          <SharedTabs conversationId={conversation.id} />
        </section>

        <section className="px-3 pb-4 pt-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tuỳ chọn</div>
          <div className="flex flex-col gap-0.5">
            <OptionRow
              icon={<Palette className="h-4 w-4" />}
              label="Đổi chủ đề & hình nền"
              onClick={() => setWallpaperOpen(true)}
            />
           
            <OptionRow
              icon={isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              label={isPinned ? "Bỏ ghim cuộc trò chuyện" : "Ghim cuộc trò chuyện"}
              onClick={handleTogglePin}
            />
            {canShareGroup && (
              <OptionRow
                icon={<Link2 className="h-4 w-4" />}
                label="Mời vào nhóm bằng link"
                onClick={() => setShareGroupOpen(true)}
              />
            )}
            {canOpenSettings && (
              <OptionRow
                icon={<Settings className="h-4 w-4" />}
                label="Cài đặt nhóm"
                onClick={() => setView("settings")}
              />
            )}
            {isDirect && (
              <OptionRow
                icon={<Users className="h-4 w-4" />}
                label="Tạo nhóm"
                onClick={() => setCreateGroupOpen(true)}
              />
            )}
            {!isDirect && (
              <OptionRow
                icon={<Users className="h-4 w-4" />}
                label="Thành viên nhóm"
                onClick={() => setView("members")}
              />
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
            {isDirect ? (
              <OptionRow
                icon={<Settings className="h-4 w-4" />}
                label="Cài đặt cuộc trò chuyện"
                onClick={() => setConvSettingsOpen(true)}
              />
            ) : canDelete ? (
              // Nhóm: dialog cài đặt chỉ có mỗi "Xoá" (khoá là direct-only) → mở thẳng alert.
              <OptionRow
                icon={<Trash2 className="h-4 w-4" />}
                label="Xoá cuộc trò chuyện"
                danger
                onClick={() => setConfirmDeleteOpen(true)}
              />
            ) : null}
          </div>
        </section>
      </div>

      {!isDirect && (
        <GroupShareDialog
          open={shareGroupOpen}
          onOpenChange={setShareGroupOpen}
          conversationId={conversation.id}
          groupName={conversation.name}
        />
      )}

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        preselected={
          isDirect && otherUserId
            ? {
                id: otherUserId,
                name,
                avatarUrl: conversation.members?.find((m) => m.userId === otherUserId)?.avatarUrl,
              }
            : undefined
        }
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

      <LockPasswordDialog
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        mode={lockDialogMode}
        onConfirm={handleLockConfirm}
      />

      {isDirect && otherUserId && (
        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} userId={otherUserId} />
      )}

      <ConversationSettingsDialog
        open={convSettingsOpen}
        onOpenChange={setConvSettingsOpen}
        isLocked={isLocked}
        isDirect={isDirect}
        canDelete={canDelete}
        onLockToggle={handleLockToggle}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      <WallpaperPickerDialog
        open={wallpaperOpen}
        onOpenChange={setWallpaperOpen}
        conversationId={conversation.id}
      />
    </aside>
  );
}
