import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

export const aiConversationOriginSchema = z.enum(['NOTES', 'TASKS', 'CHAT']);

const conversationContextSchema = z.object({
  workspaceId: z.string().optional(),
  pageId: z.string().optional(),
  projectId: z.string().optional(),
}).nullable();

const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  origin: aiConversationOriginSchema,
  context: conversationContextSchema,
  updatedAt: z.string(),
});

const attachmentSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['USER', 'ASSISTANT'])
    .transform((role): 'user' | 'assistant' => role === 'USER' ? 'user' : 'assistant'),
  content: z.string(),
  status: z.enum(['FAILED', 'INCOMPLETE']).nullable(),
  toolNames: z.array(z.string()).nullable(),
  attachments: z.array(attachmentSchema).nullable(),
  createdAt: z.string(),
});

const conversationDetailSchema = conversationSummarySchema.omit({ updatedAt: true }).extend({
  messages: z.array(messageSchema),
});

export type AiConversationOrigin = z.infer<typeof aiConversationOriginSchema>;
export type AiConversationSummary = z.infer<typeof conversationSummarySchema>;
export type AiConversationDetail = z.infer<typeof conversationDetailSchema>;

export type ListAiConversationsOptions = {
  origin?: AiConversationOrigin;
  limit?: number;
};

export const aiConversationsApi = {
  list: async (options: ListAiConversationsOptions = {}): Promise<AiConversationSummary[]> => {
    const raw = await apiClient.get<unknown>('/api/v1/ai/conversations', {
      query: options,
      service: 'ai' as never,
    });
    return conversationSummarySchema.array().parse(raw);
  },
  detail: async (id: string): Promise<AiConversationDetail> => {
    const raw = await apiClient.get<unknown>(`/api/v1/ai/conversations/${id}`, {
      service: 'ai' as never,
    });
    return conversationDetailSchema.parse(raw);
  },
  rename: async (id: string, title: string): Promise<AiConversationSummary> => {
    const raw = await apiClient.patch<unknown>(`/api/v1/ai/conversations/${id}`, {
      body: { title },
      service: 'ai' as never,
    });
    return conversationSummarySchema.parse(raw);
  },
  remove: (id: string): Promise<void> => apiClient.delete<void>(
    `/api/v1/ai/conversations/${id}`,
    { service: 'ai' as never },
  ),
} as const;
