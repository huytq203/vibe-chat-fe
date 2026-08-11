'use client';

import { create } from 'zustand';

export type NavSection = 'chat' | 'ai-full' | 'tasks' | 'store' | 'settings';

type ChatUIState = {
  rightPanelOpen: boolean;
  activeTab: 'all' | 'unread' | 'group';
  /** Lựa chọn tức thời trong lúc App Router chưa commit route conversation mới. */
  pendingConversationId: string | null | undefined;
  /** Route tại thời điểm bắt đầu điều hướng, dùng để nhận biết điều hướng ngoài luồng. */
  pendingConversationRouteId: string | null | undefined;
  /** Mobile-only: panel đang hiển thị (desktop bỏ qua). */
  mobilePanel: 'list' | 'chat' | 'contact';
  /** Overlay "Tin nhắn của người lạ" đang mở — lưu store để sống sót khi đổi panel mobile. */
  strangerOpen: boolean;
  /** Desktop nav sidebar — section đang active. */
  activeSection: NavSection;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  setActiveTab: (tab: ChatUIState['activeTab']) => void;
  setPendingConversation: (id: string | null, routeId: string | null) => void;
  clearPendingConversation: () => void;
  setMobilePanel: (panel: ChatUIState['mobilePanel']) => void;
  setStrangerOpen: (open: boolean) => void;
  setActiveSection: (section: NavSection) => void;
};

export const useChatUIStore = create<ChatUIState>((set) => ({
  rightPanelOpen: true,
  activeTab: 'all',
  pendingConversationId: undefined,
  pendingConversationRouteId: undefined,
  mobilePanel: 'list',
  strangerOpen: false,
  activeSection: 'chat',
  toggleRight: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightOpen: (open) => set({ rightPanelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPendingConversation: (id, routeId) =>
    set({ pendingConversationId: id, pendingConversationRouteId: routeId }),
  clearPendingConversation: () =>
    set({ pendingConversationId: undefined, pendingConversationRouteId: undefined }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setStrangerOpen: (open) => set({ strangerOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
