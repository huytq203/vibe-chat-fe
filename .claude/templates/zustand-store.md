# TEMPLATE — Zustand slice store

> Chỉ cho state **thực sự global, đổi nhiều**. Mỗi feature 1 store, không "god store".

```ts
// features/chat/stores/chat-ui.store.ts
import { create } from "zustand";

interface ChatUIState {
  sidebarOpen: boolean;
  activeConversationId: string | null;
  toggleSidebar: () => void;
  setActiveConversation: (id: string | null) => void;
}

export const useChatUIStore = create<ChatUIState>((set) => ({
  sidebarOpen: true,
  activeConversationId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
```

## Selector (tránh re-render thừa)
```ts
const sidebarOpen = useChatUIStore((s) => s.sidebarOpen); // ✅ chọn đúng field
// ❌ const { sidebarOpen } = useChatUIStore(); // subscribe cả store
```

## Nhắc
- KHÔNG để **server data** trong Zustand → đó là việc của TanStack Query.
- Tách action ra khỏi state value để dễ test.
- File `<name>.store.ts` trong `features/<x>/stores/`.
