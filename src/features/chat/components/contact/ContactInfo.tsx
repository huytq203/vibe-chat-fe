"use client";

import { useState } from "react";
import { Bell, BellOff, PenIcon, Phone, Pin, Search, Trash2, UserMinus, Users, UserX, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs";
import useContactInfor from "../../hooks/useContactInfor";
import { Avatar, AvatarStatus } from "../common/Avatar";
import { QuickAction } from "../common/QuickAction";
import { OptionRow } from "../common/OptionRow";
import { NicknameDialog } from "./NicknameDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AlertDeleteFriend } from "./AlertDeleteFriend";
import { AlertDeleteConversation } from "./AlertDeleteConversation";
import { AlertBlock } from "./AlertBlock";

export function ContactInfo() {
  const data = useContactInfor();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  if (!data) return null;

  const {
    conversation,
    meId,
    otherUserId,
    name,
    seed,
    isDirect,
    canUnfriend,
    canBlock,
    canDelete,
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
  } = data;
  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRightOpen(false)}
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

        <section className="flex items-center gap-2 px-3 py-3">
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
          <Tabs defaultValue="media">
            <TabsList size="xs" className="w-full">
              <TabsTrigger value="media" className="flex-1">Ảnh & Video</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Tài liệu</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">Liên kết</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có ảnh hoặc video được chia sẻ
            </TabsContent>
            <TabsContent value="files" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có tệp được chia sẻ
            </TabsContent>
            <TabsContent value="links" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có liên kết được chia sẻ
            </TabsContent>
          </Tabs>
        </section>

        <section className="px-3 pb-4 pt-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tuỳ chọn
          </div>
          <div className="flex flex-col gap-0.5">
            <OptionRow icon={<Pin className="h-4 w-4" />} label="Ghim cuộc trò chuyện" />
            {isDirect && (
              <OptionRow icon={<Users className="h-4 w-4" />} label="Tạo nhóm" onClick={() => setCreateGroupOpen(true)} />
            )}
            {!isDirect && (
              <OptionRow icon={<Users className="h-4 w-4" />} label="Thành viên nhóm" onClick={() => {}} />
            )}
            {canBlock && (
              <OptionRow
                icon={<UserX className="h-4 w-4" />}
                label={isBlocked ? "Bỏ chặn người dùng" : "Chặn người dùng"}
                danger={!isBlocked}
                onClick={() => setConfirmBlockOpen(true)}
              />
            )}
            {canUnfriend && (
              <OptionRow
                icon={<UserMinus className="h-4 w-4" />}
                label="Xóa bạn"
                danger
                onClick={() => setConfirmUnfriendOpen(true)}
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
    </aside>
  );
}
