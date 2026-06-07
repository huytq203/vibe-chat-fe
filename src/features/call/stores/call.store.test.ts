import { beforeEach, describe, expect, it } from 'vitest';
import { useCallStore } from './call.store';
import type { CallPeer } from '@/features/call/types';

const peer: CallPeer = { id: 'u2', name: 'Bob', avatarUrl: null };

describe('call.store state machine', () => {
  beforeEach(() => useCallStore.getState().reset());

  it('starts idle', () => {
    expect(useCallStore.getState().phase).toBe('idle');
  });

  it('startOutgoing → outgoing with call data', () => {
    useCallStore.getState().startOutgoing('c1', 'VIDEO', peer);
    const s = useCallStore.getState();
    expect(s.phase).toBe('outgoing');
    expect(s.call?.conversationId).toBe('c1');
    expect(s.call?.type).toBe('VIDEO');
  });

  it('receiveIncoming → incoming', () => {
    useCallStore.getState().receiveIncoming('call1', 'c1', 'AUDIO', peer);
    expect(useCallStore.getState().phase).toBe('incoming');
    expect(useCallStore.getState().call?.callId).toBe('call1');
  });

  it('markOngoing sets startedAt', () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer);
    useCallStore.getState().markOngoing('call1', 1000);
    const s = useCallStore.getState();
    expect(s.phase).toBe('ongoing');
    expect(s.startedAt).toBe(1000);
    expect(s.call?.callId).toBe('call1');
  });

  it('reset returns to idle', () => {
    useCallStore.getState().startOutgoing('c1', 'AUDIO', peer);
    useCallStore.getState().reset();
    expect(useCallStore.getState().phase).toBe('idle');
    expect(useCallStore.getState().call).toBeNull();
  });

  it('setWindowMode and setPosition update window', () => {
    useCallStore.getState().setWindowMode('mini');
    useCallStore.getState().setPosition(10, 20);
    expect(useCallStore.getState().window).toEqual({ mode: 'mini', x: 10, y: 20 });
  });
});
