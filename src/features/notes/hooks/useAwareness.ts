'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '@/features/auth';
import { cursorColorFor } from '@/features/notes/lib/cursor-colors';
import {
  readCollabAwareness,
  setLocalCollabUser,
  subscribeCollabAwareness,
  type CollabAwarenessEntry,
  type CollabProvider,
} from '@/lib/collab';

export interface CollabPerson {
  userId: string;
  name: string;
  color: string;
  isSelf: boolean;
}

type AwarenessSnapshot = { owner: CollabProvider | null; entries: CollabAwarenessEntry[] };
/**
 * Chữ ký của danh sách người đang xem — CHỈ gồm thứ quyết định `CollabPerson`.
 *
 * Awareness bắn 'change' cho MỌI field, kể cả `cursorMovedAt` mà chính ta ghi ở mỗi
 * `pointerup`. Nếu cứ thế `setSnapshot` object mới thì React re-render cả cây editor
 * ngay giữa `pointerup` và `mouseup`, menu nổi của editor bị dựng lại, `mouseup`
 * rơi sang node khác nên trình duyệt KHÔNG sinh `click` — bảng màu bấm chuột không ăn
 * còn bàn phím vẫn chạy. Đã đo trên trình duyệt: mousedown vào `.mantine-Menu-itemLabel`
 * nhưng mouseup vào `.mantine-Menu-dropdown`, cách nhau 45ms và 45 mutation.
 * Nhãn con trỏ KHÔNG bị ảnh hưởng: `startCollabCursorLabels` nghe awareness trực tiếp,
 * không đi qua React.
 */
function peopleSignature(entries: CollabAwarenessEntry[]): string {
  return entries
    .map((entry) => {
      const value = entry.state.user;
      if (!value || typeof value !== 'object') return `${entry.clientId}:-`;
      return `${entry.clientId}:${Reflect.get(value, 'id')}:${Reflect.get(value, 'name')}`;
    })
    .sort()
    .join('|');
}

function personFromEntry(entry: CollabAwarenessEntry): CollabPerson | null {
  const value = entry.state.user;
  if (!value || typeof value !== 'object') return null;
  const userId = Reflect.get(value, 'id');
  const name = Reflect.get(value, 'name');
  if (typeof userId !== 'string' || typeof name !== 'string') return null;
  return {
    userId,
    name: name.trim() || 'Người dùng Halo',
    color: cursorColorFor(userId),
    isSelf: entry.isSelf,
  };
}

function mergePeople(
  self: CollabPerson,
  entries: CollabAwarenessEntry[],
): CollabPerson[] {
  const people = new Map<string, CollabPerson>([[self.userId, self]]);
  for (const entry of entries) {
    const person = personFromEntry(entry);
    if (!person) continue;
    if (person.userId === self.userId) { people.set(self.userId, self); continue; }
    const isSelf = person.userId === self.userId || person.isSelf;
    people.set(person.userId, { ...person, isSelf });
  }
  return Array.from(people.values()).sort((left, right) => {
    if (left.isSelf !== right.isSelf) return left.isSelf ? -1 : 1;
    return left.userId.localeCompare(right.userId);
  });
}

/** Đồng bộ awareness và trả danh sách người đang xem, gồm cả chính mình. */
export function useAwareness(provider: CollabProvider | null): CollabPerson[] {
  const authUser = useAuthStore((state) => state.user);
  const [snapshot, setSnapshot] = useState<AwarenessSnapshot>({ owner: null, entries: [] });
  const userId = authUser?.id ?? 'anonymous';
  const name = authUser?.displayName?.trim() || authUser?.username || 'Người dùng Halo';
  const self = useMemo<CollabPerson>(() => ({
    userId, name, color: cursorColorFor(userId), isSelf: true,
  }), [name, userId]);
  useEffect(() => {
    if (!provider) return;
    let active = true;
    const update = (nextEntries: CollabAwarenessEntry[]) => {
      if (!active) return;
      setSnapshot((prev) => (
        prev.owner === provider
          && peopleSignature(prev.entries) === peopleSignature(nextEntries)
          ? prev
          : { owner: provider, entries: nextEntries }
      ));
    };
    setLocalCollabUser(provider, { id: self.userId, name: self.name, color: self.color });
    queueMicrotask(() => update(readCollabAwareness(provider)));
    const unsubscribe = subscribeCollabAwareness(provider, update);
    return () => { active = false; unsubscribe(); };
  }, [provider, self]);

  return useMemo(() => mergePeople(
    self, snapshot.owner === provider ? snapshot.entries : [],
  ), [provider, self, snapshot]);
}
