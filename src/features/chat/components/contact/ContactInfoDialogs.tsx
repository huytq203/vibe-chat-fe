"use client";

import { GroupShareDialog } from "@/features/share-links";
import { NicknameDialog } from "./NicknameDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AlertDeleteFriend } from "./AlertDeleteFriend";
import { AlertDeleteConversation } from "./AlertDeleteConversation";
import { AlertBlock } from "./AlertBlock";
import { AlertLeaveGroup } from "./AlertLeaveGroup";
import { LockPasswordDialog } from "./PinDialog";
import { UserProfileDialog } from "./UserProfileDialog";
import { ConversationSettingsDialog } from "./ConversationSettingsDialog";
import { WallpaperPickerDialog } from "./WallpaperPickerDialog";
import type { ContactInfoData } from "@/features/chat/hooks/useContactInfor";

type ContactInfoDialogsProps = {
  data: ContactInfoData;
  createGroupOpen: boolean;
  onCreateGroupOpenChange: (open: boolean) => void;
  shareGroupOpen: boolean;
  onShareGroupOpenChange: (open: boolean) => void;
  convSettingsOpen: boolean;
  onConvSettingsOpenChange: (open: boolean) => void;
  wallpaperOpen: boolean;
  onWallpaperOpenChange: (open: boolean) => void;
  profileOpen: boolean;
  onProfileOpenChange: (open: boolean) => void;
  lockDialogOpen: boolean;
  onLockDialogOpenChange: (open: boolean) => void;
  lockDialogMode: "lock" | "unlock";
  isLocked: boolean;
  onLockToggle: () => void;
  onLockConfirm: (password: string) => void;
};

export function ContactInfoDialogs({
  data,
  createGroupOpen,
  onCreateGroupOpenChange,
  shareGroupOpen,
  onShareGroupOpenChange,
  convSettingsOpen,
  onConvSettingsOpenChange,
  wallpaperOpen,
  onWallpaperOpenChange,
  profileOpen,
  onProfileOpenChange,
  lockDialogOpen,
  onLockDialogOpenChange,
  lockDialogMode,
  isLocked,
  onLockToggle,
  onLockConfirm,
}: ContactInfoDialogsProps) {
  const {
    conversation,
    otherUserId,
    name,
    isDirect,
    canDelete,
    isBlocked,
    blockBusy,
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
    handleConfirmUnfriend,
    handleConfirmDelete,
    handleConfirmLeave,
    handleConfirmBlock,
    unfriendMut,
    deleteConvMut,
    leaveConvMut,
  } = data;

  return (
    <>
      {!isDirect && (
        <GroupShareDialog
          open={shareGroupOpen}
          onOpenChange={onShareGroupOpenChange}
          conversationId={conversation.id}
          groupName={conversation.name}
        />
      )}

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={onCreateGroupOpenChange}
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
        onOpenChange={onLockDialogOpenChange}
        mode={lockDialogMode}
        onConfirm={onLockConfirm}
      />

      {isDirect && otherUserId && (
        <UserProfileDialog open={profileOpen} onOpenChange={onProfileOpenChange} userId={otherUserId} />
      )}

      <ConversationSettingsDialog
        open={convSettingsOpen}
        onOpenChange={onConvSettingsOpenChange}
        isLocked={isLocked}
        isDirect={isDirect}
        canDelete={canDelete}
        onLockToggle={onLockToggle}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      <WallpaperPickerDialog
        open={wallpaperOpen}
        onOpenChange={onWallpaperOpenChange}
        conversationId={conversation.id}
      />
    </>
  );
}
