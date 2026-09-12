import { z } from 'zod';
import { taskClient } from '@/features/tasks/lib/task-client';

const attachmentSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  storageKey: z.string(),
});

const turnMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  status: z.enum(['failed', 'incomplete']).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const messageSchema = turnMessageSchema.extend({
  id: z.string(),
  createdAt: z.string(),
});

const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  projectId: z.string().nullable(),
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
export type ConversationTurn = {
  user: z.infer<typeof turnMessageSchema>;
  assistant: z.infer<typeof turnMessageSchema>;
};

export const taskAiHistoryApi = {
  list: async (): Promise<ConversationSummary[]> => {
    const raw = await taskClient.get<unknown>('/api/v1/ai-conversations');
    return conversationSummarySchema.array().parse(raw);
  },
  create: async (projectId?: string): Promise<{ id: string }> => {
    const raw = await taskClient.post<unknown>(
      '/api/v1/ai-conversations',
      projectId ? { projectId } : undefined,
    );
    return idResultSchema.parse(raw);
  },
  detail: async (id: string): Promise<ConversationDetail> => {
    const raw = await taskClient.get<unknown>(`/api/v1/ai-conversations/${id}`);
    return conversationDetailSchema.parse(raw);
  },
  appendTurn: (id: string, turn: ConversationTurn): Promise<unknown> =>
    taskClient.post<unknown>(`/api/v1/ai-conversations/${id}/turns`, turn),
  rename: async (id: string, title: string): Promise<{ id: string; title: string | null }> => {
    const raw = await taskClient.patch<unknown>(`/api/v1/ai-conversations/${id}`, { title });
    return renameResultSchema.parse(raw);
  },
  remove: async (id: string): Promise<{ id: string }> => {
    const raw = await taskClient.delete<unknown>(`/api/v1/ai-conversations/${id}`);
    return idResultSchema.parse(raw);
  },
} as const;
