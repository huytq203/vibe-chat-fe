'use client';

import { create } from 'zustand';

type SettingsModalState = { open: true; tab: 'info' | 'share' | 'labels' } | { open: false };

type TasksUIState = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  boardView: 'board' | 'list';
  setBoardView: (v: 'board' | 'list') => void;
  settingsModal: SettingsModalState;
  openSettings: (tab?: 'info' | 'share' | 'labels') => void;
  closeSettings: () => void;
};

export const useTasksUIStore = create<TasksUIState>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedTaskId: null,
  openTask: (id) => set({ selectedTaskId: id }),
  closeTask: () => set({ selectedTaskId: null }),
  boardView: 'board',
  setBoardView: (v) => set({ boardView: v }),
  settingsModal: { open: false },
  openSettings: (tab = 'info') => set({ settingsModal: { open: true, tab } }),
  closeSettings: () => set({ settingsModal: { open: false } }),
}));
