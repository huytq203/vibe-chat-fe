import type { MessageAnalysis } from '@/features/chat/types';
import type { CreateSourceRefInput } from '@/features/tasks/types';

export function buildSourceRefFromAnalysis(
  source: MessageAnalysis['source'],
): CreateSourceRefInput {
  return {
    type: 'CHAT_MESSAGE',
    conversationId: source.conversationId,
    messageIds: source.messageIds,
  };
}
