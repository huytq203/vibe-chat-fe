import { create } from 'zustand';

type ConvLockState = {
  unlockedIds: Set<string>;
  isUnlocked: (convId: string) => boolean;
  markUnlocked: (convId: string) => void;
  /** Khoá lại 1 conv (gỡ khỏi unlocked) — gọi khi rời conversation để lần sau phải nhập lại. */
  relock: (convId: string) => void;
  clearAll: () => void;
};

export const useConvLockStore = create<ConvLockState>()((set, get) => ({
  unlockedIds: new Set<string>(),

  isUnlocked: (convId) => get().unlockedIds.has(convId),

  markUnlocked: (convId) =>
    set((s) => {
      if (s.unlockedIds.has(convId)) return s;
      const next = new Set(s.unlockedIds);
      next.add(convId);
      return { unlockedIds: next };
    }),

  relock: (convId) =>
    set((s) => {
      if (!s.unlockedIds.has(convId)) return s;
      const next = new Set(s.unlockedIds);
      next.delete(convId);
      return { unlockedIds: next };
    }),

  clearAll: () => set({ unlockedIds: new Set<string>() }),
}));
