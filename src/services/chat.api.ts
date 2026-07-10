import { conversationApi } from '@/services/chat-conversation.api';
import { messageApi } from '@/services/chat-message.api';
import { memberApi } from '@/services/chat-member.api';
import { joinRequestApi } from '@/services/chat-join-request.api';
import { lockApi } from '@/services/chat-lock.api';
import { reactionApi } from '@/services/chat-reaction.api';
import { pinApi } from '@/services/chat-pin.api';
import { pollApi } from '@/services/chat-poll.api';

export type { UpdateConversationInput } from '@/services/chat-conversation.api';

/**
 * Chat REST transport. Pure — không đụng cache/state. Hook TanStack Query ở
 * features/chat/hooks/*. Được ghép từ các nhóm theo domain (chat-*.api.ts) —
 * import `{ chatApi }` giữ nguyên như trước.
 */
export const chatApi = {
  ...conversationApi,
  ...messageApi,
  ...memberApi,
  ...joinRequestApi,
  ...lockApi,
  ...reactionApi,
  ...pinApi,
  ...pollApi,
} as const;
