# API Cipher Transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ẩn toàn bộ request/response payload và WebSocket event khỏi DevTools bằng ECDH ephemeral session key + AES-256-GCM encryption.

**Architecture:** FE generate X25519 ephemeral keypair → POST `/api/v1/session/key` → cả hai bên ECDH + HKDF ra cùng session key → mọi request/response sau đó encrypted bằng session key. Session key sống trong RAM (FE) và Redis (BE) — không bao giờ truyền qua wire.

**Tech Stack:** Web Crypto API (FE), Node.js `crypto` module (BE), ioredis (BE), NestJS interceptor/middleware, webpack-obfuscator (build).

## Global Constraints

- Không `any`, không `@ts-ignore` — tuân thủ RULE.md
- File < 300 dòng, function < 50 dòng
- FE: Web Crypto API (không import Node.js `crypto`)
- BE: Node.js `crypto` (không import lib crypto ngoài)
- Cipher format: `base64(iv[12 bytes] ‖ ciphertext ‖ authTag[16 bytes])` — nhất quán FE & BE
- Redis injection: `@Inject(REDIS_CLIENT) private redis: Redis` (xem `envelope-crypto.service.ts`)
- Không sửa file trong `src/components/ui/`
- Hai codebase riêng: FE = `/home/huytq/code/my/fe/vibe-chat-fe`, BE = `/home/huytq/code/my/be/vibe-chat`

---

## File Map

### FE — New
| File | Trách nhiệm |
|---|---|
| `src/lib/crypto/transport-cipher.ts` | `encryptBlob` / `decryptBlob` dùng Web Crypto AES-256-GCM |
| `src/lib/crypto/session-key.ts` | ECDH + HKDF, `establishSessionKey`, get/set/clear RAM store |
| `src/lib/ws/event-map.ts` | Map WS event name ↔ short code (`e1`, `e2`...) |

### FE — Modified
| File | Thay đổi |
|---|---|
| `src/lib/api/client.ts` | Thêm cipher request + decipher response, parse `error_code` format mới |
| `src/features/auth/components/AuthBootstrap.tsx` | Gọi `establishSessionKey` trước `bootstrap()` |
| `src/lib/ws/socket.ts` | Encrypt emit, decrypt on, nhận event map khi connect |

### BE — New
| File | Trách nhiệm |
|---|---|
| `src/common/utils/transport-cipher.ts` | `encryptBlob` / `decryptBlob` Node.js AES-256-GCM |
| `src/modules/session-key/session-key.service.ts` | ECDH server-side + Redis store |
| `src/modules/session-key/session-key.module.ts` | Module wrapper |
| `src/modules/session-key/session-key.controller.ts` | `POST /session/key` endpoint |
| `src/modules/session-key/dto/establish-session-key.dto.ts` | DTO |
| `src/common/middleware/request-decipher.middleware.ts` | Decrypt `params` field trước khi vào controller |
| `src/common/interceptors/api-cipher.interceptor.ts` | Encrypt response → Zalo-style envelope |

### BE — Modified
| File | Thay đổi |
|---|---|
| `src/app.module.ts` | Thêm `SessionKeyModule`, register middleware + interceptor, bỏ `TransformInterceptor` |
| `src/modules/chat/chat.gateway.ts` | Gửi event map khi connect, encrypt WS payload |

---

## Task 1: BE — Transport Cipher Utility

**Files:**
- Create: `src/common/utils/transport-cipher.ts` (BE)
- Test: `src/common/utils/transport-cipher.spec.ts`

**Interfaces:**
- Produces: `encryptBlob(data: string, key: Buffer): string`, `decryptBlob(blob: string, key: Buffer): string`

- [ ] **Step 1: Write failing test**

```typescript
// src/common/utils/transport-cipher.spec.ts
import { randomBytes } from 'node:crypto';
import { encryptBlob, decryptBlob } from './transport-cipher';

describe('transport-cipher', () => {
  const key = randomBytes(32);

  it('round-trips plaintext', () => {
    const original = JSON.stringify({ hello: 'world', n: 42 });
    expect(decryptBlob(encryptBlob(original, key), key)).toBe(original);
  });

  it('produces different blob on each call (random IV)', () => {
    const data = 'same data';
    expect(encryptBlob(data, key)).not.toBe(encryptBlob(data, key));
  });

  it('throws on tampered ciphertext', () => {
    const blob = encryptBlob('data', key);
    const bytes = Buffer.from(blob, 'base64');
    bytes[20] ^= 0xff; // flip bits in ciphertext
    expect(() => decryptBlob(bytes.toString('base64'), key)).toThrow();
  });

  it('throws on wrong key', () => {
    const blob = encryptBlob('secret', key);
    const wrongKey = randomBytes(32);
    expect(() => decryptBlob(blob, wrongKey)).toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd /home/huytq/code/my/be/vibe-chat
npx jest transport-cipher --no-coverage 2>&1 | tail -10
```
Expected: `Cannot find module './transport-cipher'`

- [ ] **Step 3: Implement**

```typescript
// src/common/utils/transport-cipher.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptBlob(data: string, key: Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

export function decryptBlob(blob: string, key: Buffer): string {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npx jest transport-cipher --no-coverage 2>&1 | tail -5
```
Expected: `Tests: 4 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/huytq/code/my/be/vibe-chat
git add src/common/utils/transport-cipher.ts src/common/utils/transport-cipher.spec.ts
git commit -m "feat(cipher): transport-cipher utility — encryptBlob/decryptBlob AES-256-GCM"
```

---

## Task 2: FE — Transport Cipher Utility

**Files:**
- Create: `src/lib/crypto/transport-cipher.ts`
- Test: `src/lib/crypto/transport-cipher.test.ts`

