'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidePanelTab = 'comments' | 'versions' | 'share' | 'ai';

export type AiReviewTarget = { pageId: string; versionId: string };

type NotesUiState = {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  isSidePanelOpen: boolean;
  setSidePanelOpen: (isOpen: boolean) => void;
  toggleSidePanel: () => void;
  sidePanelTab: SidePanelTab;
  setSidePanelTab: (tab: SidePanelTab) => void;
  aiComposerDraft: string | null;
  setAiComposerDraft: (draft: string | null) => void;
  activeCommentBlockId: string | null;
  openCommentThread: (blockId: string) => void;
  /** Thay đổi AI đang được so sánh trong khung tài liệu. */
  aiReview: AiReviewTarget | null;
  openAiReview: (review: AiReviewTarget) => void;
  closeAiReview: () => void;
  /** Version đã hoàn tác từ khung so sánh, để thẻ trong chat tự ẩn theo. */
  restoredAiVersionId: string | null;
  markAiVersionRestored: (versionId: string) => void;
  /** ID các node đang mở, tách theo workspace để đổi workspace không lẫn trạng thái. */
  expandedByWorkspace: Record<string, string[]>;
  toggleExpanded: (workspaceId: string, pageId: string) => void;
  /** Hội thoại AI đang mở, tách theo workspace vì lịch sử thuộc workspace. */
  aiConversationByWorkspace: Record<string, string | null>;
  setAiConversation: (workspaceId: string, conversationId: string | null) => void;
};

type NotesUiPersistedState = Pick<NotesUiState,
  | 'activeWorkspaceId'
  | 'isSidePanelOpen'
  | 'sidePanelTab'
  | 'activeCommentBlockId'
  | 'expandedByWorkspace'
  | 'aiConversationByWorkspace'
>;

export const useNotesUiStore = create<NotesUiState>()(
  persist<NotesUiState, [], [], NotesUiPersistedState>(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      isSidePanelOpen: false,
      setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
      toggleSidePanel: () => set((state) => ({ isSidePanelOpen: !state.isSidePanelOpen })),
      sidePanelTab: 'comments',
      setSidePanelTab: (sidePanelTab) => set({ sidePanelTab }),
      aiComposerDraft: null,
      setAiComposerDraft: (aiComposerDraft) => set({ aiComposerDraft }),
      activeCommentBlockId: null,
      openCommentThread: (activeCommentBlockId) => set({
        activeCommentBlockId,
        isSidePanelOpen: true,
        sidePanelTab: 'comments',
      }),
      aiReview: null,
      openAiReview: (aiReview) => set({ aiReview }),
      closeAiReview: () => set({ aiReview: null }),
      restoredAiVersionId: null,
      markAiVersionRestored: (restoredAiVersionId) => set({ restoredAiVersionId, aiReview: null }),
      expandedByWorkspace: {},
      toggleExpanded: (workspaceId, pageId) =>
        set((state) => {
          const expandedIds = state.expandedByWorkspace[workspaceId] ?? [];
          const nextIds = expandedIds.includes(pageId)
            ? expandedIds.filter((id) => id !== pageId)
            : [...expandedIds, pageId];

          return {
            expandedByWorkspace: {
              ...state.expandedByWorkspace,
              [workspaceId]: nextIds,
            },
          };
        }),
      aiConversationByWorkspace: {},
      setAiConversation: (workspaceId, conversationId) =>
        set((state) => ({
          aiConversationByWorkspace: {
            ...state.aiConversationByWorkspace,
            [workspaceId]: conversationId,
          },
        })),
    }),
    {
      name: 'halo-notes-ui',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        isSidePanelOpen: state.isSidePanelOpen,
        sidePanelTab: state.sidePanelTab,
        activeCommentBlockId: state.activeCommentBlockId,
        expandedByWorkspace: state.expandedByWorkspace,
        aiConversationByWorkspace: state.aiConversationByWorkspace,
      }),
    },
  ),
);
