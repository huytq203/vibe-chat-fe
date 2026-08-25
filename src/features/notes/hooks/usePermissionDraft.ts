'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_ROLE } from '@/features/notes/lib/page-role';
import type { PageRole } from '@/features/notes/types';

export interface DraftPerson {
  avatarUrl: string | null;
  id: string;
  name: string;
  username: string;
}

export interface DraftGrant extends DraftPerson {
  role: PageRole;
}

/** Danh sách người đang chờ được cấp quyền trong modal, mỗi người một vai trò riêng. */
export function usePermissionDraft() {
  const [grants, setGrants] = useState<DraftGrant[]>([]);

  const toggle = useCallback((person: DraftPerson) => {
    setGrants((prev) => (prev.some((grant) => grant.id === person.id)
      ? prev.filter((grant) => grant.id !== person.id)
      : [...prev, { ...person, role: DEFAULT_PAGE_ROLE }]));
  }, []);

  const remove = useCallback((id: string) => {
    setGrants((prev) => prev.filter((grant) => grant.id !== id));
  }, []);

  const setRole = useCallback((id: string, role: PageRole) => {
    setGrants((prev) => prev.map((grant) => (grant.id === id ? { ...grant, role } : grant)));
  }, []);

  const setRoleForAll = useCallback((role: PageRole) => {
    setGrants((prev) => prev.map((grant) => ({ ...grant, role })));
  }, []);

  /** Giữ lại đúng những người cấp quyền thất bại để người dùng thử lại. */
  const keepOnly = useCallback((ids: string[]) => {
    setGrants((prev) => prev.filter((grant) => ids.includes(grant.id)));
  }, []);

  return { grants, keepOnly, remove, setRole, setRoleForAll, toggle };
}
