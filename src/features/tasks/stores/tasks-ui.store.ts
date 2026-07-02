'use client';

import { create } from 'zustand';

export type ActiveView = 'home' | 'projects' | 'board' | 'reports';

type SettingsModalState = { open: true; tab: 'info' | 'share' | 'labels' } | { open: false };

type TasksUIState = {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  /** Từ khoá tìm dự án — nhập ở AppHeader, dùng chung cho Dashboard + ProjectsPage. */
  projectSearch: string;
  setProjectSearch: (q: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  /** Ngăn xếp drill-down subtask (id các task con dưới task gốc đang mở). */
  subtaskPath: string[];
  openSubtask: (id: string) => void;
  navigateSubtaskBack: () => void;
  boardView: 'board' | 'list';
  setBoardView: (v: 'board' | 'list') => void;
  settingsModal: SettingsModalState;
  openSettings: (tab?: 'info' | 'share' | 'labels') => void;
  closeSettings: () => void;
};

export const useTasksUIStore = create<TasksUIState>((set) => ({
  activeView: 'home',
  setActiveView: (v) => set({ activeView: v }),
  projectSearch: '',
  setProjectSearch: (q) => set({ projectSearch: q }),
  selectedProjectId: null,
  setSelectedProjectId: (id) =>
    set({ selectedProjectId: id, activeView: id ? 'board' : 'home' }),
  selectedTaskId: null,
  openTask: (id) => set({ selectedTaskId: id, subtaskPath: [] }),
  closeTask: () => set({ selectedTaskId: null, subtaskPath: [] }),
  subtaskPath: [],
  openSubtask: (id) => set((s) => ({ subtaskPath: [...s.subtaskPath, id] })),
  navigateSubtaskBack: () => set((s) => ({ subtaskPath: s.subtaskPath.slice(0, -1) })),
  boardView: 'board',
  setBoardView: (v) => set({ boardView: v }),
  settingsModal: { open: false },
  openSettings: (tab = 'info') => set({ settingsModal: { open: true, tab } }),
  closeSettings: () => set({ settingsModal: { open: false } }),
}));
