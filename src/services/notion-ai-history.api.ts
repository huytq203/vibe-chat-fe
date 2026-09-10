import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

const attachmentSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  storageKey: z.string(),
});

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  status: z.enum(['failed', 'incomplete']).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  updatedAt: z.string(),
});

const conversationDetailSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  messages: z.array(messageSchema),
});

const idResultSchema = z.object({ id: z.string() });
const renameResultSchema = z.object({ id: z.string(), title: z.string().nullable() });

export type ConversationAttachment = z.infer<typeof attachmentSchema>;
export type ConversationMessage = z.infer<typeof messageSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
export type ConversationTurn = { user: ConversationMessage; assistant: ConversationMessage };

export const notionAiHistoryApi = {
  list: async (workspaceId: string): Promise<ConversationSummary[]> => {
    const raw = await apiClient.get<unknown>(
      `/api/v1/workspaces/${workspaceId}/ai-conversations`, {
        service: 'notion',
      },
    );
    return conversationSummarySchema.array().parse(raw);
  },
  create: async (workspaceId: string, pageId?: string): Promise<{ id: string }> => {
    const raw = await apiClient.post<unknown>(
      `/api/v1/workspaces/${workspaceId}/ai-conversations`, {
        body: pageId ? { pageId } : undefined,
        service: 'notion',
      },
    );
    return idResultSchema.parse(raw);
  },
  detail: async (id: string): Promise<ConversationDetail> => {
    const raw = await apiClient.get<unknown>(`/api/v1/ai-conversations/${id}`, {
      service: 'notion',
    });
    return conversationDetailSchema.parse(raw);
  },
  appendTurn: (id: string, turn: ConversationTurn): Promise<unknown> =>
    apiClient.post<unknown>(`/api/v1/ai-conversations/${id}/turns`, {
      body: turn,
      service: 'notion',
    }),
  rename: async (id: string, title: string): Promise<{ id: string; title: string | null }> => {
    const raw = await apiClient.patch<unknown>(`/api/v1/ai-conversations/${id}`, {
      body: { title },
      service: 'notion',
    });
    return renameResultSchema.parse(raw);
  },
  remove: async (id: string): Promise<{ id: string }> => {
    const raw = await apiClient.delete<unknown>(`/api/v1/ai-conversations/${id}`, {
      service: 'notion',
    });
    return idResultSchema.parse(raw);
  },
  uploadAttachment: async (id: string, file: File): Promise<ConversationAttachment> => {
    const body = new FormData();
    body.append('file', file);
    const raw = await apiClient.post<unknown>(`/api/v1/ai-conversations/${id}/attachments`, {
      body,
      service: 'notion',
    });
    return attachmentSchema.parse(raw);
  },
} as const;
