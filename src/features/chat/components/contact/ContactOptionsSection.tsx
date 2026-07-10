"use client";

import {
  Clock,
  Link2,
  LogOut,
  Palette,
  Pin,
  PinOff,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { OptionRow } from "@/features/chat/components/common/OptionRow";
import type { ContactInfoData } from "@/features/chat/hooks/useContactInfor";

type ContactOptionsSectionProps = {
  data: ContactInfoData;
  canOpenSettings: boolean;
  canShareGroup: boolean;
  onWallpaper: () => void;
  onShareGroup: () => void;
  onSettings: () => void;
  onMembers: () => void;
  onCreateGroup: () => void;
  onConvSettings: () => void;
};

export function ContactOptionsSection({
  data,
  canOpenSettings,
  canShareGroup,
  onWallpaper,
  onShareGroup,
  onSettings,
  onMembers,
  onCreateGroup,
  onConvSettings,
}: ContactOptionsSectionProps) {
  const {
    isDirect,
    isPinned,
    handleTogglePin,
    canUnfriend,
    canCancelRequest,
    otherUserId,
    canBlock,
    isBlocked,
    canLeave,
    canDelete,
    cancelFriendMut,
    sendFriendMut,
    handleCancelFriendRequest,
    handleSendFriendRequest,
    setConfirmUnfriendOpen,
    setConfirmBlockOpen,
    setConfirmLeaveOpen,
    setConfirmDeleteOpen,
  } = data;

  return (
    <section className="px-3 pb-4 pt-2">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground">Tuỳ chọn</div>
      <div className="flex flex-col gap-0.5">
        <OptionRow
          icon={<Palette className="h-4 w-4" />}
          label="Đổi chủ đề & hình nền"
          onClick={onWallpaper}
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
            onClick={onShareGroup}
          />
        )}
        {canOpenSettings && (
          <OptionRow
            icon={<Settings className="h-4 w-4" />}
            label="Cài đặt nhóm"
            onClick={onSettings}
          />
        )}
        {isDirect && canUnfriend && (
          <OptionRow
            icon={<Users className="h-4 w-4" />}
            label="Tạo nhóm"
            onClick={onCreateGroup}
          />
        )}
        {!isDirect && (
          <OptionRow
            icon={<Users className="h-4 w-4" />}
            label="Thành viên nhóm"
            onClick={onMembers}
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
            onClick={onConvSettings}
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
      </div>
    </section>
  );
}