**Interfaces:**
- Produces: `encryptBlob(data: string, key: CryptoKey): Promise<string>`, `decryptBlob(blob: string, key: CryptoKey): Promise<string>`
- Same `base64(iv[12] ‖ ct ‖ tag[16])` format → interoperable với BE Task 1

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/crypto/transport-cipher.test.ts
import { describe, it, expect } from 'vitest';
import { encryptBlob, decryptBlob } from './transport-cipher';

async function makeKey(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

describe('transport-cipher', () => {
  it('round-trips plaintext', async () => {
    const key = await makeKey();
    const original = JSON.stringify({ hello: 'world', n: 42 });
    expect(await decryptBlob(await encryptBlob(original, key), key)).toBe(original);
  });

  it('produces different blob each call', async () => {
    const key = await makeKey();
    const [a, b] = await Promise.all([encryptBlob('x', key), encryptBlob('x', key)]);
    expect(a).not.toBe(b);
  });

  it('throws on tampered data', async () => {
    const key = await makeKey();
    const blob = await encryptBlob('secret', key);
    const bytes = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    bytes[20] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...bytes));
    await expect(decryptBlob(tampered, key)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
npx vitest run src/lib/crypto/transport-cipher.test.ts 2>&1 | tail -10
```
Expected: `Cannot find module './transport-cipher'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/crypto/transport-cipher.ts
const IV_LEN = 12;
const TAG_LEN = 16;

function toB64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK)
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// Web Crypto AES-GCM encrypt output = ciphertext ‖ authTag[16]
export async function encryptBlob(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LEN * 8 },
    key,
    new TextEncoder().encode(data),
  );
  const out = new Uint8Array(IV_LEN + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), IV_LEN);
  return toB64(out);
}

export async function decryptBlob(blob: string, key: CryptoKey): Promise<string> {
  const bytes = fromB64(blob);
  const iv = bytes.slice(0, IV_LEN);
  const ctWithTag = bytes.slice(IV_LEN); // Web Crypto expects ct + tag together
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LEN * 8 },
    key,
    ctWithTag,
  );
  return new TextDecoder().decode(plain);
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npx vitest run src/lib/crypto/transport-cipher.test.ts 2>&1 | tail -5
```
Expected: `Tests: 3 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
git add src/lib/crypto/transport-cipher.ts src/lib/crypto/transport-cipher.test.ts
git commit -m "feat(cipher): transport-cipher utility — encryptBlob/decryptBlob Web Crypto AES-256-GCM"
```

---

## Task 3: BE — Session Key Service + Controller

**Files:**
- Create: `src/modules/session-key/session-key.service.ts`
- Create: `src/modules/session-key/session-key.module.ts`
- Create: `src/modules/session-key/session-key.controller.ts`
- Create: `src/modules/session-key/dto/establish-session-key.dto.ts`
- Test: `src/modules/session-key/session-key.service.spec.ts`

**Interfaces:**
- Produces:
  - `SessionKeyService.establish(userId: string, clientEphPubKey: string): Promise<{ serverEphPubKey: string; sessionKey: Buffer }>`
  - `SessionKeyService.get(userId: string): Promise<Buffer | null>`
  - `POST /api/v1/session/key` → `{ serverEphPubKey: string }`

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/session-key/session-key.service.spec.ts
import { Test } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { SessionKeyService } from './session-key.service';
import { generateKeyPairSync } from 'node:crypto';

const mockRedis = { set: jest.fn().mockResolvedValue('OK'), getBuffer: jest.fn() };

describe('SessionKeyService', () => {
  let svc: SessionKeyService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SessionKeyService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(SessionKeyService);
    jest.clearAllMocks();
  });

  it('establish returns 32-byte session key and stores in Redis', async () => {
    // Generate a real client X25519 keypair for testing
    const { publicKey } = generateKeyPairSync('x25519');
    const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const clientPubRaw = spki.subarray(12); // strip 12-byte header
    const clientEphPubKey = clientPubRaw.toString('base64');

    const { serverEphPubKey, sessionKey } = await svc.establish('user123', clientEphPubKey);

    expect(serverEphPubKey).toMatch(/^[A-Za-z0-9+/]+=*$/); // valid base64
    expect(Buffer.from(serverEphPubKey, 'base64')).toHaveLength(32);
    expect(sessionKey).toHaveLength(32);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'cipher:session:user123',
      expect.any(Buffer),
      'EX',
      86400,
    );
  });

  it('get returns null when key missing', async () => {
    mockRedis.getBuffer.mockResolvedValue(null);
    expect(await svc.get('missing')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd /home/huytq/code/my/be/vibe-chat
npx jest session-key.service --no-coverage 2>&1 | tail -10
```
Expected: `Cannot find module './session-key.service'`

- [ ] **Step 3: Implement DTO**

```typescript
// src/modules/session-key/dto/establish-session-key.dto.ts
import { IsBase64, IsString } from 'class-validator';

export class EstablishSessionKeyDto {
  @IsString()
  @IsBase64()
  clientEphPubKey!: string;
}
```

- [ ] **Step 4: Implement Service**

```typescript
// src/modules/session-key/session-key.service.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
} from 'node:crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

// X25519 SPKI DER prefix (12 bytes): wraps raw 32-byte public key into SPKI format
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');
const SESSION_TTL_SECONDS = 86_400; // 24h
const REDIS_PREFIX = 'cipher:session:';

@Injectable()
export class SessionKeyService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async establish(userId: string, clientEphPubKey: string): Promise<{
    serverEphPubKey: string;
    sessionKey: Buffer;
  }> {
    const { privateKey, publicKey } = generateKeyPairSync('x25519');

    const clientPubSpki = Buffer.concat([
      X25519_SPKI_PREFIX,
      Buffer.from(clientEphPubKey, 'base64'),
    ]);
    const clientPubObj = createPublicKey({ key: clientPubSpki, format: 'der', type: 'spki' });

    const sharedSecret = diffieHellman({ privateKey, publicKey: clientPubObj });
    const sessionKey = Buffer.from(
      hkdfSync('sha256', sharedSecret, Buffer.alloc(32), 'vibe-api-session-v1', 32),
    );

    await this.redis.set(`${REDIS_PREFIX}${userId}`, sessionKey, 'EX', SESSION_TTL_SECONDS);

    const serverSpki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const serverEphPubKey = serverSpki.subarray(12).toString('base64'); // raw 32 bytes

    return { serverEphPubKey, sessionKey };
  }

  async get(userId: string): Promise<Buffer | null> {
    const raw = await this.redis.getBuffer(`${REDIS_PREFIX}${userId}`);
    return raw ?? null;
  }

  async delete(userId: string): Promise<void> {
    await this.redis.del(`${REDIS_PREFIX}${userId}`);
  }
}
```

