"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import type { Conversation, ConversationMember } from "@/features/chat/types";
import {
  useBanMember,
  useRemoveMember,
  useSetMemberRole,
  useTransferOwnership,
} from "@/features/chat/hooks/use-mutations";
import { useJoinRequests } from "@/features/chat/hooks/use-query";
import { useMemberFriendship } from "@/features/chat/hooks/useMemberFriendship";
import { isAdminRole } from "@/features/chat/utils";
import { GroupManageActions } from "./GroupManageActions";
import { GroupMemberRow } from "./GroupMemberRow";
import { UserProfileDialog } from "./UserProfileDialog";
import { AddMembersDialog } from "./AddMembersDialog";
import { AlertRemoveMember } from "./AlertRemoveMember";
import { AlertBanMember } from "./AlertBanMember";
import { AlertTransferOwner } from "./AlertTransferOwner";

type GroupMembersPanelProps = {
  conversation: Conversation;
  meId: string | null;
  onBack: () => void;
  onClose: () => void;
  onShowRequests: () => void;
};

// Thứ hạng quyền: số nhỏ = quyền cao hơn (OWNER > ADMIN > MODERATOR > MEMBER).
const ROLE_ORDER: Record<ConversationMember["role"], number> = {
  OWNER: 0,
  ADMIN: 1,
  MODERATOR: 2,
  MEMBER: 3,
};
// Chỉ 2 cấp quyền hiển thị: Trưởng nhóm (OWNER) và Phó nhóm (ADMIN/MODERATOR).
const ROLE_LABEL: Record<ConversationMember["role"], string> = {
  OWNER: "Trưởng nhóm",
  ADMIN: "Phó nhóm",
  MODERATOR: "Phó nhóm",
  MEMBER: "",
};

export function GroupMembersPanel({ conversation, meId, onBack, onClose, onShowRequests }: GroupMembersPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ConversationMember | null>(null);
  const [banTarget, setBanTarget] = useState<ConversationMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<ConversationMember | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const removeMut = useRemoveMember();
  const banMut = useBanMember();
  const setRoleMut = useSetMemberRole();
  const transferMut = useTransferOwnership();
  const { getState, sendFriend, cancelFriend, isSending, isCancelling } = useMemberFriendship();

  const members = useMemo(
    () => (conversation.members ?? []).slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [conversation.members],
  );
  const myRole = members.find((m) => m.userId === meId)?.role ?? "MEMBER";
  const canManage = myRole !== "MEMBER";
  // Chỉ fetch danh sách yêu cầu khi user có quyền duyệt (badge số lượng).
  const { data: joinRequests = [] } = useJoinRequests(conversation.id, canManage);
  const pendingCount = joinRequests.length;
  // Chỉ kick được người có vai trò THẤP hơn mình (không kick OWNER, không tự kick).
  const canRemove = (m: ConversationMember) =>
    canManage && m.userId !== meId && ROLE_ORDER[myRole] < ROLE_ORDER[m.role];

  // Phân quyền (cấp/gỡ phó nhóm, nhượng trưởng nhóm): chỉ OWNER thao tác (xem 28).
  const isOwner = myRole === "OWNER";
  const canGrantDeputy = (m: ConversationMember) => isOwner && m.userId !== meId && m.role === "MEMBER";
  const canRevokeDeputy = (m: ConversationMember) => isOwner && isAdminRole(m.role) && m.role !== "OWNER";
  const canTransfer = (m: ConversationMember) => isOwner && m.userId !== meId && m.role !== "OWNER";
  const setRole = (m: ConversationMember, role: "ADMIN" | "MEMBER") =>
    setRoleMut.mutate({ conversationId: conversation.id, userId: m.userId, role });

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    removeMut.mutate(
      { conversationId: conversation.id, userId: removeTarget.userId },
      { onSuccess: () => setRemoveTarget(null) },
    );
  };

  const handleConfirmBan = () => {
    if (!banTarget) return;
    banMut.mutate(
      { conversationId: conversation.id, userId: banTarget.userId },
      { onSuccess: () => setBanTarget(null) },
    );
  };

  const handleConfirmTransfer = () => {
    if (!transferTarget) return;
    transferMut.mutate(
      { conversationId: conversation.id, userId: transferTarget.userId },
      { onSuccess: () => setTransferTarget(null) },
    );
  };

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Thành viên ({conversation.memberCount})</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2 ">
        {canManage && (
          <GroupManageActions
            pendingCount={pendingCount}
            onAddMember={() => setAddOpen(true)}
            onShowRequests={onShowRequests}
          />
        )}
        <div className="py-2">
          <p className="text-xs font-semibold text-foreground">Tất cả thành viên ({members.length})</p>
        </div>
        {members.map((m) => (
          <GroupMemberRow
            key={m.userId}
            member={m}
            label={m.nickname || m.displayName || m.username}
            roleLabel={ROLE_LABEL[m.role]}
            isMe={m.userId === meId}
            friendState={getState(m.userId)}
            isSending={isSending(m.userId)}
            isCancelling={isCancelling(m.userId)}
            menu={{
              canGrantDeputy: canGrantDeputy(m),
              canRevokeDeputy: canRevokeDeputy(m),
              canTransfer: canTransfer(m),
              canRemove: canRemove(m),
            }}
            onViewProfile={() => setProfileUserId(m.userId)}
            onAddFriend={() => sendFriend(m.userId)}
            onCancelFriend={() => cancelFriend(m.userId)}
            onGrantDeputy={() => setRole(m, "ADMIN")}
            onRevokeDeputy={() => setRole(m, "MEMBER")}
            onTransfer={() => setTransferTarget(m)}
            onRemove={() => setRemoveTarget(m)}
            onBan={() => setBanTarget(m)}
          />
        ))}

        {members.length === 0 && (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">Chưa tải được danh sách thành viên</p>
        )}
      </div>

      {addOpen && (
        <AddMembersDialog
          open
          onOpenChange={setAddOpen}
          conversationId={conversation.id}
          existingMemberIds={conversation.memberIds}
        />
      )}

      <UserProfileDialog
        open={Boolean(profileUserId)}
        onOpenChange={(o) => !o && setProfileUserId(null)}
        userId={profileUserId}
      />

      <AlertRemoveMember
        open={Boolean(removeTarget)}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        name={removeTarget?.nickname || removeTarget?.displayName || removeTarget?.username || ""}
        isPending={removeMut.isPending}
        onConfirm={handleConfirmRemove}
      />

      <AlertBanMember
        open={Boolean(banTarget)}
        onOpenChange={(o) => !o && setBanTarget(null)}
        name={banTarget?.nickname || banTarget?.displayName || banTarget?.username || ""}
        isPending={banMut.isPending}
        onConfirm={handleConfirmBan}
      />

      <AlertTransferOwner
        open={Boolean(transferTarget)}
        onOpenChange={(o) => !o && setTransferTarget(null)}
        name={transferTarget?.nickname || transferTarget?.displayName || transferTarget?.username || ""}
        isPending={transferMut.isPending}
        onConfirm={handleConfirmTransfer}
      />
    </aside>
  );
}
