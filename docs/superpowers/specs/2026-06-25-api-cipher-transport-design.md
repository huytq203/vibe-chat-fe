# API Cipher Transport — Design Spec

**Ngày:** 2026-06-25  
**Scope:** Frontend (Next.js 16) + Backend (NestJS)  
**Mục tiêu:** Ẩn toàn bộ payload API và WebSocket khỏi DevTools, ngăn scraping/reverse engineering.

---

## 1. Goals & Threat Model

### Bảo vệ

| Mối đe dọa | Biện pháp |
|---|---|
| Bot/scraper gọi thẳng API | Request signing — không có session key hợp lệ → reject |
| Network tab đọc request data | Request params/body AES-256-GCM encrypted |
| Network tab đọc response data | Response = single encrypted blob (Zalo-style) |
| WS inspector đọc realtime event | Event name obfuscate + payload encrypted |
| Đọc JS source để hiểu logic | Build: no source maps + critical path obfuscation |

### Ngoài scope

- True E2EE (server-side key management giữ nguyên)
- Chống XSS (CSP/sanitize là concern riêng)
- DDoS / rate limiting (đã có riêng)
- Bảo vệ mobile app

---

## 2. Kiến trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: Build Protection (no source maps, obfuscation)     │
├─────────────────────────────────────────────────────────────┤
│  Phase 4: WebSocket Payload Encryption + Event Obfuscation   │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: Response Encryption — single `data` blob           │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: Request Params/Body Encryption                     │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: ECDH Ephemeral Session Key (nền tảng)              │
└─────────────────────────────────────────────────────────────┘
```

**Session key** là prerequisite cho tất cả các phase còn lại — được thiết lập 1 lần trong flow refresh token, không thêm round-trip.

---

## 3. Phase 1 — ECDH Ephemeral Session Key

### Nguyên tắc

- Mỗi session có session key riêng, không bao giờ trùng, không bao giờ truyền qua wire
- Được derive qua X25519 ECDH + HKDF-SHA256
- FE: lưu RAM only (module-level Map) — không IndexedDB, không localStorage
- BE: lưu Redis, TTL = access token expiry

### Flow

```
FE                                              BE
│                                                │
│── generate X25519 ephemeral keypair ──────────│
│                                                │
│── POST /api/v1/auth/refresh ──────────────────►│
│     body: { clientEphemeralPubKey: base64 }    │── generate server X25519 keypair
│                                                │── sharedSecret = ECDH(serverPriv, clientPub)
│                                                │── sessionKey = HKDF(sharedSecret,
│                                                │     salt=userId, info="vibe-api-session-v1",
│                                                │     length=32)
│                                                │── Redis.set("cipher:session:{userId}",
│                                                │     sessionKey, EX=accessTokenTTL)
│◄── { accessToken, ..., serverEphemeralPubKey } │
│                                                │
│── sharedSecret = ECDH(clientPriv, serverPub)   │
│── sessionKey = HKDF(sharedSecret, same params) │
│── sessionKeyMap.set(userId, sessionKey)        │
```

### Key Derivation Parameters

```
sharedSecret = X25519(myPrivKey, theirPubKey)          // same result both sides
sessionKey   = HKDF-SHA256(
  ikm  = sharedSecret,
  salt = userId (UTF-8 bytes),
  info = "vibe-api-session-v1" (UTF-8 bytes),
  length = 32 bytes
)
```

### Session Key Rotation

Session key gắn với access token. Khi token refresh → ECDH mới → session key mới.

### Files

| | File | Mô tả |
|---|---|---|
| FE new | `src/lib/crypto/session-key.ts` | generateEphemeralKeyPair, deriveSessionKey, get/set/clear sessionKey |
| FE modify | `src/lib/api/client.ts` | Gắn clientEphemeralPubKey vào refresh request, lưu sessionKey sau khi nhận |
| FE modify | `src/services/auth.api.ts` | Thêm `serverEphemeralPubKey` vào `AuthTokens` type |
| BE new | `src/modules/session-key/session-key.service.ts` | generateServerSide, storeInRedis, getFromRedis |
| BE new | `src/modules/session-key/session-key.module.ts` | Module wrapper |
| BE modify | `src/modules/auth/dto/refresh-token.dto.ts` | Thêm `clientEphemeralPubKey?: string` |
| BE modify | `src/modules/auth/auth.service.ts` | Gọi SessionKeyService khi có clientEphemeralPubKey |
| BE modify | `src/modules/auth/auth.controller.ts` | Return `serverEphemeralPubKey` trong response |

---

## 4. Phase 2 — Request Params/Body Encryption

### Format

```
// GET request:
GET /api/v1/conversations?params=<base64(iv[12]+ct+tag[16])>