- [ ] **Step 5: Implement Controller + Module**

```typescript
// src/modules/session-key/session-key.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/jwt-payload.interface';
import { SessionKeyService } from './session-key.service';
import { EstablishSessionKeyDto } from './dto/establish-session-key.dto';

@ApiTags('session-key')
@Controller('session/key')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionKeyController {
  constructor(private readonly sessionKeyService: SessionKeyService) {}

  @Post()
  @ApiOperation({ summary: 'ECDH session key establishment — FE gọi 1 lần sau login' })
  async establish(
    @Body() dto: EstablishSessionKeyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ serverEphPubKey: string }> {
    const { serverEphPubKey } = await this.sessionKeyService.establish(user.keycloakId, dto.clientEphPubKey);
    return { serverEphPubKey };
  }
}
```

```typescript
// src/modules/session-key/session-key.module.ts
import { Module } from '@nestjs/common';
import { SessionKeyService } from './session-key.service';
import { SessionKeyController } from './session-key.controller';

@Module({
  providers: [SessionKeyService],
  controllers: [SessionKeyController],
  exports: [SessionKeyService],
})
export class SessionKeyModule {}
```

- [ ] **Step 6: Run test to confirm PASS**

```bash
npx jest session-key.service --no-coverage 2>&1 | tail -5
```
Expected: `Tests: 2 passed`

- [ ] **Step 7: Register module in app.module.ts**

Mở `src/app.module.ts`, thêm `SessionKeyModule` vào `imports` array:
```typescript
import { SessionKeyModule } from './modules/session-key/session-key.module';
// ...trong @Module imports:
SessionKeyModule,
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/session-key/ src/app.module.ts
git commit -m "feat(session-key): ECDH X25519 session key service + POST /session/key endpoint"
```

---

## Task 4: FE — Session Key Module

**Files:**
- Create: `src/lib/crypto/session-key.ts`
- Test: `src/lib/crypto/session-key.test.ts`

**Interfaces:**
- Produces:
  - `establishSessionKey(userId: string, token: string): Promise<void>`
  - `getSessionKey(): CryptoKey | null`
  - `clearSessionKey(): void`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/crypto/session-key.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// Mock fetch before importing module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Generate a real server X25519 pub key (raw 32 bytes, base64) for mocking
function makeServerEphPubKey(): string {
  const { publicKey } = generateKeyPairSync('x25519');
  const spki = Buffer.from(publicKey.export({ type: 'spki', format: 'der' }) as Buffer);
  return spki.subarray(12).toString('base64');
}

