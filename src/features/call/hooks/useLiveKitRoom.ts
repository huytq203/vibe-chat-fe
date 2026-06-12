'use client';

import { useCallback, useRef, useState } from 'react';
import { Track, type LocalTrack, type RemoteTrack } from 'livekit-client';
import { joinRoom, leaveRoom, setCam, setMic } from '@/lib/livekit/room';
import type { CallType } from '@/features/call/types';

const VIDEO_CLASS = ['h-full', 'w-full', 'object-cover'];

type ElRef = (node: HTMLDivElement | null) => void;

/**
 * Quản lý LiveKit Room đa người (group không giới hạn) + gắn video track vào DOM qua CALLBACK REF.
 * - `remoteIds`: danh sách identity remote đang trong room (re-render lưới khi vào/ra).
 * - `getRemoteRef(id)`: callback ref ỔN ĐỊNH theo id → re-attach track khi ô mount lại (đổi mode/lưới).
 * Track giữ ở ref, audio tự attach (không cần DOM).
 */
export function useLiveKitRoom() {
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const videoTracks = useRef<Map<string, RemoteTrack>>(new Map());
  const remoteEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const remoteRefs = useRef<Map<string, ElRef>>(new Map());
  const localTrackRef = useRef<LocalTrack | null>(null);
  const localElRef = useRef<HTMLDivElement | null>(null);

  const mountRemote = useCallback((id: string) => {
    const el = remoteEls.current.get(id);
    if (!el) return;
    const track = videoTracks.current.get(id);
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
    if (!el) return;
    const track = localTrackRef.current;
    if (track) {
      const v = track.attach();
      v.classList.add(...VIDEO_CLASS);
      el.replaceChildren(v);
    } else {
      el.replaceChildren();
    }
  }, []);

  // Callback ref ổn định theo id: tránh tạo hàm mới mỗi render (sẽ detach/attach liên tục → nháy).
  const getRemoteRef = useCallback(
    (id: string): ElRef => {
      let cb = remoteRefs.current.get(id);
      if (!cb) {
        cb = (node: HTMLDivElement | null) => {
          if (node) {
            remoteEls.current.set(id, node);
            mountRemote(id);
          } else {
            remoteEls.current.delete(id);
          }
        };
        remoteRefs.current.set(id, cb);
      }
      return cb;
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

  const addRemoteId = useCallback((id: string) => {
    setRemoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeRemoteId = useCallback((id: string) => {
    videoTracks.current.delete(id);
    remoteEls.current.delete(id);
    remoteRefs.current.delete(id);
    setRemoteIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const join = useCallback(
    async (
      url: string,
      token: string,
      type: CallType,
      onDisconnected: () => void,
      onRemoteVideo?: () => void,
    ) => {
      await joinRoom(
        url,
        token,
        { video: type === 'VIDEO' },
        {
          onParticipantConnected: (id) => addRemoteId(id),
          onParticipantDisconnected: (id) => removeRemoteId(id),
          onRemoteTrack: (track, id) => {
            if (track.kind === Track.Kind.Video) {
              videoTracks.current.set(id, track);
              addRemoteId(id);
              mountRemote(id);
              onRemoteVideo?.(); // remote bật cam → nâng UI audio → video phía nhận
            } else if (track.kind === Track.Kind.Audio) {
              track.attach(); // audio tự phát, không cần DOM hiển thị
            }
          },
          onRemoteTrackRemoved: (track, id) => {
            if (videoTracks.current.get(id) === track) {
              videoTracks.current.delete(id);
              mountRemote(id);
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
    [addRemoteId, removeRemoteId, mountRemote, mountLocal],
  );

  const leave = useCallback(async () => {
    videoTracks.current.clear();
    remoteEls.current.forEach((el) => el.replaceChildren());
    remoteEls.current.clear();
    remoteRefs.current.clear();
    localTrackRef.current = null;
    localElRef.current?.replaceChildren();
    setRemoteIds([]);
    await leaveRoom();
  }, []);

  return { remoteIds, getRemoteRef, setLocalEl, join, leave, setMic, setCam };
}
