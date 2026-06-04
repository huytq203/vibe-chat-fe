'use client';

import { create } from 'zustand';

type ChatUIState = {
  rightPanelOpen: boolean;
  activeTab: 'all' | 'unread' | 'group';
  /** Mobile-only: panel đang hiển thị (desktop bỏ qua). */
  mobilePanel: 'list' | 'chat' | 'contact';
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  setActiveTab: (tab: ChatUIState['activeTab']) => void;
  setMobilePanel: (panel: ChatUIState['mobilePanel']) => void;
};

export const useChatUIStore = create<ChatUIState>((set) => ({
  rightPanelOpen: true,
  activeTab: 'all',
  mobilePanel: 'list',
  toggleRight: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
}));