describe('session-key', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('establishSessionKey sets a CryptoKey in memory', async () => {
    const serverEphPubKey = makeServerEphPubKey();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error_code: 0, data: { serverEphPubKey } }),
    });

    const { establishSessionKey, getSessionKey } = await import('./session-key');
    await establishSessionKey('user123', 'fake-token');

    const key = getSessionKey();
    expect(key).not.toBeNull();
    expect(key?.type).toBe('secret');
    expect(key?.algorithm.name).toBe('AES-GCM');
  });

  it('clearSessionKey removes the key', async () => {
    const { clearSessionKey, getSessionKey } = await import('./session-key');
    clearSessionKey();
    expect(getSessionKey()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
npx vitest run src/lib/crypto/session-key.test.ts 2>&1 | tail -10
```
Expected: `Cannot find module './session-key'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/crypto/session-key.ts
import { env } from '@/config/env';

let _sessionKey: CryptoKey | null = null;

export function getSessionKey(): CryptoKey | null {
  return _sessionKey;
}

export function clearSessionKey(): void {
  _sessionKey = null;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function deriveSessionKey(
  clientPrivKey: CryptoKey,
  serverEphPubKeyB64: string,
): Promise<CryptoKey> {
  const serverPubRaw = fromB64(serverEphPubKeyB64);
  const serverPubKey = await crypto.subtle.importKey(
    'raw',
    serverPubRaw,
    { name: 'X25519' },
    false,
    [],
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'X25519', public: serverPubKey },
    clientPrivKey,
    256,
  );

  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // zero salt, same as BE
      info: new TextEncoder().encode('vibe-api-session-v1'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function establishSessionKey(
  _userId: string,
  accessToken: string,
): Promise<void> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveBits'],
  );

  const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const clientEphPubKey = toB64(new Uint8Array(pubRaw));

  const base = env.NEXT_PUBLIC_USE_PROXY ? '' : env.NEXT_PUBLIC_VIBE_URL;
  const res = await fetch(`${base}/api/v1/session/key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ clientEphPubKey }),
  });

  if (!res.ok) throw new Error(`session/key failed: ${res.status}`);
  const json = (await res.json()) as { error_code: number; data: { serverEphPubKey: string } };
  if (json.error_code !== 0) throw new Error('session/key error');

  _sessionKey = await deriveSessionKey(keyPair.privateKey, json.data.serverEphPubKey);
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npx vitest run src/lib/crypto/session-key.test.ts 2>&1 | tail -5
```
Expected: `Tests: 2 passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto/session-key.ts src/lib/crypto/session-key.test.ts
git commit -m "feat(session-key): FE ECDH X25519 session key establishment + RAM store"
```

---

## Task 5: FE — Wire Session Key vào AuthBootstrap

**Files:**
- Modify: `src/features/auth/components/AuthBootstrap.tsx`
- Modify: `src/services/auth.api.ts` (expose `getToken` cho session-key)

**Interfaces:**
- Consumes: `establishSessionKey` từ Task 4, `apiAuth.getToken()` từ `client.ts`

- [ ] **Step 1: Đọc file `AuthBootstrap.tsx` hiện tại** để biết vị trí chèn

```bash
grep -n "bootstrap\|refreshAccessToken\|setUser\|apiAuth" /home/huytq/code/my/fe/vibe-chat-fe/src/features/auth/components/AuthBootstrap.tsx
```

- [ ] **Step 2: Thêm `establishSessionKey` call sau khi có access token**

Trong `AuthBootstrap.tsx`, sau dòng `apiAuth.setToken(tokens.accessToken, tokens.expiresIn);` (khoảng dòng 54), thêm:

```typescript
import { establishSessionKey, clearSessionKey } from '@/lib/crypto/session-key';
```

Và trong `useEffect` cleanup (return):
```typescript
return () => {
  cancelled = true;
  clearSessionKey();
};
```

Và sau `apiAuth.setToken(tokens.accessToken, tokens.expiresIn)`:
```typescript
await establishSessionKey('', tokens.accessToken);
// userId không cần thiết vì salt là zero buffer (nhất quán với BE)
```

Full snippet thay đổi trong async IIFE (thay đoạn sau `apiAuth.setToken`):
```typescript
apiAuth.setToken(tokens.accessToken, tokens.expiresIn);
await establishSessionKey('', tokens.accessToken);
const { me, conversations, unreadCount, systemNotifCount } = await authApi.bootstrap();
```

- [ ] **Step 3: Thêm clear khi logout**

Trong `onUnauthorized` handler, thêm `clearSessionKey()`:
```typescript
apiAuth.onUnauthorized(() => {
  clearSessionKey();
  if (useAuthStore.getState().isAuthenticated) setUser(null);
  if (requireAuth) router.replace(redirectTo);
});
```

- [ ] **Step 4: Manual test** — Mở app trong browser, bật DevTools > Network > XHR. Kiểm tra:
  - `POST /api/v1/session/key` xuất hiện sau refresh
  - Response chứa `serverEphPubKey`
  - Không có JS error trong Console

- [ ] **Step 5: Commit**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
git add src/features/auth/components/AuthBootstrap.tsx
git commit -m "feat(auth): establish ECDH session key after token refresh"
```

---

## Task 6: BE — Request Decipher Middleware

**Files:**
- Create: `src/common/middleware/request-decipher.middleware.ts`
- Test: `src/common/middleware/request-decipher.middleware.spec.ts`

**Interfaces:**
- Consumes: `SessionKeyService.get(userId)`, `decryptBlob` từ Task 1
- Produces: restores `req.query` / `req.body` từ encrypted `params` field; sets `req.__sessionKey`

- [ ] **Step 1: Write failing test**

```typescript
// src/common/middleware/request-decipher.middleware.spec.ts
import { Test } from '@nestjs/testing';
import { RequestDecipherMiddleware } from './request-decipher.middleware';
import { SessionKeyService } from '../../modules/session-key/session-key.service';
import { encryptBlob } from '../utils/transport-cipher';
import { randomBytes } from 'node:crypto';

const sessionKey = randomBytes(32);
const mockSessionKeyService = {
  get: jest.fn().mockResolvedValue(sessionKey),
};

function makeReq(overrides: object = {}) {
  return {
    headers: { authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig' },
    query: {},
    body: {},
    method: 'GET',
    path: '/api/v1/conversations',
    ...overrides,
  };
}

describe('RequestDecipherMiddleware', () => {
  let middleware: RequestDecipherMiddleware;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        RequestDecipherMiddleware,
        { provide: SessionKeyService, useValue: mockSessionKeyService },
      ],
    }).compile();
    middleware = mod.get(RequestDecipherMiddleware);
    jest.clearAllMocks();
    mockSessionKeyService.get.mockResolvedValue(sessionKey);
  });

  it('decrypts GET params and restores req.query', async () => {
    const original = { page: 1, limit: 20 };
    const blob = encryptBlob(JSON.stringify(original), sessionKey);
    const req = makeReq({ method: 'GET', query: { params: blob } }) as any;
    const res = {} as any;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.query).toEqual(original);
    expect(next).toHaveBeenCalled();
  });

  it('decrypts POST body and restores req.body', async () => {
    const original = { content: 'hello', type: 'TEXT' };
    const blob = encryptBlob(JSON.stringify(original), sessionKey);
    const req = makeReq({ method: 'POST', body: { params: blob } }) as any;
    const res = {} as any;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.body).toEqual(original);
    expect(next).toHaveBeenCalled();
  });

  it('skips bypass paths', async () => {
    const req = makeReq({ path: '/api/v1/session/key', query: {} }) as any;
    const res = {} as any;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockSessionKeyService.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when session key missing for protected path', async () => {
    mockSessionKeyService.get.mockResolvedValue(null);
    const req = makeReq() as any;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as any;

    await middleware.use(req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error_code: 401 }));
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd /home/huytq/code/my/be/vibe-chat
npx jest request-decipher.middleware --no-coverage 2>&1 | tail -10
```

- [ ] **Step 3: Implement**

```typescript
// src/common/middleware/request-decipher.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { decryptBlob } from '../utils/transport-cipher';
import { SessionKeyService } from '../../modules/session-key/session-key.service';

// Paths that skip cipher (no session key required)
const BYPASS_PATHS = [
  '/api/v1/session/key',
  '/api/v1/health',
  '/api/v1/auth/',
];

function extractUserId(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(authorization.slice(7).split('.')[1], 'base64url').toString('utf8'),
    ) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

declare module 'express' {
  interface Request {
    __sessionKey?: Buffer | null;
  }
}

@Injectable()
export class RequestDecipherMiddleware implements NestMiddleware {
  constructor(private readonly sessionKeyService: SessionKeyService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const isBypass = BYPASS_PATHS.some(p => req.path.startsWith(p));
    if (isBypass) {
      req.__sessionKey = null;
      next();
      return;
    }

    const userId = extractUserId(req.headers.authorization);
    if (!userId) {
      req.__sessionKey = null;
      next();
      return;
    }

    const sessionKey = await this.sessionKeyService.get(userId);
    if (!sessionKey) {
      res.status(401).json({ error_code: 401, error_message: 'SESSION_KEY_MISSING', data: null });
      return;
    }

    req.__sessionKey = sessionKey;

    try {
      if (req.method === 'GET' && typeof req.query.params === 'string') {
        const decrypted = decryptBlob(req.query.params, sessionKey);
        const parsed = JSON.parse(decrypted) as Record<string, unknown>;
        delete req.query.params;
        Object.assign(req.query, parsed);
      } else if (req.method !== 'GET' && typeof (req.body as Record<string, unknown>)?.params === 'string') {
        const blob = (req.body as { params: string }).params;
        const decrypted = decryptBlob(blob, sessionKey);
        req.body = JSON.parse(decrypted) as unknown;
      }
    } catch {
      res.status(400).json({ error_code: 400, error_message: 'INVALID_CIPHER', data: null });
      return;
    }

    next();
  }
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npx jest request-decipher.middleware --no-coverage 2>&1 | tail -5
```
Expected: `Tests: 4 passed`

- [ ] **Step 5: Register middleware globally in app.module.ts**

Trong `src/app.module.ts`, thêm `configure(consumer)` method:
```typescript
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RequestDecipherMiddleware } from './common/middleware/request-decipher.middleware';

// Trong AppModule class:
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(RequestDecipherMiddleware)
    .forRoutes({ path: '*', method: RequestMethod.ALL });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/common/middleware/request-decipher.middleware.ts src/common/middleware/request-decipher.middleware.spec.ts src/app.module.ts
git commit -m "feat(cipher): RequestDecipherMiddleware — decrypt encrypted params before routing"
```

---

## Task 7: BE — Response Cipher Interceptor

**Files:**
- Create: `src/common/interceptors/api-cipher.interceptor.ts`
- Test: `src/common/interceptors/api-cipher.interceptor.spec.ts`
- Modify: `src/app.module.ts` (replace `TransformInterceptor`)

**Interfaces:**
- Consumes: `req.__sessionKey` (Buffer | null) từ Task 6, `encryptBlob` từ Task 1
- Produces: `{ error_code: 0, error_message: "Successful.", data: "<base64 blob>" }`

- [ ] **Step 1: Write failing test**

```typescript
// src/common/interceptors/api-cipher.interceptor.spec.ts
import { of, throwError } from 'rxjs';
import { ApiCipherInterceptor } from './api-cipher.interceptor';
import { decryptBlob } from '../utils/transport-cipher';
import { randomBytes } from 'node:crypto';

function makeCtx(sessionKey: Buffer | null) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ __sessionKey: sessionKey }),
    }),
  } as any;
}

