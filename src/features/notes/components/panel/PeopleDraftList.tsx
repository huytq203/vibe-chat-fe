'use client';

import { X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import type { DraftGrant } from '@/features/notes/hooks/usePermissionDraft';
import type { PageRole } from '@/features/notes/types';
import { RoleMenu } from './RoleMenu';

interface PeopleDraftListProps {
  grants: DraftGrant[];
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: PageRole) => void;
  onRoleForAll: (role: PageRole) => void;
}

export function PeopleDraftList({
  grants, onRemove, onRoleChange, onRoleForAll,
}: PeopleDraftListProps) {
  const first = grants[0];
  const sharedRole = grants.every((grant) => grant.role === first.role) ? first.role : undefined;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {grants.length} người sẽ được cấp quyền
        </p>
        {grants.length > 1 && (
          <RoleMenu
            label="Đặt vai trò cho tất cả"
            triggerText="Đặt cho tất cả"
            value={sharedRole}
            onSelect={onRoleForAll}
          />
        )}
      </div>
      <ul className="mt-1 max-h-36 overflow-y-auto">
        {grants.map((grant) => (
          <li key={grant.id} className="flex min-w-0 items-center gap-2.5 py-1.5">
            <Avatar size="sm" src={grant.avatarUrl ?? undefined} alt={grant.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{grant.name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{grant.username}</span>
            </span>
            <RoleMenu
              label={`Vai trò của ${grant.name}`}
              value={grant.role}
              onSelect={(role) => onRoleChange(grant.id, role)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Bỏ ${grant.name} khỏi danh sách`}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onRemove(grant.id)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
