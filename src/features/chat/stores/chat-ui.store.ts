'use client';

import { create } from 'zustand';

export type NavSection = 'chat' | 'ai' | 'ai-full';

type ChatUIState = {
  rightPanelOpen: boolean;
  activeTab: 'all' | 'unread' | 'group';
  /** Mobile-only: panel đang hiển thị (desktop bỏ qua). */
  mobilePanel: 'list' | 'chat' | 'contact';
  /** Overlay "Tin nhắn của người lạ" đang mở — lưu store để sống sót khi đổi panel mobile. */
  strangerOpen: boolean;
  /** Kho lưu trữ cá nhân (myStore) đang mở ở ChatPanel. */
  myStoreOpen: boolean;
  /** Chế độ xem Tệp & thư mục toàn màn hình của myStore (thay khung chat + panel). */
  myStoreFilesOpen: boolean;
  /** Desktop nav sidebar — section đang active. */
  activeSection: NavSection;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  setActiveTab: (tab: ChatUIState['activeTab']) => void;
  setMobilePanel: (panel: ChatUIState['mobilePanel']) => void;
  setStrangerOpen: (open: boolean) => void;
  setMyStoreOpen: (open: boolean) => void;
  setMyStoreFilesOpen: (open: boolean) => void;
  setActiveSection: (section: NavSection) => void;
};

export const useChatUIStore = create<ChatUIState>((set) => ({
  rightPanelOpen: true,
  activeTab: 'all',
  mobilePanel: 'list',
  strangerOpen: false,
  myStoreOpen: false,
  myStoreFilesOpen: false,
  activeSection: 'chat',
  toggleRight: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setStrangerOpen: (open) => set({ strangerOpen: open }),
  setMyStoreOpen: (open) => set({ myStoreOpen: open }),
  setMyStoreFilesOpen: (open) => set({ myStoreFilesOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
