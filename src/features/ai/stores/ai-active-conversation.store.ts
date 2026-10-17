import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Notes tạo một scope cho mỗi trang → giới hạn để localStorage không phình theo thời gian. */
export const MAX_REMEMBERED_SCOPES = 50;

type RememberedConversation = { scope: string; conversationId: string };

type AiActiveConversationState = {
  /** Mới nhất ở đầu. */
  recent: RememberedConversation[];
  setActive: (scope: string, conversationId: string | null) => void;
};

export const useAiActiveConversationStore = create<AiActiveConversationState>()(
  persist(
    (set) => ({
      recent: [],
      setActive: (scope, conversationId) =>
        set((state) => {
          const others = state.recent.filter((entry) => entry.scope !== scope);
          if (!conversationId) return { recent: others };
          return {
            recent: [{ scope, conversationId }, ...others].slice(0, MAX_REMEMBERED_SCOPES),
          };
        }),
    }),
    {
      name: 'halo-ai-active',
      partialize: (state) => ({ recent: state.recent }),
    },
  ),
);

export function selectActiveConversation(scope: string) {
  return (state: AiActiveConversationState): string | null =>
    state.recent.find((entry) => entry.scope === scope)?.conversationId ?? null;
}
