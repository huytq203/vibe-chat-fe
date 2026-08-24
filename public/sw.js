/* Service worker cho Halo PWA.
   - Chỉ _next/static (tên đã có hash) dùng cache-first.
   - Asset public dùng stale-while-revalidate và cache đổi theo mỗi build.
   - Navigation không được lưu để tránh cache dữ liệu chat; khi mất mạng trả /offline.
   - KHÔNG cache API / non-GET. */
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const SAFE_BUILD_ID = BUILD_ID.replace(/[^a-zA-Z0-9._-]/g, "-");
const CACHE_PREFIX = "halo-";
const STATIC_CACHE = `${CACHE_PREFIX}static-${SAFE_BUILD_ID}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${SAFE_BUILD_ID}`;
// Emoji CDN là asset bất biến theo URL và không cần bị xoá theo mỗi lần deploy app.
const EMOJI_CACHE = `${CACHE_PREFIX}emoji-twitter-v1`;
const EMOJI_CDN_ORIGIN = "https://cdn.jsdelivr.net";
const EMOJI_CDN_PATH = "/npm/emoji-datasource-twitter/img/twitter/64/";
const OFFLINE_URL = "/offline";
// Chỉ /offline là bắt buộc — thiếu nó thì service worker vô nghĩa lúc mất mạng.
const OPTIONAL_PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable.png",
];
const PUBLIC_ASSET_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$/i;
// Dùng khi cache trống (browser dọn theo quota) — vẫn hơn màn hình lỗi mặc định.
const OFFLINE_FALLBACK_HTML = `<!doctype html><html lang="vi"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đang ngoại tuyến | Halo</title>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0e0c14;color:#f7f5ff;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><h1 style="font-size:24px;margin:0 0 12px">Bạn đang ngoại tuyến</h1>
<p style="color:#c8c2d8;margin:0">Kiểm tra kết nối mạng rồi tải lại trang.</p></div>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await cache.add(OFFLINE_URL);
      // Phần còn lại chỉ để chạy nhanh hơn: một URL lỗi không được chặn install.
      await Promise.all(
        OPTIONAL_PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)),
      );
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE &&
                key !== EMOJI_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkThenOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    // caches.match trả undefined nếu cache bị dọn → respondWith(undefined) sẽ ném.
    return (
      cached ||
      new Response(OFFLINE_FALLBACK_HTML, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    event.waitUntil(network.then(() => undefined).catch(() => undefined));
    return cached;
  }

  return network;
}

async function emojiCacheFirst(request) {
  const cache = await caches.open(EMOJI_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Request ảnh cross-origin chạy no-cors nên trả opaque (status 0). Cache API vẫn
  // lưu được response này và phục vụ lại ở các lần mở picker sau.
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === EMOJI_CDN_ORIGIN && url.pathname.startsWith(EMOJI_CDN_PATH)) {
    event.respondWith(emojiCacheFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkThenOffline(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (PUBLIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});
