'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingsState = {
  /**
   * Mã PIN mặc định để khoá nhanh hội thoại — lưu trên THIẾT BỊ NÀY (localStorage,
   * plaintext). Chỉ là tiện lợi cho tính năng ẩn hội thoại, KHÔNG phải mã hoá.
   * null = chưa đặt → khoá hội thoại sẽ hỏi mật khẩu như cũ.
   */
  lockPin: string | null;
  setLockPin: (pin: string) => void;
  clearLockPin: () => void;
  /** Bật/tắt nhận thông báo đẩy trên thiết bị này. */
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lockPin: null,
      setLockPin: (pin) => set({ lockPin: pin }),
      clearLockPin: () => set({ lockPin: null }),
      pushEnabled: true,
      setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
    }),
    { name: 'vibe-settings' },
  ),
);
