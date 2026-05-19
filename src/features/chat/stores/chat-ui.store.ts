'use client';

import { create } from 'zustand';

type ChatUIState = {
  selectedConversationId: string | null;
  rightPanelOpen: boolean;
  activeTab: 'all' | 'unread' | 'group';
  setSelected: (id: string | null) => void;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  setActiveTab: (tab: ChatUIState['activeTab']) => void;
};

export const useChatUIStore = create<ChatUIState>((set) => ({
  selectedConversationId: null,
  rightPanelOpen: true,
  activeTab: 'all',
  setSelected: (id) => set({ selectedConversationId: id }),
  toggleRight: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
