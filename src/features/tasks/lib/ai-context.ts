import type { AiChatContext } from '@/services/ai.api';
import { buildAiContext } from '@/features/ai/lib/build-ai-context';

export function buildTaskAiContext(
  projectId: string | null,
  now = new Date(),
): AiChatContext & Required<Pick<AiChatContext, 'today' | 'timezone'>> {
  return buildAiContext({ app: 'TASKS', ...(projectId ? { projectId } : {}) }, now);
}
