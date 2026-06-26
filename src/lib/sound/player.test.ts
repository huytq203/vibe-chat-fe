import { afterEach, describe, expect, it, vi } from 'vitest';
import { playLoop, stopSound } from './player';

class FakeAudio {
  loop = false;
  currentTime = 0;
  src: string;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
  }
}

describe('sound/player', () => {
  afterEach(() => {
    stopSound();
    vi.unstubAllGlobals();
  });

  it('playLoop tạo audio loop và gọi play với src', () => {
    const instances: FakeAudio[] = [];
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(src: string) {
        super(src);
        instances.push(this);
      }
    });

    playLoop('/sounds/call-incoming.wav');

    expect(instances).toHaveLength(1);
    expect(instances[0].src).toBe('/sounds/call-incoming.wav');
    expect(instances[0].loop).toBe(true);
    expect(instances[0].play).toHaveBeenCalledOnce();
  });

  it('playLoop lần 2 dừng nguồn cũ trước khi phát nguồn mới', () => {
    const instances: FakeAudio[] = [];
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(src: string) {
        super(src);
        instances.push(this);
      }
    });

    playLoop('/sounds/a.wav');
    playLoop('/sounds/b.wav');

    expect(instances).toHaveLength(2);
    expect(instances[0].pause).toHaveBeenCalledOnce();
    expect(instances[1].play).toHaveBeenCalledOnce();
  });

  it('stopSound dừng nguồn đang phát', () => {
    const instances: FakeAudio[] = [];
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(src: string) {
        super(src);
        instances.push(this);
      }
    });

    playLoop('/sounds/a.wav');
    stopSound();

    expect(instances[0].pause).toHaveBeenCalledOnce();
  });
});
