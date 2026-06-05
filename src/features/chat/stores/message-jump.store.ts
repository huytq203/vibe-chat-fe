'use client';

import { create } from 'zustand';

export type JumpTarget = { id: string; createdAt: string };

/**
 * Cầu nối "nhảy tới tin nhắn" giữa panel ngoài (vd kết quả tìm kiếm trong ContactInfo)
 * và MessageList. Panel set `target`; MessageList nạp dần trang cũ tới khi tin có trong
 * khung rồi cuộn + nháy sáng, sau đó clear. `createdAt` để biết khi nào ngừng nạp.
 */
type MessageJumpState = {
  target: JumpTarget | null;
  requestJump: (target: JumpTarget) => void;
  clear: () => void;
};

export const useMessageJumpStore = create<MessageJumpState>((set) => ({
  target: null,
  requestJump: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
