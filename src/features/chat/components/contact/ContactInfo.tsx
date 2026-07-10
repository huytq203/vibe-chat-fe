"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Phone, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import useContactInfor from "@/features/chat/hooks/useContactInfor";
import { useConvLockStore } from "@/features/chat/stores/conv-lock.store";
import { useLockConversation, useRemoveLock } from "@/features/chat/hooks/use-mutations";
import { useChatUIStore } from "@/features/chat/stores/chat-ui.store";
import { useSettingsStore } from "@/features/settings";
import { buildCallDirectory, useStartCall } from "@/features/call";
import { canEditGroupInfo, getConversationAvatar } from "@/features/chat/utils";
import { SharedTabs } from "./SharedTabs";
import { Separator } from "@/components/ui/separator/Separator";
import { ContactProfileSection } from "./ContactProfileSection";
import { ContactQuickActions } from "./ContactQuickActions";
import { ContactOptionsSection } from "./ContactOptionsSection";
import { ContactInfoDialogs } from "./ContactInfoDialogs";
import { renderContactSubPanel, type ContactView } from "./ContactPanelRouter";

export function ContactInfo() {
  const data = useContactInfor();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [view, setView] = useState<ContactView>("info");
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

  const { conversation, meId, otherUserId, name, isDirect, setRightOpen } = data;

  const isLocked = Boolean(conversation.isLocked);
  // Nội dung bị khoá: hội thoại đang khoá VÀ chưa mở khoá trong phiên này.
  // Dùng để ẩn ảnh/tài liệu/liên kết + tìm kiếm tin nhắn cho tới khi mở khoá (giống ChatPanel).
  const isContentLocked = isLocked && !unlockedIds.has(conversation.id);
  const lockDialogMode: "lock" | "unlock" = isLocked ? "unlock" : "lock";
  // DIRECT → avatar người kia; GROUP → avatar nhóm (giống ConversationList/ChatHeader).
  const avatarUrl = getConversationAvatar(conversation, meId);

  // Trên mobile, nút đóng panel quay về chat thay vì đóng sidebar.
  function handleClose() {
    if (isMobile) {
      setMobilePanel("chat");
    } else {
      setRightOpen(false);
    }
  }

  // Hội thoại đang khoá & chưa mở trong phiên → chặn toàn bộ panel, chỉ cho nhập mật khẩu.
  if (isContentLocked) {
    return (
      <aside className="flex h-full w-full shrink-0 flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-subtle md:w-[300px] md:min-w-[260px]">
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

  // Điều hướng sang panel con (settings/members/…); null = ở "info", render nội dung chính.
  const subPanel = renderContactSubPanel({
    view,
    conversation,
    meId,
    isDirect,
    onView: setView,
    onClose: handleClose,
  });
  if (subPanel) return subPanel;

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
    <aside className="flex border h-full w-full shrink-0 flex-col rounded-2xl bg-sidebar/75 backdrop-blur-md text-sidebar-foreground shadow-subtle md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button variant="ghost" size="icon-sm" onClick={handleClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto mt-3">
        <ContactProfileSection
          data={data}
          avatarUrl={avatarUrl}
          isGroup={isGroup}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenNickname={() => data.setNicknameOpen(true)}
        />
        <ContactQuickActions
          data={data}
          onCreateGroup={() => setCreateGroupOpen(true)}
          onSearch={() => setView("search")}
        />
        <Separator className="h-px" />

        <section className="px-3 pt-2">
          <SharedTabs conversationId={conversation.id} />
        </section>

        <ContactOptionsSection
          data={data}
          canOpenSettings={canOpenSettings}
          canShareGroup={canShareGroup}
          onWallpaper={() => setWallpaperOpen(true)}
          onShareGroup={() => setShareGroupOpen(true)}
          onSettings={() => setView("settings")}
          onMembers={() => setView("members")}
          onCreateGroup={() => setCreateGroupOpen(true)}
          onConvSettings={() => setConvSettingsOpen(true)}
        />
      </div>

      <ContactInfoDialogs
        data={data}
        createGroupOpen={createGroupOpen}
        onCreateGroupOpenChange={setCreateGroupOpen}
        shareGroupOpen={shareGroupOpen}
        onShareGroupOpenChange={setShareGroupOpen}
        convSettingsOpen={convSettingsOpen}
        onConvSettingsOpenChange={setConvSettingsOpen}
        wallpaperOpen={wallpaperOpen}
        onWallpaperOpenChange={setWallpaperOpen}
        profileOpen={profileOpen}
        onProfileOpenChange={setProfileOpen}
        lockDialogOpen={lockDialogOpen}
        onLockDialogOpenChange={setLockDialogOpen}
        lockDialogMode={lockDialogMode}
        isLocked={isLocked}
        onLockToggle={handleLockToggle}
        onLockConfirm={handleLockConfirm}
      />
    </aside>
  );
}
