'use client';

import { create } from 'zustand';

export type ActiveView = 'home' | 'projects' | 'board' | 'reports';

type SettingsModalState = { open: true; tab: 'info' | 'share' | 'labels' } | { open: false };

type TasksUIState = {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
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
  activeView: 'home',
  setActiveView: (v) => set({ activeView: v }),
  selectedProjectId: null,
  setSelectedProjectId: (id) =>
    set({ selectedProjectId: id, activeView: id ? 'board' : 'home' }),
  selectedTaskId: null,
  openTask: (id) => set({ selectedTaskId: id }),
  closeTask: () => set({ selectedTaskId: null }),
  boardView: 'board',
  setBoardView: (v) => set({ boardView: v }),
  settingsModal: { open: false },
  openSettings: (tab = 'info') => set({ settingsModal: { open: true, tab } }),
  closeSettings: () => set({ settingsModal: { open: false } }),
}));
