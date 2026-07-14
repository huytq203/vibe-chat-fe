'use client';

import { useQuery } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys, botTokenKeys } from '@/services/keys';
import { botTokensApi } from '@/services/bot-tokens.api';
import { getBotDemoIdentity } from '@/lib/bot-demo';

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

/** Username của bot đứng sau BOT_DEMO_TOKEN — hiếm đổi, cache dài. */
export function useBotDemoIdentity() {
  return useQuery({
    queryKey: ['bot-demo-identity'],
    queryFn: getBotDemoIdentity,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