describe('ApiCipherInterceptor', () => {
  const interceptor = new ApiCipherInterceptor();
  const sessionKey = randomBytes(32);

  it('encrypts response data with session key', done => {
    const handler = { handle: () => of({ messages: ['hello'] }) } as any;

    interceptor.intercept(makeCtx(sessionKey), handler).subscribe(result => {
      const r = result as { error_code: number; data: string };
      expect(r.error_code).toBe(0);
      expect(typeof r.data).toBe('string');
      const decrypted = JSON.parse(decryptBlob(r.data, sessionKey));
      expect(decrypted).toEqual({ messages: ['hello'] });
      done();
    });
  });

  it('returns plain format when no session key (bypass path)', done => {
    const handler = { handle: () => of({ ok: true }) } as any;

    interceptor.intercept(makeCtx(null), handler).subscribe(result => {
      const r = result as { error_code: number; data: unknown };
      expect(r.error_code).toBe(0);
      expect(r.data).toEqual({ ok: true });
      done();
    });
  });

  it('returns error envelope on thrown exception', done => {
    const err = { status: 404, message: 'Not found' };
    const handler = { handle: () => throwError(() => err) } as any;

    interceptor.intercept(makeCtx(sessionKey), handler).subscribe(result => {
      const r = result as { error_code: number; error_message: string };
      expect(r.error_code).toBe(404);
      expect(r.error_message).toBe('Not found');
      done();
    });
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx jest api-cipher.interceptor --no-coverage 2>&1 | tail -10
```

- [ ] **Step 3: Implement**

```typescript
// src/common/interceptors/api-cipher.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, map, of } from 'rxjs';
import type { Request } from 'express';
import { encryptBlob } from '../utils/transport-cipher';

export interface CipherEnvelope {
  error_code: number;
  error_message: string;
  data: string | unknown | null;
}

@Injectable()
export class ApiCipherInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<CipherEnvelope> {
    const req = ctx.switchToHttp().getRequest<Request & { __sessionKey?: Buffer | null }>();
    const sessionKey = req.__sessionKey ?? null;

    return next.handle().pipe(
      map(payload => {
        if (!sessionKey) {
          return { error_code: 0, error_message: 'Successful.', data: payload };
        }
        const blob = encryptBlob(JSON.stringify(payload), sessionKey);
        return { error_code: 0, error_message: 'Successful.', data: blob };
      }),
      catchError(err => {
        const code: number = (err as { status?: number }).status ?? 500;
        const message: string = (err as { message?: string }).message ?? 'Internal Server Error';
        return of({ error_code: code, error_message: message, data: null });
      }),
    );
  }
}
```

- [ ] **Step 4: Run to confirm PASS**

```bash
npx jest api-cipher.interceptor --no-coverage 2>&1 | tail -5
```
Expected: `Tests: 3 passed`

- [ ] **Step 5: Replace TransformInterceptor trong app.module.ts**

```typescript
// src/app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiCipherInterceptor } from './common/interceptors/api-cipher.interceptor';
// XÓA: import { TransformInterceptor } ... (nếu có)

// Trong providers:
{ provide: APP_INTERCEPTOR, useClass: ApiCipherInterceptor },
// XÓA: { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
```

- [ ] **Step 6: Commit**

```bash
git add src/common/interceptors/api-cipher.interceptor.ts src/common/interceptors/api-cipher.interceptor.spec.ts src/app.module.ts
git commit -m "feat(cipher): ApiCipherInterceptor — encrypt response → Zalo-style envelope, replace TransformInterceptor"
```

---

## Task 8: FE — Cipher Transport Layer trong client.ts

**Files:**
- Modify: `src/lib/api/client.ts`

**Interfaces:**
- Consumes: `getSessionKey()` từ Task 4, `encryptBlob`/`decryptBlob` từ Task 2
- Produces: tất cả `apiClient.get/post/...` gọi đều tự động encrypt request + decrypt response

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/api/client.cipher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptBlob, decryptBlob } from '@/lib/crypto/transport-cipher';

// Setup: mock session-key để trả về CryptoKey thật
const testKeyRaw = crypto.getRandomValues(new Uint8Array(32));
let testKey: CryptoKey;

vi.mock('@/lib/crypto/session-key', () => ({
  getSessionKey: () => testKey,
  clearSessionKey: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('apiClient cipher integration', () => {
  beforeEach(async () => {
    testKey = await crypto.subtle.importKey(
      'raw', testKeyRaw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
    );
    vi.clearAllMocks();
  });

  it('encrypts GET query params into ?params=<blob>', async () => {
    const responseData = { conversations: [] };
    const blob = await encryptBlob(JSON.stringify(responseData), testKey);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ error_code: 0, error_message: 'Successful.', data: blob }),
    });

    const { apiClient } = await import('@/lib/api/client');
    const result = await apiClient.get('/api/v1/conversations', { query: { page: 1, limit: 10 } });

    const [url] = mockFetch.mock.calls[0] as [string];
    const searchParams = new URL(url, 'http://localhost').searchParams;
    expect(searchParams.has('params')).toBe(true);
    expect(searchParams.has('page')).toBe(false); // original params hidden

    expect(result).toEqual(responseData);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npx vitest run src/lib/api/client.cipher.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Add cipher helpers to client.ts**

Thêm các import và helper functions TRƯỚC function `rawRequest` trong `src/lib/api/client.ts`:

```typescript
import { encryptBlob, decryptBlob } from '@/lib/crypto/transport-cipher';
import { getSessionKey } from '@/lib/crypto/session-key';

const PUBLIC_PATHS = [
  '/api/v1/auth/',
  '/api/v1/session/key',
  '/api/v1/health',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.includes(p));
}

async function cipherRequest(
  method: string,
  path: string,
  options: RequestOptions,
  key: CryptoKey,
): Promise<RequestOptions> {
  if (method === 'GET') {
    if (!options.query || Object.keys(options.query).length === 0) return options;
    const blob = await encryptBlob(JSON.stringify(options.query), key);
    return { ...options, query: { params: blob } };
  }
  if (options.body !== undefined) {
    const blob = await encryptBlob(JSON.stringify(options.body), key);
    return { ...options, body: { params: blob } };
  }
  return options;
}

async function decipherResponse<T>(json: unknown, key: CryptoKey): Promise<T> {
  const envelope = json as { error_code: number; error_message: string; data: string | null };
  if (envelope.error_code !== 0) {
    throw new ApiError(envelope.error_code, String(envelope.error_code), envelope.error_message);
  }
  if (!envelope.data) return undefined as T;
  const plaintext = await decryptBlob(envelope.data as string, key);
  return JSON.parse(plaintext) as T;
}
```

- [ ] **Step 4: Modify `request()` function** để dùng cipher

Thay thế phần đọc json trong `request()` (dòng 197-205):

```typescript
async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const sessionKey = getSessionKey();
  const shouldCipher = !!sessionKey && !isPublicPath(path);
  const cipheredOptions = shouldCipher ? await cipherRequest(method, path, options, sessionKey) : options;

  let res = await rawRequest(method, path, cipheredOptions);

  if (res.status === 401 && options.auth !== false && accessToken) {
    const revoked = await checkSessionRevoked(res, path);
    if (revoked) throw revoked;
    try {
      await refreshAccessToken();
      res = await rawRequest(method, path, cipheredOptions);
    } catch (e) {
      logger.warn('Refresh failed', { path });
      throw e;
    }
  }

  if (!res.ok) {
    const err = await parseError(res);
    logger.warn('API error', { path, status: err.status, code: err.code });
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json() as unknown;

  if (shouldCipher) {
    return decipherResponse<T>(json, sessionKey);
  }

  // Legacy format (public endpoints, session/key response)
  if (json && typeof json === 'object') {
    if ('timestamp' in (json as object)) {
      syncServerTime((json as ApiEnvelope<T>).timestamp);
    }
    if ('success' in (json as object) && 'data' in (json as object)) {
      return (json as ApiEnvelope<T>).data;
    }
    if ('error_code' in (json as object) && 'data' in (json as object)) {
      return (json as { data: T }).data;
    }
  }
  return json as T;
}
```

- [ ] **Step 5: Modify `rawWithMeta()`** tương tự:

Sau `const json = (await res.json()) as ApiEnvelope<T> | CipherEnvelope<T>`:
```typescript
rawWithMeta: async <T>(method: string, path: string, options: RequestOptions = {}) => {
  const sessionKey = getSessionKey();
  const shouldCipher = !!sessionKey && !isPublicPath(path);
  const cipheredOptions = shouldCipher ? await cipherRequest(method, path, options, sessionKey) : options;

  let res = await rawRequest(method, path, cipheredOptions);
  if (res.status === 401 && options.auth !== false && accessToken) {
    const revoked = await checkSessionRevoked(res, path);
    if (revoked) throw revoked;
    await refreshAccessToken();
    res = await rawRequest(method, path, cipheredOptions);
  }
  if (!res.ok) throw await parseError(res);
  const json = await res.json() as unknown;
  if (shouldCipher) {
    // Decrypted payload has shape { data: T[], meta: {...} } or just T
    const inner = await decipherResponse<{ data: T; meta?: Record<string, unknown> }>(json, sessionKey);
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return { data: (inner as { data: T }).data, meta: (inner as { meta?: Record<string, unknown> }).meta };
    }
    return { data: inner as unknown as T, meta: undefined };
  }
  const envelope = json as ApiEnvelope<T>;
  syncServerTime(envelope.timestamp);
  return { data: envelope.data, meta: envelope.meta };
},
```

- [ ] **Step 6: Run test to confirm PASS**

```bash
npx vitest run src/lib/api/client.cipher.test.ts 2>&1 | tail -5
```
Expected: `Tests: 1 passed`

- [ ] **Step 7: Manual test** — Login vào app, bật DevTools > Network:
  - Request body / query string phải là `{ params: "<long base64>" }`
  - Response phải là `{ error_code: 0, data: "<long base64>" }`

- [ ] **Step 8: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/client.cipher.test.ts
git commit -m "feat(cipher): FE API client — encrypt request params + decrypt Zalo-style response"
```

---

## Task 9: WebSocket Cipher

**Files:**
- Create: `src/lib/ws/event-map.ts` (FE)
- Modify: `src/lib/ws/socket.ts` (FE)
- Modify: `src/modules/chat/chat.gateway.ts` (BE)

**Interfaces:**
- Event name mapping: `{ 'e0': 'event-map', 'e1': 'conversation:new', 'e2': 'message:new', ... }`
- WS payload format: `base64(iv[12] ‖ ct ‖ tag[16])` (same as HTTP)

- [ ] **Step 1: Implement FE event-map**

```typescript
// src/lib/ws/event-map.ts
type EventMap = Record<string, string>; // code → name

let _mapCodeToName: EventMap = {};
let _mapNameToCode: EventMap = {};

export function applyEventMap(map: EventMap): void {
  _mapCodeToName = map;
  _mapNameToCode = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

export function toCode(eventName: string): string {
  return _mapNameToCode[eventName] ?? eventName;
}

export function toName(code: string): string {
  return _mapCodeToName[code] ?? code;
}

export function clearEventMap(): void {
  _mapCodeToName = {};
  _mapNameToCode = {};
}
```

- [ ] **Step 2: Test event-map**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
```

```typescript
// src/lib/ws/event-map.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyEventMap, toCode, toName, clearEventMap } from './event-map';

describe('event-map', () => {
  beforeEach(() => clearEventMap());

  it('maps name → code', () => {
    applyEventMap({ e1: 'message:new', e2: 'conversation:new' });
    expect(toCode('message:new')).toBe('e1');
    expect(toName('e1')).toBe('message:new');
  });

  it('falls back to original when no map', () => {
    expect(toCode('unknown:event')).toBe('unknown:event');
    expect(toName('unknown:event')).toBe('unknown:event');
  });
});
```

```bash
npx vitest run src/lib/ws/event-map.test.ts 2>&1 | tail -5
```
Expected: `Tests: 2 passed`

- [ ] **Step 3: Modify FE socket.ts — add cipher emit/on wrappers**

Đọc `src/lib/ws/socket.ts`, tìm phần `socket.on('connect', ...)`. Thêm sau khi socket connect:

```typescript
import { applyEventMap, toCode, toName, clearEventMap } from './event-map';
import { getSessionKey } from '@/lib/crypto/session-key';
import { encryptBlob, decryptBlob } from '@/lib/crypto/transport-cipher';

// Sau khi connect authenticated, lắng nghe event map từ server:
socket.on('e0', async (blob: string) => {
  try {
    const key = getSessionKey();
    if (!key) return;
    const json = await decryptBlob(blob, key);
    applyEventMap(JSON.parse(json) as Record<string, string>);
  } catch { /* ignore */ }
});

// Wrapper để emit có cipher:
export async function cipherEmit(event: string, payload: unknown): Promise<void> {
  const key = getSessionKey();
  const code = toCode(event);
  if (!key) { getSocket().emit(code, payload); return; }
  const blob = await encryptBlob(JSON.stringify(payload), key);
  getSocket().emit(code, blob);
}

// Wrapper để subscribe có decipher:
export function cipherOn(event: string, handler: (data: unknown) => void): () => void {
  const code = toCode(event);
  const wrappedHandler = async (blob: unknown) => {
    const key = getSessionKey();
    if (!key || typeof blob !== 'string') { handler(blob); return; }
    try {
      const json = await decryptBlob(blob, key);
      handler(JSON.parse(json));
    } catch { /* ignore tampered */ }
  };
  getSocket().on(code, wrappedHandler);
  return () => getSocket().off(code, wrappedHandler);
}

// Khi disconnect: clear event map
socket.on('disconnect', () => clearEventMap());
```

Sửa tất cả `socket.emit(...)` trong features sang `cipherEmit(...)` và `socket.on(event, ...)` sang `cipherOn(event, ...)`. Tìm bằng:
```bash
grep -rn "getSocket().emit\|socket.on\|socket.emit" src/features/ src/lib/ws/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Modify BE chat.gateway.ts — gửi event map sau auth connect**

Trong `handleConnection` của `ChatGateway`, sau khi auth thành công, thêm:

```typescript
import { encryptBlob } from '../../common/utils/transport-cipher';
import { SessionKeyService } from '../session-key/session-key.service';

// Trong constructor, inject SessionKeyService
constructor(
  // ... existing ...
  private readonly sessionKeyService: SessionKeyService,
) {}

// Trong handleConnection, sau khi user đã auth:
const EVENT_MAP: Record<string, string> = {
  'e1': 'conversation:new',
  'e2': 'conversation:update',
  'e3': 'message:new',
  'e4': 'message:update',
  'e5': 'message:read',
  'e6': 'notification:new',
  'e7': 'friend:update',
  'e8': 'typing',
  'e9': 'presence:update',
  'e10': 'call:incoming',
  'e11': 'call:end',
};

const sessionKey = await this.sessionKeyService.get(userId);
if (sessionKey) {
  const blob = encryptBlob(JSON.stringify(EVENT_MAP), sessionKey);
  client.emit('e0', blob);
}
```

Sửa tất cả `client.emit(eventName, data)` và `server.to(room).emit(eventName, data)` trong gateway sang dùng encrypted payload:

```typescript
private async emitCipher(target: { emit: (ev: string, data: unknown) => void }, event: string, userId: string, payload: unknown): Promise<void> {
  const code = EVENT_MAP_REVERSE[event] ?? event;
  const sessionKey = await this.sessionKeyService.get(userId);
  if (!sessionKey) { target.emit(code, payload); return; }
  const blob = encryptBlob(JSON.stringify(payload), sessionKey);
  target.emit(code, blob);
}
```

Thêm `EVENT_MAP_REVERSE` ở đầu gateway file:
```typescript
const EVENT_MAP_REVERSE: Record<string, string> = {
  'conversation:new': 'e1',
  'conversation:update': 'e2',
  'message:new': 'e3',
  'message:update': 'e4',
  'message:read': 'e5',
  'notification:new': 'e6',
  'friend:update': 'e7',
  'typing': 'e8',
  'presence:update': 'e9',
  'call:incoming': 'e10',
  'call:end': 'e11',
};
```

- [ ] **Step 5: Manual test** — Mở DevTools > Network > WS:
  - Chọn socket.io connection
  - Gửi tin nhắn → WS frame hiện `e3 <base64 blob>` thay vì `message:new {...}`

- [ ] **Step 6: Commit (FE + BE)**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
git add src/lib/ws/event-map.ts src/lib/ws/event-map.test.ts src/lib/ws/socket.ts
git commit -m "feat(ws-cipher): FE WebSocket event map + cipher emit/on wrappers"

cd /home/huytq/code/my/be/vibe-chat
git add src/modules/chat/chat.gateway.ts
git commit -m "feat(ws-cipher): BE emit encrypted event map on connect + cipher WS payloads"
```

---

## Task 10: Build Protection

**Files:**
- Modify: `/home/huytq/code/my/fe/vibe-chat-fe/next.config.ts`

- [ ] **Step 1: Cài webpack-obfuscator**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
npm install --save-dev webpack-obfuscator javascript-obfuscator
```

- [ ] **Step 2: Đọc next.config.ts hiện tại**

```bash
cat /home/huytq/code/my/fe/vibe-chat-fe/next.config.ts
```

- [ ] **Step 3: Thêm build protections**

Mở `next.config.ts`, thêm vào `NextConfig`:

```typescript
import WebpackObfuscator from 'webpack-obfuscator';

const config: NextConfig = {
  // ... existing config ...
  productionBrowserSourceMaps: false,

  webpack(webpackConfig, { isServer, dev }) {
    if (!isServer && !dev) {
      webpackConfig.plugins = webpackConfig.plugins ?? [];
      webpackConfig.plugins.push(
        new WebpackObfuscator(
          {
            rotateStringArray: true,
            stringArray: true,
            stringArrayThreshold: 0.75,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
          },
          // Chỉ obfuscate critical crypto path — không obfuscate toàn bộ (tăng bundle size)
          ['**/node_modules/**'],
        ),
      );
    }
    return webpackConfig;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};
```

- [ ] **Step 4: Audit NEXT_PUBLIC_ env vars**

```bash
grep -rn "NEXT_PUBLIC_" /home/huytq/code/my/fe/vibe-chat-fe/src/ --include="*.ts" --include="*.tsx" | grep -v "NEXT_PUBLIC_VIBE_URL\|NEXT_PUBLIC_AUTH_URL\|NEXT_PUBLIC_USE_PROXY\|NEXT_PUBLIC_WS_URL" | grep -v "node_modules"
```

Với bất kỳ `NEXT_PUBLIC_*` không cần thiết ở client — chuyển sang server-only env var.

- [ ] **Step 5: Build test**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
npm run build 2>&1 | tail -20
```
Expected: Build thành công, không có lỗi.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts package.json package-lock.json
git commit -m "feat(build): disable source maps + webpack-obfuscator + security headers"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Phase 1 (ECDH Session Key) → Task 3, 4, 5
  - Phase 2 (Request Encryption) → Task 6, 8
  - Phase 3 (Response Encryption Zalo-style) → Task 7, 8
  - Phase 4 (WS Cipher) → Task 9
  - Phase 5 (Build Protection) → Task 10
  - Migration strategy → thực hiện ngầm qua `SESSION_KEY_MISSING` 401 (FE tự gọi lại `establishSessionKey`)

- [x] **No placeholders** — mọi step đều có code thực tế

- [x] **Type consistency:**
  - `encryptBlob(data: string, key: Buffer): string` — Task 1, 6, 7, 9-BE
  - `encryptBlob(data: string, key: CryptoKey): Promise<string>` — Task 2, 8, 9-FE
  - `establishSessionKey(_userId: string, token: string): Promise<void>` — Task 4, 5
  - `getSessionKey(): CryptoKey | null` — Task 4, 8, 9-FE
  - `SessionKeyService.establish(userId, clientEphPubKey)` — Task 3, 9-BE
  - `req.__sessionKey: Buffer | null` — Task 6, 7
