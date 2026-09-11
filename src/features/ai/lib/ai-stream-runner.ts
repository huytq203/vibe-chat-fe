import type { AiMessage } from '@/features/ai/types';

export type AiStreamStatus = 'streaming' | 'idle';

export interface AiStreamSnapshot {
  text: string;
  status: AiStreamStatus;
  error?: string;
  pendingUser?: AiMessage;
}

export interface AiStreamResult {
  text: string;
  status: 'done' | 'aborted' | 'error';
  error?: unknown;
}

interface StartStreamOptions {
  pendingUser?: AiMessage;
  run: (onDelta: (text: string) => void, signal: AbortSignal) => Promise<string>;
  onFinish: (result: AiStreamResult) => void;
}

interface StreamEntry {
  controller: AbortController;
  text: string;
  status: AiStreamStatus;
  error?: string;
  pendingUser?: AiMessage;
  subscribers: Set<() => void>;
  snapshot: AiStreamSnapshot;
  frameId: number | null;
}

const EMPTY_SNAPSHOT: AiStreamSnapshot = { text: '', status: 'idle' };
const registry = new Map<string, StreamEntry>();

function createEntry(subscribers = new Set<() => void>()): StreamEntry {
  return {
    controller: new AbortController(),
    text: '',
    status: 'idle',
    subscribers,
    snapshot: EMPTY_SNAPSHOT,
    frameId: null,
  };
}

function getOrCreateEntry(key: string): StreamEntry {
  const current = registry.get(key);
  if (current) return current;
  const entry = createEntry();
  registry.set(key, entry);
  return entry;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

function publish(key: string, entry: StreamEntry): void {
  if (registry.get(key) !== entry) return;
  entry.snapshot = {
    text: entry.text,
    status: entry.status,
    ...(entry.error ? { error: entry.error } : {}),
    ...(entry.pendingUser ? { pendingUser: entry.pendingUser } : {}),
  };
  entry.subscribers.forEach((subscriber) => subscriber());
}

function cancelPendingFrame(entry: StreamEntry): void {
  if (entry.frameId === null) return;
  cancelAnimationFrame(entry.frameId);
  entry.frameId = null;
}

// Token về dày hơn nhịp vẽ nên chỉ phát snapshot mới một lần trong mỗi frame.
function schedulePublish(key: string, entry: StreamEntry): void {
  if (entry.frameId !== null) return;
  entry.frameId = requestAnimationFrame(() => {
    entry.frameId = null;
    publish(key, entry);
  });
}

function replaceEntry(key: string, pendingUser?: AiMessage): StreamEntry {
  const previous = registry.get(key);
  if (previous?.status === 'streaming') previous.controller.abort();
  if (previous) cancelPendingFrame(previous);
  const entry = createEntry(previous?.subscribers);
  entry.status = 'streaming';
  entry.pendingUser = pendingUser;
  registry.set(key, entry);
  publish(key, entry);
  return entry;
}

function finishEntry(key: string, entry: StreamEntry, result: AiStreamResult): void {
  cancelPendingFrame(entry);
  entry.status = 'idle';
  entry.error = result.status === 'error' ? errorMessage(result.error) : undefined;
  entry.pendingUser = undefined;
  publish(key, entry);
}

export async function startStream(key: string, options: StartStreamOptions): Promise<void> {
  const entry = replaceEntry(key, options.pendingUser);
  let result: AiStreamResult = { text: '', status: 'done' };

  try {
    const completedText = await options.run((text) => {
      entry.text += text;
      schedulePublish(key, entry);
    }, entry.controller.signal);
    if (!entry.controller.signal.aborted) entry.text = completedText;
    result = {
      text: entry.text,
      status: entry.controller.signal.aborted ? 'aborted' : 'done',
    };
  } catch (error) {
    result = {
      text: entry.text,
      status: entry.controller.signal.aborted ? 'aborted' : 'error',
      ...(entry.controller.signal.aborted ? {} : { error }),
    };
  } finally {
    try {
      finishEntry(key, entry, result);
    } finally {
      options.onFinish(result);
    }
  }
}

export function stopStream(key: string): void {
  const entry = registry.get(key);
  if (entry?.status === 'streaming') entry.controller.abort();
}

export function getSnapshot(key: string): AiStreamSnapshot {
  return registry.get(key)?.snapshot ?? EMPTY_SNAPSHOT;
}

export function subscribe(key: string, callback: () => void): () => void {
  const entry = getOrCreateEntry(key);
  entry.subscribers.add(callback);
  return () => entry.subscribers.delete(callback);
}

export function clearStream(key: string): void {
  const entry = registry.get(key);
  if (!entry) return;
  registry.delete(key);
  cancelPendingFrame(entry);
  entry.controller.abort();
  entry.subscribers.forEach((subscriber) => subscriber());
  entry.subscribers.clear();
}
