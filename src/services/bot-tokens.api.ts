import { apiClient } from '@/lib/api/client';
import type { BotTokenIssued, BotTokenListItem } from '@/features/bots/types';
import type { IssueTokenInput } from '@/features/bots/schemas';

/**
 * REST endpoints token của 1 bot (nested resource `/bots/:botId/tokens`).
 * Hook TanStack ở features/bots/hooks/*.
 */
export const botTokensApi = {
  list: (botId: string) =>
    apiClient.get<BotTokenListItem[]>(`/api/v1/bots/${encodeURIComponent(botId)}/tokens`),

  issue: (botId: string, input: IssueTokenInput) =>
    apiClient.post<BotTokenIssued>(`/api/v1/bots/${encodeURIComponent(botId)}/tokens`, {
      body: input,
    }),

  rotate: (botId: string, tokenId: string, input: IssueTokenInput) =>
    apiClient.post<BotTokenIssued>(
      `/api/v1/bots/${encodeURIComponent(botId)}/tokens/${encodeURIComponent(tokenId)}/rotate`,
      { body: input },
    ),

  revoke: (botId: string, tokenId: string) =>
    apiClient.delete<void>(
      `/api/v1/bots/${encodeURIComponent(botId)}/tokens/${encodeURIComponent(tokenId)}`,
    ),
} as const;
