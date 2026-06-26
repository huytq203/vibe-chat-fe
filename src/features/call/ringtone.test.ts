import { afterEach, describe, expect, it, vi } from 'vitest';

const { playLoop, stopSound } = vi.hoisted(() => ({
  playLoop: vi.fn(),
  stopSound: vi.fn(),
}));
vi.mock('@/lib/sound/player', () => ({ playLoop, stopSound }));

import { startRingtone, stopRingtone } from './ringtone';

describe('call/ringtone', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('startRingtone("incoming") phát file chuông gọi đến', () => {
    startRingtone('incoming');
    expect(playLoop).toHaveBeenCalledWith('/sounds/call-incoming.wav');
  });

  it('startRingtone("outgoing") phát file ringback gọi đi', () => {
    startRingtone('outgoing');
    expect(playLoop).toHaveBeenCalledWith('/sounds/call-outgoing.wav');
  });

  it('stopRingtone dừng âm thanh', () => {
    stopRingtone();
    expect(stopSound).toHaveBeenCalled();
  });
});
