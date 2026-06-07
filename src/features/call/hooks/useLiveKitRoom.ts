'use client';

import { useCallback, useRef } from 'react';
import { Track, type LocalTrack, type RemoteTrack } from 'livekit-client';
import { joinRoom, leaveRoom, setCam, setMic } from '@/lib/livekit/room';
import type { CallType } from '@/features/call/types';

const VIDEO_CLASS = ['h-full', 'w-full', 'object-cover'];

/**
 * Quản lý LiveKit Room + gắn video track vào DOM qua CALLBACK REF.
 * Giữ track ở ref và re-attach mỗi khi container mount lại (đổi mini/normal/fullscreen)
 * → resize không làm mất hình.
 */
export function useLiveKitRoom() {
  const remoteTrackRef = useRef<RemoteTrack | null>(null);
  const localTrackRef = useRef<LocalTrack | null>(null);
  const remoteElRef = useRef<HTMLDivElement | null>(null);
  const localElRef = useRef<HTMLDivElement | null>(null);

  const mountRemote = useCallback(() => {
    const el = remoteElRef.current;
    const track = remoteTrackRef.current;
    if (!el) return;
    if (track) {
      const v = track.attach();
      v.classList.add(...VIDEO_CLASS);
      el.replaceChildren(v);
    } else {
      el.replaceChildren();
    }
  }, []);

  const mountLocal = useCallback(() => {
    const el = localElRef.current;
    const track = localTrackRef.current;
    if (!el) return;
    if (track) {
      const v = track.attach();
      v.classList.add(...VIDEO_CLASS);
      el.replaceChildren(v);
    } else {
      el.replaceChildren();
    }
  }, []);

  // Callback ref: chạy mỗi lần div mount/unmount → re-attach track hiện có.
  const setRemoteEl = useCallback(
    (node: HTMLDivElement | null) => {
      remoteElRef.current = node;
      if (node) mountRemote();
    },
    [mountRemote],
  );

  const setLocalEl = useCallback(
    (node: HTMLDivElement | null) => {
      localElRef.current = node;
      if (node) mountLocal();
    },
    [mountLocal],
  );

  const join = useCallback(
    async (url: string, token: string, type: CallType, onDisconnected: () => void) => {
      await joinRoom(
        url,
        token,
        { video: type === 'VIDEO' },
        {
          onRemoteTrack: (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Video) {
              remoteTrackRef.current = track;
              mountRemote();
            } else if (track.kind === Track.Kind.Audio) {
              track.attach(); // audio tự phát, không cần DOM hiển thị
            }
          },
          onRemoteTrackRemoved: (track: RemoteTrack) => {
            if (remoteTrackRef.current === track) {
              remoteTrackRef.current = null;
              mountRemote();
            }
          },
          onLocalVideo: (track: LocalTrack | null) => {
            localTrackRef.current = track;
            mountLocal();
          },
          onDisconnected,
        },
      );
    },
    [mountRemote, mountLocal],
  );

  const leave = useCallback(async () => {
    remoteTrackRef.current = null;
    localTrackRef.current = null;
    remoteElRef.current?.replaceChildren();
    localElRef.current?.replaceChildren();
    await leaveRoom();
  }, []);

  return { setRemoteEl, setLocalEl, join, leave, setMic, setCam };
}
