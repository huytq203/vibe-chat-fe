import type { CollabProvider } from './provider';

export interface CollabAwarenessEntry {
  clientId: number;
  isSelf: boolean;
  state: Record<string, unknown>;
}

export interface CollabAwarenessUser {
  id: string;
  name: string;
  color: string;
}

export function readCollabAwareness(
  provider: CollabProvider | null,
): CollabAwarenessEntry[] {
  const awareness = provider?.awareness;
  if (!awareness) return [];
  return Array.from(awareness.getStates(), ([clientId, state]) => ({
    clientId,
    isSelf: clientId === awareness.clientID,
    state: state as Record<string, unknown>,
  }));
}

export function setLocalCollabUser(
  provider: CollabProvider,
  user: CollabAwarenessUser,
): void {
  provider.awareness?.setLocalStateField('user', user);
}

export function subscribeCollabAwareness(
  provider: CollabProvider,
  listener: (entries: CollabAwarenessEntry[]) => void,
): () => void {
  const awareness = provider.awareness;
  if (!awareness) return () => undefined;
  const handleChange = () => listener(readCollabAwareness(provider));
  awareness.on('change', handleChange);
  return () => awareness.off('change', handleChange);
}
