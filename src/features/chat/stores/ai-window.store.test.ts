import { beforeEach, describe, expect, it } from 'vitest';
import { useAiWindowStore } from './ai-window.store';

describe('ai-window.store', () => {
  beforeEach(() => useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } }));

  it('starts closed at origin', () => {
    const s = useAiWindowStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.position).toEqual({ x: 0, y: 0 });
  });

  it('open sets isOpen to true', () => {
    useAiWindowStore.getState().open();
    expect(useAiWindowStore.getState().isOpen).toBe(true);
  });

  it('close sets isOpen to false', () => {
    useAiWindowStore.getState().open();
    useAiWindowStore.getState().close();
    expect(useAiWindowStore.getState().isOpen).toBe(false);
  });

  it('setPosition updates position', () => {
    useAiWindowStore.getState().setPosition(15, 25);
    expect(useAiWindowStore.getState().position).toEqual({ x: 15, y: 25 });
  });
});
