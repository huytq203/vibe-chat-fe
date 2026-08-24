import type { CollabAwarenessEntry } from './awareness';
import { readCollabAwareness, subscribeCollabAwareness } from './awareness';
import type { CollabProvider } from './provider';

const CURSOR_MOVED_FIELD = 'cursorMovedAt';
const LABEL_VISIBLE_MS = 2_000;

interface CollabCursorUser {
  id?: string;
  name: string;
  color: string;
}

function awarenessUserId(entry: CollabAwarenessEntry): string | null {
  const user = entry.state.user;
  if (!user || typeof user !== 'object') return null;
  const id = Reflect.get(user, 'id');
  return typeof id === 'string' ? id : null;
}

function cursorMovedAt(entry: CollabAwarenessEntry): number | null {
  const value = entry.state[CURSOR_MOVED_FIELD];
  return typeof value === 'number' ? value : null;
}

function cursorElements(userId: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-collab-user-id]'),
  ).filter((element) => element.dataset.collabUserId === userId);
}

function activateLabels(
  userId: string,
  timers: Map<HTMLElement, ReturnType<typeof setTimeout>>,
): void {
  for (const element of cursorElements(userId)) {
    element.setAttribute('data-active', '');
    const timer = timers.get(element);
    if (timer) clearTimeout(timer);
    timers.set(element, setTimeout(() => {
      element.removeAttribute('data-active');
      timers.delete(element);
    }, LABEL_VISIBLE_MS));
  }
}

/** Báo một lần khi người dùng thật sự di chuyển con trỏ, không báo theo từng phím chữ. */
export function markLocalCollabCursorMoved(provider: CollabProvider): void {
  provider.awareness?.setLocalStateField(CURSOR_MOVED_FIELD, Date.now());
}

/** Điều khiển nhãn con trỏ từ tín hiệu di chuyển riêng, độc lập với cập nhật khi gõ. */
export function startCollabCursorLabels(provider: CollabProvider): () => void {
  let active = true;
  const previous = new Map<number, number>();
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  for (const entry of readCollabAwareness(provider)) {
    const movedAt = cursorMovedAt(entry);
    if (movedAt) previous.set(entry.clientId, movedAt);
  }
  const handleChange = (entries: CollabAwarenessEntry[]) => {
    for (const entry of entries) {
      const movedAt = cursorMovedAt(entry);
      const userId = awarenessUserId(entry);
      if (!movedAt || !userId || movedAt === previous.get(entry.clientId)) continue;
      previous.set(entry.clientId, movedAt);
      setTimeout(() => {
        if (active) activateLabels(userId, timers);
      }, 0);
    }
  };
  const unsubscribe = subscribeCollabAwareness(provider, handleChange);
  return () => {
    active = false;
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
  };
}

/** Tạo DOM con trỏ tương thích BlockNote nhưng để app tự điều khiển nhãn 2 giây. */
export function createCollabCursorElement(user: CollabCursorUser): HTMLElement {
  const root = document.createElement('span');
  const caret = document.createElement('span');
  const label = document.createElement('span');
  root.className = 'bn-collaboration-cursor__base';
  root.dataset.collabUserId = user.id ?? user.name;
  root.setAttribute('aria-hidden', 'true');
  caret.className = 'bn-collaboration-cursor__caret';
  caret.contentEditable = 'false';
  caret.style.backgroundColor = user.color;
  label.className = 'bn-collaboration-cursor__label motion-reduce:transition-none';
  label.style.backgroundColor = user.color;
  label.style.color = 'var(--background)';
  label.textContent = user.name;
  caret.append(label);
  root.append('\u2060', caret, '\u2060');
  return root;
}