// POST request:
POST /api/v1/messages
Content-Type: application/json
body: { "params": "<base64(iv[12]+ct+tag[16])>" }
```

Original query string hoặc body JSON → AES-256-GCM encrypt → base64(iv+ct+tag) → field `params`.

### Encryption

```typescript
// AES-256-GCM, IV 12 bytes random
const iv = crypto.getRandomValues(new Uint8Array(12));
const { ciphertext, tag } = aesGcmEncrypt(JSON.stringify(originalParams), sessionKey, iv);
const blob = base64Encode(concat(iv, ciphertext, tag));
```

### Public Endpoints (skip encryption)

Các route không cần session key: `/api/v1/auth/login`, `/api/v1/auth/register`,
`/api/v1/auth/refresh`, `/api/v1/auth/verify-email`, `/api/v1/health`

### FE: Request Interceptor

`src/lib/api/client.ts` interceptor (chạy trước mỗi request):
1. Nếu public endpoint → skip
2. Lấy sessionKey từ `sessionKeyMap`
3. Serialize params/body → JSON string
4. Encrypt → blob
5. GET: replace query với `?params=<blob>`; POST/PATCH/PUT: replace body với `{ params: blob }`

### BE: Request Decipher Middleware

Global middleware, chạy trước guards (NestJS middleware order):
1. Nếu public route → skip
2. Extract JWT từ `Authorization: Bearer <token>` header
3. `jwt.decode(token)` (không verify — chỉ lấy `sub` = userId; guard sau sẽ verify đầy đủ)
4. Fetch sessionKey từ Redis (`cipher:session:{userId}`)
5. Nếu không có sessionKey → 401 `SESSION_KEY_MISSING`
6. Decrypt `params` field → restore `req.query` / `req.body` gốc
7. Controller nhận data như bình thường, không biết gì về encryption layer

> **Lưu ý:** Middleware chỉ dùng userId để lookup session key — không thay thế JWT guard. Guard vẫn verify đầy đủ token signature + expiry như trước.

### Files

| | File | Mô tả |
|---|---|---|
| FE new | `src/lib/crypto/transport-cipher.ts` | encryptBlob / decryptBlob primitives (AES-256-GCM, concat format) |
| FE modify | `src/lib/api/client.ts` | Request interceptor gắn encrypted params |
| BE new | `src/common/middleware/request-decipher.middleware.ts` | Global middleware decrypt params |
| BE modify | `src/app.module.ts` | Register middleware globally |

---

## 5. Phase 3 — Response Encryption (Zalo-style)

### Response Format

```json
// Success:
{
  "error_code": 0,
  "error_message": "Successful.",
  "data": "<base64(iv[12]+ciphertext+tag[16])>"
}

