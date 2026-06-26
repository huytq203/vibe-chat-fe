"use client";

import { Ban, Crown, MoreVertical, Shield, ShieldOff, UserX } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { Avatar } from "@/features/chat/components/common/Avatar";
import type { ConversationMember } from "@/features/chat/types";
import type { MemberFriendState } from "@/features/chat/hooks/useMemberFriendship";
import { MemberFriendButton } from "./MemberFriendButton";

export type MemberMenuFlags = {
  canGrantDeputy: boolean;
  canRevokeDeputy: boolean;
  canTransfer: boolean;
  canRemove: boolean;
};

type GroupMemberRowProps = {
  member: ConversationMember;
  label: string;
  roleLabel: string;
  isMe: boolean;
  friendState: MemberFriendState;
  isSending: boolean;
  isCancelling: boolean;
  menu: MemberMenuFlags;
  onViewProfile: () => void;
  onAddFriend: () => void;
  onCancelFriend: () => void;
  onGrantDeputy: () => void;
  onRevokeDeputy: () => void;
  onTransfer: () => void;
  onRemove: () => void;
  onBan: () => void;
};

export function GroupMemberRow(props: GroupMemberRowProps) {
  const { member: m, label, roleLabel, isMe, menu } = props;
  const hasMenu = menu.canGrantDeputy || menu.canRevokeDeputy || menu.canTransfer || menu.canRemove;

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted">
      <button
        type="button"
        onClick={props.onViewProfile}
        disabled={isMe}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
        aria-label={`Xem thông tin ${label}`}>
        <Avatar name={label} src={m.avatarUrl} size="md" status={null} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold text-foreground">{label}</span>
            {isMe && <span className="text-[11px] text-muted-foreground">(Bạn)</span>}
          </div>
          {roleLabel && (
            <Badge variant="secondary" size="sm" className="mt-0.5">
              {roleLabel}
            </Badge>
          )}
        </div>
      </button>

      {!isMe && (
        <MemberFriendButton
          state={props.friendState}
          name={label}
          isSending={props.isSending}
          isCancelling={props.isCancelling}
          onAdd={props.onAddFriend}
          onCancel={props.onCancelFriend}
        />
      )}

      {hasMenu && (
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
            {menu.canGrantDeputy && (
              <DropdownMenuItem onClick={props.onGrantDeputy}>
                <Shield className="h-4 w-4" />
                Cấp quyền phó nhóm
              </DropdownMenuItem>
            )}
            {menu.canRevokeDeputy && (
              <DropdownMenuItem onClick={props.onRevokeDeputy}>
                <ShieldOff className="h-4 w-4" />
                Gỡ quyền phó nhóm
              </DropdownMenuItem>
            )}
            {menu.canTransfer && (
              <DropdownMenuItem onClick={props.onTransfer}>
                <Crown className="h-4 w-4" />
                Nhượng quyền trưởng nhóm
              </DropdownMenuItem>
            )}
            {(menu.canGrantDeputy || menu.canRevokeDeputy || menu.canTransfer) && menu.canRemove && (
              <DropdownMenuSeparator />
            )}
            {menu.canRemove && (
              <>
                <DropdownMenuItem onClick={props.onRemove} className="text-danger focus:text-danger">
                  <UserX className="h-4 w-4" />
                  Xoá khỏi nhóm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={props.onBan} className="text-danger focus:text-danger">
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
}
