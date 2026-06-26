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

function callTag(callId) {
  return 'call-' + callId;
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const link = payload.fcmOptions?.link || data.click_action || '/chat';

    // Cuộc gọi bị huỷ/kết thúc trước khi bắt máy → đóng notification cuộc gọi đến còn treo.
    if (data.type === 'CALL_CANCELLED' || data.kind === 'CALL_CANCELLED') {
      return self.registration
        .getNotifications({ tag: callTag(data.callId) })
        .then((list) => list.forEach((n) => n.close()));
    }

    // Cuộc gọi ĐẾN → notification giàu: avatar người gọi + nút Trả lời/Từ chối, giữ tới khi tương tác.
    if (data.type === 'CALL_INCOMING' || data.kind === 'CALL_INCOMING') {
      const isVideo = data.callType === 'VIDEO';
      return self.registration.showNotification(data.callerName || 'Cuộc gọi đến', {
        body: isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi đến',
        icon: data.callerAvatar || '/icon-192.png',
        badge: '/badge.png',
        tag: callTag(data.callId),
        requireInteraction: true,
        data: { ...data, link },
        actions: [
          { action: 'accept', title: 'Trả lời' },
          { action: 'decline', title: 'Từ chối' },
        ],
      });
    }

    const title = payload.notification?.title || 'Halo';
    const body = payload.notification?.body || '';
    return self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: { ...data, link },
      // Group cùng conversation → ghi đè noti cũ. Push BULK (group chat) không có
      // notificationId — fallback theo type. Xem 11-push-fcm.md §11.3.
      tag: data.conversationId || data.notificationId || data.type,
    });
  });
}

// Focus tab đang mở (hoặc mở mới) rồi gửi message cho app xử lý (route / accept / decline).
function focusAndPost(link, message) {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.focus();
          c.postMessage(message);
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
      return undefined;
    });
}

self.addEventListener('notificationclick', (event) => {
  const data = (event.notification && event.notification.data) || {};
  const link = data.link || '/chat';
  event.notification.close();

  // Cuộc gọi đến: nút Trả lời/Từ chối (hoặc click thân = trả lời) → báo app.
  if (data.type === 'CALL_INCOMING' || data.kind === 'CALL_INCOMING') {
    const type = event.action === 'decline' ? 'CALL_DECLINE' : 'CALL_ACCEPT';
    event.waitUntil(focusAndPost(link, { type, callId: data.callId }));
    return;
  }

  event.waitUntil(focusAndPost(link, { type: 'NOTIFICATION_CLICK', link }));
});
