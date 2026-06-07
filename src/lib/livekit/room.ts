import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type LocalTrack,
  type RemoteTrack,
} from 'livekit-client';
import { logger } from '@/lib/logger';

/**
 * Wrapper livekit-client — feature code không import 'livekit-client' trực tiếp (CLAUDE.md §7).
 * Giữ Room singleton (1 cuộc gọi / tab). Token/url lấy từ ack call:initiate|accept.
 */

type TrackHandlers = {
  onRemoteTrack?: (track: RemoteTrack) => void;
  onRemoteTrackRemoved?: (track: RemoteTrack) => void;
  onLocalVideo?: (track: LocalTrack | null) => void;
  onDisconnected?: () => void;
};

let room: Room | null = null;

export function getRoom(): Room | null {
  return room;
}

export async function joinRoom(
  url: string,
  token: string,
  opts: { video: boolean },
  handlers: TrackHandlers,
): Promise<Room> {
  await leaveRoom();
  // adaptiveStream tắt: trong portal/fixed overlay, IntersectionObserver của adaptiveStream
  // dễ nhận nhầm element "không hiển thị" → pause video remote → màn đen. Tắt để luôn nhận stream.
  // dynacast tắt: 1-1 không cần simulcast layer selection.
  const r = new Room({ adaptiveStream: false, dynacast: false });
  room = r;

  r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    logger.info('[call] remote track subscribed', {
      kind: track.kind,
      participant: participant.identity,
    });
    handlers.onRemoteTrack?.(track);
  });
  r.on(RoomEvent.TrackUnsubscribed, (track) => handlers.onRemoteTrackRemoved?.(track));
  r.on(RoomEvent.ParticipantConnected, (p) =>
    logger.info('[call] participant connected', { participant: p.identity }),
  );
  r.on(RoomEvent.Disconnected, () => handlers.onDisconnected?.());

  // Chạy SONG SONG getUserMedia (xin mic/cam) và connect SFU để giảm độ trễ.
  // allSettled để dù 1 bên fail vẫn dọn dẹp bên kia đúng cách.
  const [mediaRes, connRes] = await Promise.allSettled([
    createLocalTracks({ audio: true, video: opts.video }),
    r.connect(url, token),
  ]);

  if (mediaRes.status === 'rejected') {
    const err = mediaRes.reason;
    logger.error('LiveKit getUserMedia failed', {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : undefined,
      hasMediaDevices:
        typeof navigator !== 'undefined' ? Boolean(navigator.mediaDevices) : undefined,
    });
    if (connRes.status === 'fulfilled') await r.disconnect();
    room = null;
    throw err;
  }

  const tracks = mediaRes.value;

  if (connRes.status === 'rejected') {
    const err = connRes.reason;
    logger.error('LiveKit connect failed', {
      url,
      message: err instanceof Error ? err.message : String(err),
    });
    for (const t of tracks) t.stop();
    room = null;
    throw err;
  }

  for (const t of tracks) await r.localParticipant.publishTrack(t);
  const cam = tracks.find((t) => t.kind === Track.Kind.Video) ?? null;
  handlers.onLocalVideo?.(cam);

  logger.info('LiveKit joined', {
    room: r.name,
    remoteCount: r.remoteParticipants.size,
  });

  // Participant đã ở trong room TRƯỚC khi ta join → subscribe lại track đang publish của họ
  // (đảm bảo hiện video dù sự kiện TrackSubscribed đến sớm/đã qua).
  r.remoteParticipants.forEach((p) => {
    p.trackPublications.forEach((pub) => {
      logger.info('[call] existing remote publication', {
        participant: p.identity,
        kind: pub.kind,
        subscribed: pub.isSubscribed,
        hasTrack: Boolean(pub.track),
      });
      if (pub.track) handlers.onRemoteTrack?.(pub.track);
    });
  });

  return r;
}

export async function leaveRoom(): Promise<void> {
  if (!room) return;
  try {
    await room.disconnect();
  } catch (err) {
    logger.warn('LiveKit disconnect error', { err: String(err) });
  }
  room = null;
}

export async function setMic(enabled: boolean): Promise<void> {
  await room?.localParticipant.setMicrophoneEnabled(enabled);
}

export async function setCam(enabled: boolean): Promise<void> {
  await room?.localParticipant.setCameraEnabled(enabled);
}
