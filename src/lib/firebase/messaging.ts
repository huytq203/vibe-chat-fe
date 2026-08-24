import type { FirebaseApp } from 'firebase/app';
import type { Messaging, MessagePayload } from 'firebase/messaging';
import { env, isFirebaseConfigured } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Wrapper Firebase Cloud Messaging — feature code KHÔNG import 'firebase/*' trực tiếp.
 * Lazy load để không kéo SDK vào bundle khi user chưa login.
 */

let appPromise: Promise<FirebaseApp | null> | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

const FCM_SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';
const FCM_SERVICE_WORKER_SCOPE = '/firebase-cloud-messaging-push-scope';

function browserSupportsPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

async function getApp(): Promise<FirebaseApp | null> {
  if (!browserSupportsPush() || !isFirebaseConfigured()) return null;
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    if (getApps().length > 0) return getApp();
    return initializeApp({
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  })();
  return appPromise;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;
  messagingPromise = (async () => {
    const app = await getApp();
    if (!app) return null;
    const { getMessaging, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) {
      logger.info('FCM not supported in this browser');
      return null;
    }
    return getMessaging(app);
  })();
  return messagingPromise;
}

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export async function requestPushPermission(): Promise<PermissionState> {
  if (!browserSupportsPush()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  // Truyền config FCM qua query string để SW (static file) tự initializeApp.
  const params = new URLSearchParams({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_SENDER_ID ?? '',
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  });
  const url = `${FCM_SERVICE_WORKER_PATH}?${params.toString()}`;
  const expectedScope = new URL(FCM_SERVICE_WORKER_SCOPE, window.location.origin).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find((registration) => {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    if (!worker || registration.scope !== expectedScope) return false;

    return new URL(worker.scriptURL).pathname === FCM_SERVICE_WORKER_PATH;
  });

  if (existing) return existing;

  // File nằm ở root nên nếu bỏ `scope`, browser vẫn mặc định dùng `/` và tiếp tục
  // tranh registration với PWA worker. FCM cần một scope riêng, không cần control trang.
  return navigator.serviceWorker.register(url, { scope: FCM_SERVICE_WORKER_SCOPE });
}

export async function getFcmToken(): Promise<string | null> {
  if (!browserSupportsPush()) return null;
  if (Notification.permission !== 'granted') return null;
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  const vapidKey = env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;
  const reg = await ensureServiceWorker();
  if (!reg) return null;
  try {
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    return token || null;
  } catch (err) {
    console.error('[FCM] getToken threw:', err);
    logger.warn('getFcmToken failed', { err: String(err) });
    return null;
  }
}

export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, handler);
}
