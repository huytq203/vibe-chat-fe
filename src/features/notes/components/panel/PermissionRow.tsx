'use client';

import { Trash2, UsersRound } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import type {
  EffectivePagePermission,
  PageRole,
  WorkspaceMember,
} from '@/features/notes/types';

export const pageRoleLabels: Record<PageRole, string> = {
  FULL: 'Toàn quyền',
  EDIT: 'Chỉnh sửa',
  COMMENT: 'Bình luận',
  VIEW: 'Chỉ xem',
};

interface PermissionRowProps {
  entry: EffectivePagePermission;
  isRemoving: boolean;
  member?: WorkspaceMember;
  onRemove: (permissionId: string) => void;
}

function subjectName(entry: EffectivePagePermission, member?: WorkspaceMember) {
  if (entry.permission.subjectType === 'WORKSPACE') return 'Mọi thành viên workspace';
  return member?.user?.displayName ?? `Người dùng ${entry.permission.subjectId}`;
}

export function PermissionRow({ entry, isRemoving, member, onRemove }: PermissionRowProps) {
  const name = subjectName(entry, member);
  const isWorkspace = entry.permission.subjectType === 'WORKSPACE';
  return (
    <li className="flex min-w-0 items-center gap-3 py-2.5">
      {isWorkspace ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <UsersRound aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <Avatar size="sm" src={member?.user?.avatarUrl ?? undefined} alt={name} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        {entry.inherited && (
          <span className="block truncate text-xs text-muted-foreground">
            kế thừa từ «{entry.sourcePageTitle}»
          </span>
        )}
      </span>
      <Badge variant="outline" size="sm" className="shrink-0 text-muted-foreground">
        {pageRoleLabels[entry.permission.role]}
      </Badge>
      {!entry.inherited && (
        <Button type="button" variant="ghost" size="icon-sm" isLoading={isRemoving}
          aria-label={`Xoá quyền của ${name}`} onClick={() => onRemove(entry.permission.id)}>
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      )}
    </li>
  );
}
