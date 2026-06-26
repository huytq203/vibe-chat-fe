'use client';

import { create } from 'zustand';

type TasksUIState = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

export const useTasksUIStore = create<TasksUIState>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
}));
