import type { AiConversationOrigin } from '@/services/ai-conversations.api';

export const aiConversationKeys = {
  all: ['ai', 'conversations'] as const,
  list: (origin?: AiConversationOrigin) => [
    ...aiConversationKeys.all,
    'list',
    origin ?? 'all',
  ] as const,
  detail: (id: string) => [...aiConversationKeys.all, 'detail', id] as const,
} as const;
