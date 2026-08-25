'use client';

import { UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { UserProfile } from '@/features/friends';
import { Button } from '@/components/ui/button/Button';
import { useRemovePermission, useSetPermission } from '@/features/notes/hooks/use-mutations';
import { useUserProfiles } from '@/features/notes/hooks/useUserProfiles';
import type { EffectivePagePermission, WorkspaceMember } from '@/features/notes/types';
import { AddPeopleDialog } from './AddPeopleDialog';
import { PermissionRow } from './PermissionRow';

type MemberMap = Map<string, WorkspaceMember>;
type ProfileMap = Map<string, UserProfile>;

function isUserGrant(entry: EffectivePagePermission) {
  return entry.permission.subjectType === 'USER';
}

/** Tên hiển thị lấy từ thành viên workspace trước, sau đó tới hồ sơ user tra thêm. */
function resolveSubject(entry: EffectivePagePermission, members: MemberMap, profiles: ProfileMap) {
  if (!isUserGrant(entry)) return { avatarUrl: null, name: 'Mọi thành viên workspace' };
  const subjectId = entry.permission.subjectId;
  const member = members.get(subjectId);
  const profile = profiles.get(subjectId);
  return {
    avatarUrl: member?.user?.avatarUrl ?? profile?.avatarUrl ?? null,
    name: member?.user?.displayName ?? profile?.displayName ?? profile?.username
      ?? 'Người dùng Halo',
    username: profile?.username,
  };
}

interface InternalPermissionSectionProps {
  members: WorkspaceMember[];
  pageId: string;
  permissions: EffectivePagePermission[];
}

export function InternalPermissionSection({
  members, pageId, permissions,
}: InternalPermissionSectionProps) {
  const [isAddOpen, setAddOpen] = useState(false);
  const setPermission = useSetPermission();
  const remove = useRemovePermission();

  const membersById: MemberMap = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );
  const userGrants = useMemo(() => permissions.filter(isUserGrant), [permissions]);
  const unknownIds = useMemo(() => [...new Set(userGrants
    .map((entry) => entry.permission.subjectId)
    .filter((subjectId) => !membersById.has(subjectId)))].sort(), [membersById, userGrants]);
  const profiles = useUserProfiles(unknownIds);
  const grantedIds = useMemo(() => userGrants
    .filter((entry) => !entry.inherited)
    .map((entry) => entry.permission.subjectId), [userGrants]);

  return (
    <section aria-labelledby="internal-sharing-title" className="space-y-3 p-4">
      <div>
        <h2 id="internal-sharing-title" className="text-sm font-semibold text-foreground">Nội bộ</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cấp quyền riêng cho người trong Halo.</p>
      </div>

      <Button type="button" size="md" onClick={() => setAddOpen(true)}>
        <UserPlus aria-hidden="true" className="size-4" />Thêm người
      </Button>

      {permissions.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">
          Chưa ai được cấp quyền riêng trên trang này.
        </p>
      ) : (
        <div>
          <p className="pb-1 text-xs font-medium text-muted-foreground">Đang có quyền</p>
          <ul className="divide-y divide-border">
            {permissions.map((entry) => {
              const { permission } = entry;
              const subject = resolveSubject(entry, membersById, profiles);
              return (
                <PermissionRow
                  key={permission.id}
                  entry={entry}
                  name={subject.name}
                  avatarUrl={subject.avatarUrl}
                  username={subject.username}
                  isPending={
                    (setPermission.isPending
                      && setPermission.variables?.input.subjectId === permission.subjectId)
                    || (remove.isPending && remove.variables?.permissionId === permission.id)
                  }
                  onChangeRole={(role) => setPermission.mutate(
                    { pageId, input: { role, subjectId: permission.subjectId,
                      subjectType: permission.subjectType } },
                    { onSuccess: () => toast.success(`Đã đổi vai trò của ${subject.name}`) },
                  )}
                  onRemove={() => remove.mutate(
                    { pageId, permissionId: permission.id },
                    { onSuccess: () => toast.success(`Đã gỡ quyền của ${subject.name}`) },
                  )}
                />
              );
            })}
          </ul>
        </div>
      )}

      {/* Mount theo điều kiện → danh sách đang soạn tự reset mỗi lần mở lại. */}
      {isAddOpen && (
        <AddPeopleDialog
          open
          pageId={pageId}
          grantedIds={grantedIds}
          onOpenChange={setAddOpen}
        />
      )}
    </section>
  );
}
