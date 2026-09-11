import { afterEach, describe, expect, it, vi } from 'vitest';

import { cursorColorFor } from '@/features/notes/lib/cursor-colors';

import { createCollabCursorElement, startCollabCursorLabels } from './cursor-labels';
import type { CollabProvider } from './provider';

function buildProvider() {
  const states = new Map<number, Record<string, unknown>>([[2, {
    user: { id: 'user-remote', name: 'Bạn cộng tác' },
  }]]);
  let changeListener: (() => void) | null = null;
  const awareness = {
    clientID: 1,
    getStates: () => states,
    off: vi.fn(),
    on: vi.fn((_event: string, listener: () => void) => { changeListener = listener; }),
    setLocalStateField: vi.fn(),
  };
  return {
    emitChange: () => changeListener?.(),
    provider: { awareness } as unknown as CollabProvider,
    states,
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('nhãn cạnh con trỏ cộng tác', () => {
  it('hiện hai giây sau tín hiệu di chuyển rồi ẩn', () => {
    vi.useFakeTimers();
    const { emitChange, provider, states } = buildProvider();
    const cursor = createCollabCursorElement({
      id: 'user-remote',
      name: 'Bạn cộng tác',
      color: cursorColorFor('user-remote'),
    });
    document.body.append(cursor);
    const stop = startCollabCursorLabels(provider);

    expect(cursor).toHaveClass('notes-collaboration-cursor__base');
    expect(cursor.querySelector('.notes-collaboration-cursor__caret')).toBeInTheDocument();
    expect(cursor.querySelector('.notes-collaboration-cursor__label')).toHaveTextContent(
      'Bạn cộng tác',
    );

    states.set(2, {
      user: { id: 'user-remote', name: 'Bạn cộng tác' },
      cursorMovedAt: 1,
    });
    emitChange();
    vi.advanceTimersByTime(0);
    expect(cursor).toHaveAttribute('data-active');
    vi.advanceTimersByTime(2_000);
    expect(cursor).not.toHaveAttribute('data-active');
    stop();
  });

  it('không hiện lại khi awareness đổi mà con trỏ không di chuyển', () => {
    vi.useFakeTimers();
    const { emitChange, provider, states } = buildProvider();
    const cursor = createCollabCursorElement({
      id: 'user-remote',
      name: 'Bạn cộng tác',
      color: cursorColorFor('user-remote'),
    });
    document.body.append(cursor);
    const stop = startCollabCursorLabels(provider);

    states.set(2, {
      user: { id: 'user-remote', name: 'Bạn cộng tác' },
      cursorMovedAt: 1,
    });
    emitChange();
    vi.advanceTimersByTime(2_000);
    emitChange();
    vi.advanceTimersByTime(0);
    expect(cursor).not.toHaveAttribute('data-active');
    stop();
  });
});
