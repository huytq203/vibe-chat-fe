import { z } from 'zod';

export const resolvedMessageSchema = z.object({
  uuid: z.string().uuid(),
  senderId: z.string(),
  previewText: z.string(),
  createdAt: z.string(),
});

export const analysisActionSchema = z.object({
  type: z.enum([
    'CREATE_COMMITMENT',
    'CREATE_CHANGE_REQUEST',
    'CREATE_TASK',
    'CREATE_DECISION',
    'ASK_CLARIFICATION',
    'LINK_EXISTING_COMMITMENT',
  ]),
  title: z.string(),
  description: z.string(),
  targetCommitmentId: z.string().nullable(),
});

export const messageAnalysisSchema = z.object({
  classification: z.enum([
    'TASK',
    'SCOPE_CHANGE',
    'COMMITMENT',
    'DECISION',
    'BLOCKER',
    'UNCLEAR',
  ]),
  scopeStatus: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE', 'UNCLEAR']),
  summary: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  clarifyingQuestion: z.string().nullable(),
  suggestedActions: z.array(analysisActionSchema).max(5),
  source: z.object({
    conversationId: z.string().uuid(),
    messageIds: z.array(z.string().uuid()),
  }),
});

export type ResolvedMessage = z.infer<typeof resolvedMessageSchema>;
export type MessageAnalysis = z.infer<typeof messageAnalysisSchema>;
export type MessageAnalysisInput = {
  projectId: string;
  conversationId: string;
  messages: ResolvedMessage[];
  instruction?: string;
};
