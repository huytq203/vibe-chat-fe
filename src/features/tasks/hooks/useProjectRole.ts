import { getCurrentUser } from '../lib/current-user';
import { useMembers } from './useMembers';
import type { ProjectRole } from '../types';

export function useProjectRole(projectId: string): {
  role: ProjectRole | null;
  isClient: boolean;
  canManage: boolean;
  isLoading: boolean;
} {
  const { data: members, isLoading } = useMembers(projectId);
  const currentUser = getCurrentUser();
  const role = members?.find((member) => member.userId === currentUser?.userId)?.role ?? null;

  return {
    role,
    isClient: role === 'CLIENT',
    canManage: role === 'OWNER' || role === 'ADMIN',
    isLoading,
  };
}
