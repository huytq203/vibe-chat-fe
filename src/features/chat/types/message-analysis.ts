import { z } from 'zod';

export const resolvedMessageSchema = z.object({
  uuid: z.string().uuid(),
  senderId: z.string(),
  previewText: z.string(),
  createdAt: z.string(),
});

export const analysisActionSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  targetTaskId: z.string().nullable().optional(),
});

export const analysisActionTypeSchema = z.enum([
  'CREATE_TASK',
  'UPDATE_EXISTING_TASK',
  'ASK_CLARIFICATION',
]);

export type AnalysisActionType = z.infer<typeof analysisActionTypeSchema>;

function isSupportedAction(
  action: z.infer<typeof analysisActionSchema>,
): action is z.infer<typeof analysisActionSchema> & { type: AnalysisActionType } {
  return analysisActionTypeSchema.safeParse(action.type).success;
}

export const messageAnalysisSchema = z.object({
  summary: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  clarifyingQuestion: z.string().nullable(),
  suggestedActions: z.array(analysisActionSchema).max(5).transform((actions) => actions.filter(isSupportedAction)),
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
