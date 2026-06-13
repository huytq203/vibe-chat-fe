"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Ban, Crown, MoreVertical, Shield, ShieldOff, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import type { Conversation, ConversationMember } from "@/features/chat/types";
import {
  useBanMember,
  useRemoveMember,
  useSetMemberRole,
  useTransferOwnership,
} from "@/features/chat/hooks/use-mutations";
import { useJoinRequests } from "@/features/chat/hooks/use-query";
import { isAdminRole } from "@/features/chat/utils";
import { Avatar } from "@/features/chat/components/common/Avatar";
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
  const removeMut = useRemoveMember();
  const banMut = useBanMember();
  const setRoleMut = useSetMemberRole();
  const transferMut = useTransferOwnership();

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
  const hasMenu = (m: ConversationMember) =>
    canRemove(m) || canGrantDeputy(m) || canRevokeDeputy(m) || canTransfer(m);

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
        <div className="pb-2 border-b ">
          {canManage && (
            <Button
              onClick={() => setAddOpen(true)}
              className="mb-3 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium  ">
              Thêm thành viên
            </Button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onShowRequests}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-muted cursor-pointer border border-border ">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
                <UserCheck className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">Yêu cầu vào nhóm</span>
              {pendingCount > 0 && (
                <Badge variant="danger" size="sm">
                  {pendingCount}
                </Badge>
              )}
            </button>
          )}
        </div>
        <div className="py-2">
          <p className="text-xs font-semibold text-foreground">Tất cả thành viên ({members.length})</p>
        </div>
        {members.map((m) => {
          const label = m.nickname || m.displayName || m.username;
          const roleLabel = ROLE_LABEL[m.role];
          return (
            <div key={m.userId} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted">
              <Avatar name={label} src={m.avatarUrl} seed={m.userId} size="md" status={null} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-semibold text-foreground">{label}</span>
                  {m.userId === meId && <span className="text-[11px] text-muted-foreground">(Bạn)</span>}
                </div>
                {roleLabel && (
                  <Badge variant="secondary" size="sm" className="mt-0.5">
                    {roleLabel}
                  </Badge>
                )}
              </div>
              {hasMenu(m) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
                        title="Tùy chọn"
                        aria-label={`Tùy chọn cho ${label}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    {canGrantDeputy(m) && (
                      <DropdownMenuItem onClick={() => setRole(m, "ADMIN")}>
                        <Shield className="h-4 w-4" />
                        Cấp quyền phó nhóm
                      </DropdownMenuItem>
                    )}
                    {canRevokeDeputy(m) && (
                      <DropdownMenuItem onClick={() => setRole(m, "MEMBER")}>
                        <ShieldOff className="h-4 w-4" />
                        Gỡ quyền phó nhóm
                      </DropdownMenuItem>
                    )}
                    {canTransfer(m) && (
                      <DropdownMenuItem onClick={() => setTransferTarget(m)}>
                        <Crown className="h-4 w-4" />
                        Nhượng quyền trưởng nhóm
                      </DropdownMenuItem>
                    )}
                    {(canGrantDeputy(m) || canRevokeDeputy(m) || canTransfer(m)) && canRemove(m) && (
                      <DropdownMenuSeparator />
                    )}
                    {canRemove(m) && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setRemoveTarget(m)}
                          className="text-danger focus:text-danger">
                          <UserX className="h-4 w-4" />
                          Xoá khỏi nhóm
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setBanTarget(m)}
                          className="text-danger focus:text-danger">
                          <Ban className="h-4 w-4" />
                          Chặn thành viên
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

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
