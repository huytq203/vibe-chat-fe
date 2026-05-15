'use client';

import { create } from 'zustand';
import type { TodoFilter } from '../types';

/**
 * Zustand slice — chỉ chứa UI state CỦA RIÊNG feature todo.
 * Server data (list todo) ở TanStack Query, KHÔNG ở đây.
 */
type TodoUIState = {
  filter: TodoFilter;
  setFilter: (filter: TodoFilter) => void;
};

export const useTodoUIStore = create<TodoUIState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));
