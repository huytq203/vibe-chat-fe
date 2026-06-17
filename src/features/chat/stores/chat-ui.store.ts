'use client';

import { create } from 'zustand';

type ChatUIState = {
  rightPanelOpen: boolean;
  activeTab: 'all' | 'unread' | 'group';
  /** Mobile-only: panel đang hiển thị (desktop bỏ qua). */
  mobilePanel: 'list' | 'chat' | 'contact';
  /** Overlay "Tin nhắn của người lạ" đang mở — lưu store để sống sót khi đổi panel mobile. */
  strangerOpen: boolean;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  setActiveTab: (tab: ChatUIState['activeTab']) => void;
  setMobilePanel: (panel: ChatUIState['mobilePanel']) => void;
  setStrangerOpen: (open: boolean) => void;
};

export const useChatUIStore = create<ChatUIState>((set) => ({
  rightPanelOpen: true,
  activeTab: 'all',
  mobilePanel: 'list',
  strangerOpen: false,
  toggleRight: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setStrangerOpen: (open) => set({ strangerOpen: open }),
}));
