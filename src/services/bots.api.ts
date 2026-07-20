import { apiClient } from '@/lib/api/client';
import type { Bot, BotCreated, BotListPage } from '@/features/bots/types';
import type {
  CreateBotInput,
  UpdateBotInlineInput,
  UpdateBotWebappInput,
  UpdateBotInput,
} from '@/features/bots/schemas';

/**
 * REST endpoints Management API bot-service (BotFather). Pure transport.
 * Hook TanStack ở features/bots/hooks/*.
 */
export const botsApi = {
  list: async (params: { page: number; limit: number }): Promise<BotListPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Bot[]>('GET', '/api/v1/bots', {
      query: { page: params.page, limit: params.limit },
    });
    const m = meta as
      | { page?: number; limit?: number; total?: number; totalPages?: number }
      | undefined;
    return {
      items: data,
      page: m?.page ?? params.page,
      limit: m?.limit ?? params.limit,
      total: m?.total ?? data.length,
      totalPages: m?.totalPages ?? 1,
    };
  },

  create: (input: CreateBotInput) =>
    apiClient.post<BotCreated>('/api/v1/bots', { body: input }),

  update: (botId: string, input: UpdateBotInput) =>
    apiClient.patch<Bot>(`/api/v1/bots/${encodeURIComponent(botId)}`, { body: input }),

  updateInline: (botId: string, input: UpdateBotInlineInput) =>
    apiClient.patch<Bot>(`/api/v1/bots/${encodeURIComponent(botId)}/inline`, {
      body: input,
    }),

  updateWebapp: (
    botId: string,
    input: Omit<UpdateBotWebappInput, 'allowedDomainsText'> & {
      allowedDomains?: string[];
    },
  ) =>
    apiClient.patch<Bot>(`/api/v1/bots/${encodeURIComponent(botId)}/webapp`, {
      body: input,
    }),

  remove: (botId: string) =>
    apiClient.delete<void>(`/api/v1/bots/${encodeURIComponent(botId)}`),
} as const;
