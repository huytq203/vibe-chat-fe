/* eslint-disable no-undef */
// Firebase messaging service worker — chạy ở browser background, không có
// access tới NEXT_PUBLIC_* env, nên config được truyền qua query string khi
// register (xem src/lib/firebase/messaging.ts).

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Vibe Chat';
    const body = payload.notification?.body || '';
    const data = payload.data || {};
    const link = payload.fcmOptions?.link || data.click_action || '/chat';

    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: { ...data, link },
      tag: data.conversationId || data.notificationId,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/chat';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ('focus' in c) {
            c.focus();
            c.postMessage({ type: 'NOTIFICATION_CLICK', link });
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(link);
      }),
  );
});
