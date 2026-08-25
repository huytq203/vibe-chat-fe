'use client';

import { UsersRound } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Badge } from '@/components/ui/badge/Badge';
import { pageRoleLabels } from '@/features/notes/lib/page-role';
import type { EffectivePagePermission, PageRole } from '@/features/notes/types';
import { RoleMenu } from './RoleMenu';

interface PermissionRowProps {
  avatarUrl?: string | null;
  entry: EffectivePagePermission;
  /** Đang đổi vai trò hoặc đang gỡ quyền của chính hàng này. */
  isPending: boolean;
  name: string;
  onChangeRole: (role: PageRole) => void;
  onRemove: () => void;
  /** Dòng phụ dưới tên — @username của người dùng. */
  username?: string;
}

export function PermissionRow({
  avatarUrl, entry, isPending, name, onChangeRole, onRemove, username,
}: PermissionRowProps) {
  const isWorkspace = entry.permission.subjectType === 'WORKSPACE';
  const subtitle = entry.inherited
    ? `Kế thừa từ «${entry.sourcePageTitle}»`
    : username && `@${username}`;

  return (
    <li className="flex min-w-0 items-center gap-2.5 py-2">
      {isWorkspace ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <UsersRound aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <Avatar size="sm" src={avatarUrl ?? undefined} alt={name} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>
      {entry.inherited ? (
        // Quyền kế thừa không sửa được tại đây — phải đổi ở trang cha.
        <Badge variant="outline" size="sm" className="shrink-0 text-muted-foreground">
          {pageRoleLabels[entry.permission.role]}
        </Badge>
      ) : (
        <RoleMenu
          label={`Vai trò của ${name}`}
          value={entry.permission.role}
          isPending={isPending}
          onSelect={onChangeRole}
          onRemove={onRemove}
          removeText="Gỡ quyền truy cập"
        />
      )}
    </li>
  );
}
