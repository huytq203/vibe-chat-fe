'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { authKeys } from '@/services/keys';

export function useIdentities() {
  return useQuery({ queryKey: authKeys.identities(), queryFn: () => authApi.listIdentities() });
}
