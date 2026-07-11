'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys } from '@/services/keys';
import type { CreateBotInput, UpdateBotInput } from '../schemas';

/** Tạo bot mới — response kèm token plaintext (chỉ hiện 1 lần). */
export function useCreateBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBotInput) => botsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Sửa displayName/description của 1 bot. */
export function useUpdateBot(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBotInput) => botsApi.update(botId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Xoá (soft-delete) bot — BE tự thu hồi toàn bộ token. */
export function useDeleteBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) => botsApi.remove(botId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}
