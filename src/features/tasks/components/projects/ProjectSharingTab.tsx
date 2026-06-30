'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { UserMinus, UserPlus } from 'lucide-react';
import { useMembers, useAddMember, useRemoveMember } from '../../hooks/useMembers';
import type { Project } from '../../types';

export function ProjectSharingTab({ project }: { project: Project }) {
  const { data: members = [] } = useMembers(project.id);
  const addMember = useAddMember(project.id);
  const removeMember = useRemoveMember(project.id);
  const [inviteUserId, setInviteUserId] = useState('');

  const handleInvite = () => {
    const uid = inviteUserId.trim();
    if (!uid || addMember.isPending) return;
    addMember.mutate(uid, { onSuccess: () => setInviteUserId('') });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quản lý quyền truy cập dự án. Mời thành viên mới bằng User ID.
      </p>

      <div className="flex gap-2">
        <Input
          value={inviteUserId}
          onChange={(e) => setInviteUserId(e.target.value)}
          placeholder="User ID để mời…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInvite();
          }}
        />
        <Button onClick={handleInvite} disabled={!inviteUserId.trim() || addMember.isPending} size="sm">
          <UserPlus className="mr-1 h-4 w-4" /> Mời
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {members.length} thành viên
        </p>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Avatar
                src={m.avatarUrl ?? undefined}
                alt={m.displayName}
                fallback={m.displayName.charAt(0).toUpperCase()}
                className="h-8 w-8"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              {m.role !== 'OWNER' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeMember.mutate(m.userId)}
                  aria-label={`Gỡ ${m.displayName}`}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
