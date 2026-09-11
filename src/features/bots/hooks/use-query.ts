'use client';

import { useQuery } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys, botTokenKeys } from '@/services/keys';
import { botTokensApi } from '@/services/bot-tokens.api';

/** Danh sách bot của owner hiện tại (trang đơn giản, không infinite-scroll). */
export function useBots(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: botKeys.list(params.page, params.limit),
    queryFn: () => botsApi.list(params),
  });
}

/** Danh sách token (metadata, không plaintext) của 1 bot. */
export function useBotTokens(botId: string) {
  return useQuery({
    queryKey: botTokenKeys.list(botId),
    queryFn: () => botTokensApi.list(botId),
    enabled: Boolean(botId),
  });
}
