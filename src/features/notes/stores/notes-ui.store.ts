'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type NotesUiState = {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  /** ID các node đang mở, tách theo workspace để đổi workspace không lẫn trạng thái. */
  expandedByWorkspace: Record<string, string[]>;
  toggleExpanded: (workspaceId: string, pageId: string) => void;
};

export const useNotesUiStore = create<NotesUiState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
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
    }),
    { name: 'halo-notes-ui' },
  ),
);