// Error:
{
  "error_code": 400,
  "error_message": "Bad Request.",
  "data": null
}
```

`data` field chứa: `base64( iv[12 bytes] ‖ ciphertext ‖ authTag[16 bytes] )`

### BE: ApiCipherInterceptor

Thay thế `TransformInterceptor` hiện tại:

```typescript
intercept(ctx, next) {
  const userId = ctx.switchToHttp().getRequest().user?.id;
  return next.handle().pipe(
    map(data => {
      if (!userId) return { error_code: 0, error_message: 'Successful.', data };  // public fallback
      const sessionKey = this.sessionKeyService.getFromRequest(ctx);
      const blob = encryptBlob(JSON.stringify(data), sessionKey);
      return { error_code: 0, error_message: 'Successful.', data: blob };
    }),
    catchError(err => {
      const code = err.status ?? 500;
      return of({ error_code: code, error_message: err.message, data: null });
    })
  );
}
```

### FE: Response Decipher

`src/lib/api/client.ts` sau khi nhận response:
1. Parse `{ error_code, error_message, data }`
2. Nếu `error_code !== 0` → throw `ApiError(error_code, error_message)`
3. Nếu không có sessionKey (public endpoint) → return `data` trực tiếp
4. Decode base64 → split: `iv = raw[0..12]`, `tag = raw[-16..]`, `ct = raw[12..-16]`
5. AES-256-GCM decrypt → `JSON.parse` → return typed data

### Files

| | File | Mô tả |
|---|---|---|
| BE new | `src/common/interceptors/api-cipher.interceptor.ts` | Encrypt response + error format |
| BE modify | `src/app.module.ts` | Replace TransformInterceptor với ApiCipherInterceptor |
| FE modify | `src/lib/api/client.ts` | Response decipher interceptor |

---

## 6. Phase 4 — WebSocket Encryption

### Event Name Obfuscation

Server gửi event map ngay sau khi socket authenticate (encrypted):

```typescript
// Server emit sau khi auth:
socket.emit('e0', encryptBlob(JSON.stringify({
  'conversation:new': 'e1',
  'message:new':      'e2',
  'friend:update':    'e3',
  'notification:new': 'e4',
  'typing':           'e5',
  'call:incoming':    'e6',
  // ...
}), sessionKey));

// Client lưu map → dùng short code:
socket.on('e2', (blob) => {
  const payload = decryptBlob(blob, sessionKey);
  handleMessageNew(JSON.parse(payload));
});
```

### Payload Format

Tất cả WS event payload đều là encrypted blob (cùng format Phase 2/3):
```
emit('e2', base64(iv[12] + ct + tag[16]))
```

DevTools WS inspector thấy:
```
e1 → "Cj1NH2fxp4T3ufNFapA6..."
e2 → "Xk2MH9fxp4T1ufNFbpA5..."
```

### Files

| | File | Mô tả |
|---|---|---|
| FE new | `src/lib/ws/event-map.ts` | EventMap type, store/resolve short code ↔ event name |
| FE modify | `src/lib/ws/socket.ts` | Encrypt emit, decrypt on, receive event map on connect |
| BE new | `src/modules/chat/ws/ws-cipher.service.ts` | encryptWsPayload, getEventMap |
| BE modify | `src/modules/chat/chat.gateway.ts` | Emit event map on auth connect, encrypt all emissions |

---

## 7. Phase 5 — Build Protection

### next.config.ts

```typescript
const config: NextConfig = {
  productionBrowserSourceMaps: false,    // không expose .map files
  // SWC minify mặc định đã mangle identifiers
};
```

### JS Obfuscation (critical paths)

Webpack plugin `webpack-obfuscator` áp dụng cho `src/lib/crypto/**`:

```typescript
// next.config.ts webpack config
if (!isDev) {
  config.plugins.push(
    new WebpackObfuscator({
      rotateStringArray: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
    }, ['src/lib/crypto/**'])
  );
}
```

### Security Headers

```typescript
// next.config.ts headers()
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
```

### Environment Variables Audit

Review tất cả `NEXT_PUBLIC_*` — remove bất kỳ giá trị nào expose API metadata.

---

## 8. Migration Strategy

Không downtime — deploy theo thứ tự:

1. **Deploy BE:** `ApiCipherInterceptor` + `RequestDecipherMiddleware` + `SessionKeyService`  
   — Với feature flag: chỉ encrypt nếu header `X-Cipher: 1` present
2. **Deploy FE:** Gửi `X-Cipher: 1`, thực hiện ECDH handshake, encrypt/decrypt
3. **Verify 24h:** Monitor error rate, kiểm tra các edge case
4. **Enforce:** Tắt feature flag → bắt buộc mọi request phải có session key
5. **Cleanup:** Remove `X-Cipher` check trong BE

---

## 9. Ràng buộc Kỹ Thuật

- Web Crypto API X25519: Chrome 113+, Firefox 90+, Safari 15.4+ — đủ cho target users
- AES-256-GCM: supported toàn bộ modern browsers và Node.js 18+
- Session key size: 32 bytes (256-bit) cho AES-256-GCM
- Nonce/IV: 12 bytes random per message (GCM spec)
- Redis TTL: khớp với access token TTL để tránh mất session key trước khi token hết hạn
- Không thêm lib mới ngoài `webpack-obfuscator` (build tool only, không runtime)
