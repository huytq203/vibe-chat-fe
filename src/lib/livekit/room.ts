import {
  ConnectionQuality,
  type LocalVideoTrack,
  type Participant,
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type LocalTrack,
  type RemoteTrack,
} from 'livekit-client';
import { logger } from '@/lib/logger';

/** Chất lượng kết nối quy về nhãn ngắn cho UI (không leak enum livekit ra feature). */
export type QualityLevel = 'excellent' | 'good' | 'poor' | 'unknown';
const CHAT_TOPIC = 'call-chat';
const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

function mapQuality(q: ConnectionQuality): QualityLevel {
  if (q === ConnectionQuality.Excellent) return 'excellent';
  if (q === ConnectionQuality.Good) return 'good';
  if (q === ConnectionQuality.Poor) return 'poor';
  return 'unknown';
}

/**
 * Wrapper livekit-client — feature code không import 'livekit-client' trực tiếp (CLAUDE.md §7).
 * Giữ Room singleton (1 cuộc gọi / tab). Token/url lấy từ ack call:initiate|accept.
 */

type TrackHandlers = {
  onRemoteTrack?: (track: RemoteTrack, identity: string) => void;
  onRemoteTrackRemoved?: (track: RemoteTrack, identity: string) => void;
  /** Người vào room (kể cả audio-only chưa publish video) → tạo ô trong lưới. */
  onParticipantConnected?: (identity: string) => void;
  /** Người rời room → gỡ ô khỏi lưới. */
  onParticipantDisconnected?: (identity: string) => void;
  onLocalVideo?: (track: LocalTrack | null) => void;
  onDisconnected?: () => void;
  /** Danh sách identity đang nói (active speaker) — viền sáng ô đang nói. */
  onActiveSpeakers?: (identities: string[]) => void;
  /** Chất lượng kết nối từng participant → icon sóng. */
  onConnectionQuality?: (identity: string, quality: QualityLevel) => void;
  /** Tin nhắn chat trong call (ephemeral) nhận qua data channel. */
  onChat?: (from: string, text: string) => void;
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
  // dynacast bật: group đông người → cho phép SFU tắt layer không ai xem, tiết kiệm băng thông.
  const r = new Room({ adaptiveStream: false, dynacast: true });
  room = r;

  r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    logger.info('[call] remote track subscribed', {
      kind: track.kind,
      participant: participant.identity,
    });
    handlers.onRemoteTrack?.(track, participant.identity);
  });
  r.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) =>
    handlers.onRemoteTrackRemoved?.(track, participant.identity),
  );
  r.on(RoomEvent.ParticipantConnected, (p) => {
    logger.info('[call] participant connected', { participant: p.identity });
    handlers.onParticipantConnected?.(p.identity);
  });
  r.on(RoomEvent.ParticipantDisconnected, (p) =>
    handlers.onParticipantDisconnected?.(p.identity),
  );
  r.on(RoomEvent.Disconnected, () => handlers.onDisconnected?.());

  r.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
    handlers.onActiveSpeakers?.(speakers.map((p) => p.identity)),
  );
  r.on(RoomEvent.ConnectionQualityChanged, (q, participant) =>
    handlers.onConnectionQuality?.(participant.identity, mapQuality(q)),
  );
  r.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
    if (topic !== CHAT_TOPIC || !decoder) return;
    handlers.onChat?.(participant?.identity ?? '', decoder.decode(payload));
  });

  // Bật/tắt camera giữa cuộc gọi (nâng audio → video) tạo/gỡ local video track ngoài lúc join
  // → đồng bộ PiP local qua chính các sự kiện này thay vì chỉ mount 1 lần lúc join.
  // Chỉ camera mới mount vào PiP local; screen share là source riêng (không chiếm chỗ camera).
  r.on(RoomEvent.LocalTrackPublished, (pub) => {
    if (pub.track?.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
      handlers.onLocalVideo?.(pub.track as LocalTrack);
    }
  });
  r.on(RoomEvent.LocalTrackUnpublished, (pub) => {
    if (pub.track?.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
      handlers.onLocalVideo?.(null);
    }
  });

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
    handlers.onParticipantConnected?.(p.identity);
    p.trackPublications.forEach((pub) => {
      logger.info('[call] existing remote publication', {
        participant: p.identity,
        kind: pub.kind,
        subscribed: pub.isSubscribed,
        hasTrack: Boolean(pub.track),
      });
      if (pub.track) handlers.onRemoteTrack?.(pub.track, p.identity);
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

/** Bật/tắt chia sẻ màn hình (publish/unpublish screen track). */
export async function setScreenShare(enabled: boolean): Promise<void> {
  await room?.localParticipant.setScreenShareEnabled(enabled);
}

/** Bật/tắt làm mờ nền cho camera (MediaPipe qua @livekit/track-processors). */
export async function setBackgroundBlur(enabled: boolean): Promise<void> {
  const pub = room?.localParticipant.getTrackPublication(Track.Source.Camera);
  const track = pub?.videoTrack as LocalVideoTrack | undefined;
  if (!track) return;
  if (!enabled) {
    await track.stopProcessor();
    return;
  }
  const { BackgroundBlur, supportsBackgroundProcessors } = await import(
    '@livekit/track-processors'
  );
  if (!supportsBackgroundProcessors()) {
    logger.warn('Trình duyệt không hỗ trợ background blur');
    return;
  }
  await track.setProcessor(BackgroundBlur(10));
}

/** Liệt kê thiết bị theo loại (audioinput/videoinput/audiooutput). */
export async function listDevices(kind: MediaDeviceKind): Promise<MediaDeviceInfo[]> {
  return Room.getLocalDevices(kind);
}

/** Đổi thiết bị đang dùng (mic/cam/loa). */
export async function switchDevice(
  kind: MediaDeviceKind,
  deviceId: string,
): Promise<void> {
  await room?.switchActiveDevice(kind, deviceId);
}

/** "Mute cho riêng tôi": unsubscribe/subscribe track của 1 remote (không force-mute server). */
export function setRemoteMutedForMe(identity: string, muted: boolean): void {
  const p = room?.remoteParticipants.get(identity);
  if (!p) return;
  p.trackPublications.forEach((pub) => pub.setSubscribed(!muted));
}

/** Gửi tin nhắn chat ephemeral trong call qua data channel (reliable). */
export function sendChat(text: string): void {
  if (!room || !encoder) return;
  void room.localParticipant.publishData(encoder.encode(text), {
    reliable: true,
    topic: CHAT_TOPIC,
  });
}
