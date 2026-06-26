'use client';

import { useCallback } from 'react';
import {
  listDevices,
  sendChat,
  setBackgroundBlur,
  setRemoteMutedForMe,
  setScreenShare,
  switchDevice,
} from '@/lib/livekit/room';
import { useCallStore } from '@/features/call/stores/call.store';
import { logger } from '@/lib/logger';

/** Gom thao tác "pro" trong call (đều tác động lên Room singleton qua wrapper) + đồng bộ store. */
export function useCallPro() {
  const toggleScreen = useCallback(async () => {
    const next = !useCallStore.getState().screenOn;
    try {
      await setScreenShare(next);
      useCallStore.getState().setScreenOn(next);
    } catch (err) {
      logger.warn('Chia sẻ màn hình lỗi', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const toggleBlur = useCallback(async () => {
    const next = !useCallStore.getState().blurOn;
    try {
      await setBackgroundBlur(next);
      useCallStore.getState().setBlurOn(next);
    } catch (err) {
      logger.warn('Làm mờ nền lỗi', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const toggleMute = useCallback((identity: string) => {
    const muted = !useCallStore.getState().mutedForMe.includes(identity);
    setRemoteMutedForMe(identity, muted);
    useCallStore.getState().toggleMutedForMe(identity);
  }, []);

  const send = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    useCallStore.getState().addChat({
      id: `${Date.now()}-me-${t.length}`,
      from: 'me',
      text: t,
      mine: true,
    });
  }, []);

  return { toggleScreen, toggleBlur, toggleMute, send, listDevices, switchDevice };
}
