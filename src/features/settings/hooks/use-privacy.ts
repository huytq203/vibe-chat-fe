'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/users.api';
import { userKeys } from '@/services/keys';
import type { PrivacySettings } from '@/features/friends/types';

/** Cài đặt chia sẻ thông tin cá nhân của chính chủ (GET /users/me/privacy). */
export function usePrivacySettings() {
  return useQuery({
    queryKey: userKeys.privacy(),
    queryFn: () => usersApi.getPrivacy(),
    staleTime: 60_000,
  });
}

/** Cập nhật 1 phần cài đặt privacy — patch cache ngay từ response để UI mượt. */
export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<PrivacySettings>) =>
      usersApi.updatePrivacy(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.privacy(), data);
    },
  });
}
