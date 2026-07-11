'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys, botTokenKeys } from '@/services/keys';
import { botTokensApi } from '@/services/bot-tokens.api';
import type { CreateBotInput, UpdateBotInput, IssueTokenInput } from '../schemas';

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

/** Cấp token mới cho bot (ngoài token mặc định lúc tạo, hoặc khi cần thêm scope). */
export function useIssueToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTokenInput) => botTokensApi.issue(botId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token cũ + cấp token mới ngay lập tức (token cũ ngừng hoạt động). */
export function useRotateToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tokenId, input }: { tokenId: string; input: IssueTokenInput }) =>
      botTokensApi.rotate(botId, tokenId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token, không cấp lại. */
export function useRevokeToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => botTokensApi.revoke(botId, tokenId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}
