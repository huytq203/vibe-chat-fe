# 11 — Push Notifications: FCM End-to-End

> Setup Firebase Cloud Messaging FE để nhận push notification khi user offline.
> API spec đăng ký/xoá token đã ở [07-notifications.md](./07-notifications.md).

---

## Flow tổng quan

```
User login → xin permission → lấy FCM token → POST /notifications/fcm-tokens
       │
User tắt tab → WS disconnect → server đánh dấu offline
       │
User B nhắn → server thấy A offline → call FCM
       │
FCM → browser push → Service Worker → showNotification()
       │
User click → mở app → /conversations/{conversationId}
```

---

## 11.1. Setup Firebase (FE)

`firebase.config.ts`:
```ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const messaging = getMessaging(firebaseApp);
export { getToken, onMessage };
```

## 11.2. Xin permission + đăng ký token

Gọi **sau khi login thành công**:

```ts
import { messaging, getToken, onMessage } from './firebase.config';

async function setupPush(accessToken: string) {
  // 1. Check support + xin permission
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // 2. Register Service Worker (đường dẫn phải đúng — public/firebase-messaging-sw.js)
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // 3. Lấy FCM registration token
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,   // public VAPID từ Firebase console
    serviceWorkerRegistration: reg,
  });
  if (!token) return;

  // 4. Gửi token lên BE
  await fetch('/api/v1/notifications/fcm-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      deviceType: 'WEB',
      userAgent: navigator.userAgent,
    }),
  });

  // 5. Foreground message — khi app đang mở vẫn nhận được payload từ FCM
  //    (mặc định SW không show noti khi tab đang focus)
  onMessage(messaging, (payload) => {
    console.log('FCM foreground:', payload);
    // Có thể skip — vì FE đã có 'notification:new' qua WS rồi.
    // Hoặc show in-app toast nếu muốn.
  });
}
```

## 11.3. Service Worker — `public/firebase-messaging-sw.js`

```js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// Background message — show OS notification
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};
  // BE truyền click_action trong data + fcmOptions.link → SW dùng link để mở app
  const link = payload.fcmOptions?.link || data.click_action || '/';

  self.registration.showNotification(title || 'Vibe Chat', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/badge.png',
    data: { ...data, link },
    // group cùng conv → ghi đè noti cũ. Lưu ý: push BULK (group chat) không có
    // notificationId — chỉ noti đơn lẻ (friend, call) mới có.
    tag: data.conversationId || data.notificationId || data.type,
  });
});

// Click → focus tab hoặc mở mới đúng route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Có tab đang mở → focus
      for (const c of clients) {
        if ('focus' in c) {
          c.focus();
          c.postMessage({ type: 'NOTIFICATION_CLICK', link });
          return;
        }
      }
      // Không tab nào → mở mới
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
```

> BE truyền `click_action` trong `data` + `webpush.fcmOptions.link` = `${FCM_APP_URL}/conversations/{conversationId}` (cho noti có conversationId) hoặc `/notifications` cho noti khác. FE chỉ việc dùng nguyên.

## 11.4. Listen postMessage từ SW khi tab đang mở

```ts
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.link) {
    router.push(new URL(event.data.link).pathname);
  }
});
```

## 11.5. Cleanup khi logout

```ts
async function logout(accessToken: string) {
  // Xoá token trên BE TRƯỚC (cần access token còn hiệu lực)
  const token = await getToken(messaging).catch(() => null);
  if (token) {
    await fetch('/api/v1/notifications/fcm-tokens', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  }
  // Sau đó logout backend (clear refresh cookie + revoke Keycloak session)
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
```

## 11.6. Khi nào FE nhận noti qua kênh nào?

| Trạng thái user | `notification:new` WS | FCM push |
|---|---|---|
| Online, tab đang focus | ✅ | ❌ (server check offline) — trừ MENTION & FRIEND_* (push luôn) |
| Online, tab background | ✅ | ❌ — trừ MENTION & FRIEND_* |
| Offline (tắt browser/disconnect) | ❌ (sẽ thấy khi reconnect qua `/notifications` API) | ✅ |

> **Anti-dup**: khi FE nhận cả 2 kênh (vd MENTION lúc online), SW vẫn sẽ show noti OS. Nếu muốn ẩn khi tab đang focus → check `document.hasFocus()` ở foreground `onMessage` rồi dùng `event.preventDefault()` ở SW (gửi message từ tab xuống SW). Đây là tweak optional.

## 11.7. Troubleshooting FCM

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `getToken` trả `null` | Permission `denied`, hoặc SW chưa register, hoặc VAPID key sai |
| BE log `FcmService no-op` | Thiếu env `FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY_BASE64` |
| Push không đến | Token đã expire — BE tự xoá trong DB, FE re-call `setupPush()` định kỳ (vd mỗi 24h) |
| `messaging/registration-token-not-registered` | Bình thường, server đã xoá token đó — FE không cần action |
| Noti không deep-link đúng | `click_action` rỗng → check `FCM_APP_URL` env của BE; check SW có đọc `data.click_action` không |

## 11.8. Refresh FCM token định kỳ

FCM token có thể bị invalidate (đổi browser profile, clear data…). FE nên:

```ts
// Mỗi lần app khởi động, hoặc 24h/lần
setInterval(async () => {
  const newToken = await getToken(messaging, { vapidKey: VAPID }).catch(() => null);
  if (newToken) {
    await fetch('/api/v1/notifications/fcm-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token: newToken, deviceType: 'WEB' }),
    });
  }
}, 24 * 60 * 60 * 1000);
```

Backend upsert theo `token` (unique) — gọi lặp không tạo bản ghi mới.

---

**Liên quan:**
- 📮 REST API FCM token + inbox → [07-notifications.md](./07-notifications.md)
- 🔌 WS `notification:new` để xử lý realtime khi online → [08-websocket.md](./08-websocket.md#notification-realtime)
