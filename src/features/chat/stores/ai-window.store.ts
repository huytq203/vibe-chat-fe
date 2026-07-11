'use client';

import { create } from 'zustand';

type AiWindowPosition = { x: number; y: number };

type AiWindowState = {
  isOpen: boolean;
  position: AiWindowPosition;
  open: () => void;
  close: () => void;
  setPosition: (x: number, y: number) => void;
};

const INITIAL_POSITION: AiWindowPosition = { x: 0, y: 0 };

export const useAiWindowStore = create<AiWindowState>((set) => ({
  isOpen: false,
  position: INITIAL_POSITION,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPosition: (x, y) => set({ position: { x, y } }),
}));
