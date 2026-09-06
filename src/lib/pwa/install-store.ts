/**
 * Giữ sự kiện `beforeinstallprompt` ở module scope.
 *
 * Browser chỉ bắn sự kiện này một lần cho mỗi lần tải trang; nếu lưu trong state
 * của component thì mọi lần remount (đổi route, đổi layout) đều mất khả năng cài.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let promptEvent: BeforeInstallPromptEvent | null = null;
let isBound = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  promptEvent = event as BeforeInstallPromptEvent;
  emit();
}

function handleInstalled(): void {
  promptEvent = null;
  emit();
}

function bindOnce(): void {
  if (isBound || typeof window === 'undefined') return;
  isBound = true;
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleInstalled);
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  bindOnce();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return promptEvent;
}

/** SSR không có sự kiện nào — trả null để server và client render giống nhau. */
export function getServerInstallPrompt(): null {
  return null;
}

/** Mở hộp thoại cài của browser. Sự kiện chỉ dùng được đúng một lần. */
export async function runInstallPrompt(): Promise<void> {
  const event = promptEvent;
  if (!event) return;
  promptEvent = null;
  emit();
  await event.prompt();
  await event.userChoice;
}
