# BFF Auth P0 — Nền tảng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền BFF auth: cookie `httpOnly` do Next giữ, `proxy.ts` refresh + gắn Bearer + bảo vệ route + chặn CSRF, route handler login/token/logout — chạy với BE hiện tại, bật bằng cờ `NEXT_PUBLIC_AUTH_MODE=bff`, mặc định `legacy` (hành vi cũ không đổi).

**Architecture:** Server Next gọi `AUTH_URL` thay trình duyệt, đọc refresh token từ `Set-Cookie` của BE rồi đặt lại cookie `path=/` của riêng mình. Refresh chỉ xảy ra ở một nơi (single-flight + cache 10s theo refresh token cũ). Trình duyệt vẫn nhận `accessToken` trong body (cầu nối tạm) để socket/task/notion/upload chạy như cũ; cầu nối bị gỡ ở P2.

**Tech Stack:** Next 16 (`proxy.ts`, Route Handler, `NextRequest/NextResponse`), Zod 4, Vitest 4 (`// @vitest-environment node` cho code server).

**Spec:** `docs/superpowers/specs/2026-10-03-bff-auth-hybrid-design.md` (§3.1, §3.2, §3.8 và §6 mục 1). Điều chỉnh so với spec: P0 **không** gỡ token khỏi client, **không** có `session.ts`/`server-fetch.ts` (dời sang P1 vì chưa có nơi dùng), **không** có double-submit CSRF/danh sách thiết bị (cần BE, dời sang giai đoạn sau). Lý do: `apiAuth.getToken()` có >30 chỗ gọi (socket, task-client, media upload, notion export, collab) và nhiều service được trình duyệt gọi thẳng origin khác.

## Global Constraints

- Cookie: `httpOnly`, `Secure` (khi HTTPS), `SameSite=Lax`, `path=/`; tiền tố `__Host-` khi `Secure`; access cookie sống theo `expiresIn`; refresh cookie 90 ngày.
- Không `any`, không `@ts-ignore`, không `eslint-disable` (CLAUDE.md §0.1). File < 300 dòng, function < 50 dòng, hook < 80 dòng.
- Zod validate mọi input từ client và mọi response upstream tại biên server (CLAUDE.md §0.8).
- Không log token/mật khẩu/PII; log qua `@/lib/logger` (rules/05-security.md §8).
- Named export, trừ file bắt buộc default/đặc biệt của Next. Route handler export `POST`/`GET`; `proxy.ts` export `proxy` và `config`.
- Comment bằng tiếng Việt, ngắn, chỉ giải thích "vì sao". Trả lời/commit message tiếng Việt kiểu Conventional Commits như lịch sử repo (`feat(auth): ...`).
- Thêm lib mới: **cấm** trong plan này (chỉ dùng thứ có sẵn).
- Mỗi task kết thúc bằng `npx vitest run <file>` xanh và `npx tsc --noEmit` không lỗi mới.
- Đường dẫn import dùng alias `@/...`. Test server đặt `// @vitest-environment node` ở dòng đầu.

## Review Focus

1. **Giới hạn tốc độ login của BE (5 req/phút/IP) sụp đổ** vì mọi request giờ đến từ IP server Next → phải chuyển tiếp `x-forwarded-for` và `user-agent` (Task 4). BE phải tin proxy; ghi vào "Việc phía BE".
2. **Refresh song song/trễ:** hai request mang cùng refresh token cũ (trong 10 giây) phải nhận cùng kết quả, không gọi BE lần hai (Task 5).
3. **Vòng lặp redirect khi phiên bị thu hồi:** access cookie còn "hạn" nhưng BE đã thu hồi phiên → client gọi `/api/auth/token` với `forceRefresh` → refresh thất bại phải xoá cookie, nếu không `/login` ↔ `/chat` lặp vô hạn (Task 7, 9).
4. **Cookie cũ `refresh_token` `path=/api` do BE đặt** cùng tên với cookie mới ở chế độ HTTP → phải xoá cookie cũ khi login/logout (Task 6).
5. **CSRF:** POST thiếu cả `Origin` lẫn `Sec-Fetch-Site`, hoặc `cross-site`, vào `/api/auth/*` và `/api/v1/*` bị từ chối 403 (Task 3, 7, 8).
6. Body trả về cho trình duyệt không chứa `refreshToken` (luôn chuỗi rỗng); response có `cache-control: no-store` (Task 7).

## Việc phía BE (không thuộc plan này, ghi lại để theo dõi)

- Tin `x-forwarded-for` từ Next server để rate limit đúng IP người dùng.
- (P2) ticket WS, họ refresh token, `sid`, thu hồi theo thiết bị — xem spec §6.

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/config/env.ts` (sửa) | thêm `NEXT_PUBLIC_AUTH_MODE` |
| `src/lib/auth/cookies.ts` | tên/tuỳ chọn cookie, đọc cookie, gộp header `cookie`, nhận diện HTTPS |
| `src/lib/auth/jwt-exp.ts` | đọc `exp` từ JWT để tính giây còn lại |
| `src/lib/auth/server/config.ts` | đọc cấu hình auth phía server (Zod) |
| `src/lib/auth/server/csrf.ts` | `isTrustedRequest` (Origin / Sec-Fetch-Site) |
| `src/lib/auth/server/upstream.ts` | gọi `AUTH_URL` login/refresh/logout, trích refresh token từ `Set-Cookie` |
| `src/lib/auth/server/refresh.ts` | single-flight + cache 10s |
| `src/lib/auth/server/session-cookies.ts` | ghi/xoá cookie phiên lên `NextResponse` |
| `src/lib/auth/server/responses.ts` | envelope lỗi + `no-store` |
| `src/app/api/auth/login/route.ts`, `token/route.ts`, `logout/route.ts` | BFF endpoints |
| `src/proxy.ts` | refresh, bảo vệ route, gắn Bearer, CSRF |
| `src/lib/api/auth-endpoints.ts` | chọn endpoint theo chế độ, dọn phiên BFF |
| `src/lib/api/client.ts`, `src/services/auth.api.ts` (sửa) | dùng endpoint theo chế độ |

---

### Task 1: Cờ chế độ + cấu hình server

**Files:**
- Modify: `src/config/env.ts`
- Modify: `.env.example`
- Create: `src/lib/auth/server/config.ts`
- Test: `src/lib/auth/server/config.test.ts`

**Interfaces:**
- Produces:
  - `env.NEXT_PUBLIC_AUTH_MODE: 'legacy' | 'bff'` (mặc định `'legacy'`)
  - `isBffMode(): boolean`
  - `readAuthServerConfig(): AuthServerConfig` với `type AuthServerConfig = { mode: 'legacy' | 'bff'; authUrl: string; allowedOrigins: string[] }`

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/server/config.test.ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBffMode, readAuthServerConfig } from './config';

describe('auth server config', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('mặc định là legacy', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', '');
    expect(isBffMode()).toBe(false);
  });

  it('nhận bff', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'bff');
    expect(isBffMode()).toBe(true);
  });

  it('đọc AUTH_URL và danh sách origin', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'bff');
    vi.stubEnv('AUTH_URL', 'http://auth.test');
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'https://a.test, https://b.test ,');
    expect(readAuthServerConfig()).toEqual({
      mode: 'bff',
      authUrl: 'http://auth.test',
      allowedOrigins: ['https://a.test', 'https://b.test'],
    });
  });

  it('fallback sang NEXT_PUBLIC_AUTH_URL khi thiếu AUTH_URL', () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('NEXT_PUBLIC_AUTH_URL', 'http://localhost:3006');
    expect(readAuthServerConfig().authUrl).toBe('http://localhost:3006');
  });

  it('ném lỗi khi cờ không hợp lệ', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'xyz');
    vi.stubEnv('AUTH_URL', 'http://auth.test');
    expect(() => readAuthServerConfig()).toThrow();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/server/config.test.ts`
Expected: FAIL — `Cannot find module './config'`

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/server/config.ts
import { z } from 'zod';

const configSchema = z.object({
  mode: z.enum(['legacy', 'bff']),
  authUrl: z.string().url(),
  allowedOrigins: z.array(z.string()),
});

export type AuthServerConfig = z.infer<typeof configSchema>;

/** Rẻ, dùng ở đầu `proxy.ts` để chế độ legacy không phải đọc AUTH_URL. */
export function isBffMode(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'bff';
}

export function readAuthServerConfig(): AuthServerConfig {
  return configSchema.parse({
    mode: process.env.NEXT_PUBLIC_AUTH_MODE || 'legacy',
    authUrl: process.env.AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL,
    allowedOrigins: (process.env.AUTH_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
}
```

Trong `src/config/env.ts` thêm vào `schema` (sau `NEXT_PUBLIC_USE_PROXY`):

```ts
  // legacy: token do JS giữ (hành vi cũ). bff: cookie httpOnly do Next giữ, bắt buộc USE_PROXY=true.
  NEXT_PUBLIC_AUTH_MODE: z.enum(['legacy', 'bff']).default('legacy'),
```

và thêm vào object truyền cho `schema.safeParse(...)`:

```ts
  NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE || undefined,
```

Trong `.env.example`, ngay dưới dòng `NEXT_PUBLIC_USE_PROXY=true` thêm:

```
# legacy | bff — bff cần NEXT_PUBLIC_USE_PROXY=true và AUTH_URL (server)
NEXT_PUBLIC_AUTH_MODE=legacy
# Origin được phép gọi ghi vào /api/* ngoài same-origin, phân tách bằng dấu phẩy (thường để trống)
AUTH_ALLOWED_ORIGINS=
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/server/config.test.ts && npx tsc --noEmit`
Expected: PASS, không lỗi kiểu

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts .env.example src/lib/auth/server/config.ts src/lib/auth/server/config.test.ts
git commit -m "feat(auth): thêm cờ AUTH_MODE và cấu hình auth phía server"
```

---

### Task 2: Cookie và JWT helper

**Files:**
- Create: `src/lib/auth/cookies.ts`
- Create: `src/lib/auth/jwt-exp.ts`
- Test: `src/lib/auth/cookies.test.ts`, `src/lib/auth/jwt-exp.test.ts`

**Interfaces:**
- Produces (từ `cookies.ts`):
  - `COOKIE_BASE = { access: 'access_token', refresh: 'refresh_token' } as const`; `type CookieKind = 'access' | 'refresh'`
  - `REFRESH_MAX_AGE_SECONDS: number` (= 90 ngày), `ACCESS_EXPIRY_SKEW_SECONDS: number` (= 30)
  - `cookieName(kind: CookieKind, secure: boolean): string`
  - `type CookieReader = { get(name: string): { value: string } | undefined }`
  - `readSessionCookie(reader: CookieReader, kind: CookieKind): string | null`
  - `sessionCookieOptions(secure: boolean, maxAge: number): { httpOnly: true; secure: boolean; sameSite: 'lax'; path: '/'; maxAge: number }`
  - `accessMaxAge(expiresIn: number): number` (= `max(expiresIn - skew, 1)`)
  - `isSecureRequest(headers: Headers, url: string): boolean`
  - `withCookies(header: string | null, updates: Record<string, string>): string`
- Produces (từ `jwt-exp.ts`): `secondsUntilExpiry(token: string, nowMs?: number, fallbackSeconds?: number): number`

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/cookies.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  accessMaxAge,
  cookieName,
  isSecureRequest,
  readSessionCookie,
  sessionCookieOptions,
  withCookies,
} from './cookies';

function reader(values: Record<string, string>) {
  return { get: (name: string) => (name in values ? { value: values[name] } : undefined) };
}

describe('cookies', () => {
  it('dùng tiền tố __Host- khi secure', () => {
    expect(cookieName('access', true)).toBe('__Host-access_token');
    expect(cookieName('refresh', false)).toBe('refresh_token');
  });

  it('đọc được cả hai biến thể tên, ưu tiên __Host-', () => {
    expect(readSessionCookie(reader({ '__Host-access_token': 'a', access_token: 'b' }), 'access')).toBe('a');
    expect(readSessionCookie(reader({ refresh_token: 'r' }), 'refresh')).toBe('r');
    expect(readSessionCookie(reader({}), 'refresh')).toBeNull();
  });

  it('tuỳ chọn cookie luôn httpOnly, lax, path=/', () => {
    expect(sessionCookieOptions(true, 60)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60,
    });
  });

  it('access cookie hết sớm 30 giây, tối thiểu 1', () => {
    expect(accessMaxAge(900)).toBe(870);
    expect(accessMaxAge(10)).toBe(1);
  });

  it('nhận diện HTTPS qua x-forwarded-proto trước, rồi tới URL', () => {
    expect(isSecureRequest(new Headers({ 'x-forwarded-proto': 'https' }), 'http://app.test/x')).toBe(true);
    expect(isSecureRequest(new Headers(), 'https://app.test/x')).toBe(true);
    expect(isSecureRequest(new Headers(), 'http://127.0.0.1:3000/x')).toBe(false);
    expect(isSecureRequest(new Headers({ 'x-forwarded-proto': 'http' }), 'https://app.test/x')).toBe(false);
  });

  it('gộp header cookie: thay giá trị cũ, giữ cookie khác, mã hoá giá trị mới', () => {
    const merged = withCookies('a=1; access_token=old; b=2', { access_token: 'n e/w' });
    expect(merged).toBe('a=1; b=2; access_token=n%20e%2Fw');
    expect(withCookies(null, { x: 'y' })).toBe('x=y');
  });
});
```

```ts
// src/lib/auth/jwt-exp.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { secondsUntilExpiry } from './jwt-exp';

function jwt(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `h.${body}.s`;
}

describe('secondsUntilExpiry', () => {
  const now = 1_700_000_000_000;

  it('tính giây còn lại từ claim exp', () => {
    expect(secondsUntilExpiry(jwt({ exp: 1_700_000_300 }), now)).toBe(300);
  });

  it('không âm khi đã hết hạn', () => {
    expect(secondsUntilExpiry(jwt({ exp: 1_699_999_000 }), now)).toBe(0);
  });

  it('dùng giá trị dự phòng khi không đọc được exp', () => {
    expect(secondsUntilExpiry('không-phải-jwt', now, 45)).toBe(45);
    expect(secondsUntilExpiry(jwt({ sub: 'x' }), now, 45)).toBe(45);
    expect(secondsUntilExpiry('h.@@@.s', now)).toBe(60);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/cookies.test.ts src/lib/auth/jwt-exp.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/cookies.ts
export const COOKIE_BASE = { access: 'access_token', refresh: 'refresh_token' } as const;
export type CookieKind = keyof typeof COOKIE_BASE;

export const REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
/** Cookie access hết sớm hơn token thật để proxy refresh trước khi token chết. */
export const ACCESS_EXPIRY_SKEW_SECONDS = 30;

export type CookieReader = { get(name: string): { value: string } | undefined };

/** `__Host-` bắt buộc Secure + path=/ + không Domain, nên chỉ dùng khi chạy HTTPS. */
export function cookieName(kind: CookieKind, secure: boolean): string {
  const base = COOKIE_BASE[kind];
  return secure ? `__Host-${base}` : base;
}

export function readSessionCookie(reader: CookieReader, kind: CookieKind): string | null {
  return reader.get(cookieName(kind, true))?.value || reader.get(cookieName(kind, false))?.value || null;
}

export function sessionCookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge };
}

export function accessMaxAge(expiresIn: number): number {
  return Math.max(expiresIn - ACCESS_EXPIRY_SKEW_SECONDS, 1);
}

export function isSecureRequest(headers: Headers, url: string): boolean {
  const forwarded = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwarded || new URL(url).protocol.replace(':', '');
  return protocol === 'https';
}

/** Cập nhật header `cookie` của request để Server Component cùng request thấy token mới. */
export function withCookies(header: string | null, updates: Record<string, string>): string {
  const kept = (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !Object.hasOwn(updates, part.split('=')[0] ?? ''));
  const added = Object.entries(updates).map(([name, value]) => `${name}=${encodeURIComponent(value)}`);
  return [...kept, ...added].join('; ');
}
```

```ts
// src/lib/auth/jwt-exp.ts
const DEFAULT_FALLBACK_SECONDS = 60;

function readExp(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof json === 'object' && json !== null && 'exp' in json && typeof json.exp === 'number') {
      return json.exp;
    }
  } catch {
    return null;
  }
  return null;
}

/** Chỉ đọc claim `exp` để tính thời gian còn lại; KHÔNG xác thực chữ ký (việc của BE). */
export function secondsUntilExpiry(
  token: string,
  nowMs: number = Date.now(),
  fallbackSeconds: number = DEFAULT_FALLBACK_SECONDS,
): number {
  const exp = readExp(token);
  if (exp === null) return fallbackSeconds;
  return Math.max(Math.floor(exp - nowMs / 1000), 0);
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/cookies.test.ts src/lib/auth/jwt-exp.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/cookies.ts src/lib/auth/cookies.test.ts src/lib/auth/jwt-exp.ts src/lib/auth/jwt-exp.test.ts
git commit -m "feat(auth): helper cookie phiên và đọc hạn JWT"
```

---

### Task 3: Kiểm tra CSRF

**Files:**
- Create: `src/lib/auth/server/csrf.ts`
- Test: `src/lib/auth/server/csrf.test.ts`

**Interfaces:**
- Produces: `isTrustedRequest(req: { method: string; headers: Headers }, allowedOrigins?: readonly string[]): boolean`

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/server/csrf.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isTrustedRequest } from './csrf';

function req(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers(headers) };
}

describe('isTrustedRequest', () => {
  it('cho qua method an toàn', () => {
    expect(isTrustedRequest(req('GET'))).toBe(true);
    expect(isTrustedRequest(req('HEAD'))).toBe(true);
    expect(isTrustedRequest(req('OPTIONS'))).toBe(true);
  });

  it('cho qua ghi same-origin và none (người dùng tự gõ)', () => {
    expect(isTrustedRequest(req('POST', { 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isTrustedRequest(req('POST', { 'sec-fetch-site': 'none' }))).toBe(true);
  });

  it('chặn ghi cross-site và same-site', () => {
    expect(isTrustedRequest(req('POST', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.test' }))).toBe(false);
    expect(isTrustedRequest(req('DELETE', { 'sec-fetch-site': 'same-site' }))).toBe(false);
  });

  it('chặn ghi thiếu cả Origin lẫn Sec-Fetch-Site', () => {
    expect(isTrustedRequest(req('POST'))).toBe(false);
  });

  it('không có Sec-Fetch-Site: so Origin với host', () => {
    expect(isTrustedRequest(req('POST', { origin: 'https://app.test', host: 'app.test' }))).toBe(true);
    expect(isTrustedRequest(req('POST', { origin: 'https://evil.test', host: 'app.test' }))).toBe(false);
    expect(
      isTrustedRequest(req('POST', { origin: 'https://app.test', host: 'internal:3000', 'x-forwarded-host': 'app.test' })),
    ).toBe(true);
  });

  it('chấp nhận origin trong danh sách cho phép dù cross-site', () => {
    const headers = { 'sec-fetch-site': 'cross-site', origin: 'https://ok.test' };
    expect(isTrustedRequest(req('POST', headers), ['https://ok.test'])).toBe(true);
    expect(isTrustedRequest(req('POST', headers), ['https://other.test'])).toBe(false);
  });

  it('Origin rác không làm ném lỗi', () => {
    expect(isTrustedRequest(req('POST', { origin: 'không-phải-url', host: 'app.test' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/server/csrf.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/server/csrf.ts
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type TrustCheckInput = { method: string; headers: Headers };

/**
 * Cookie tự được trình duyệt đính kèm nên mọi request ghi phải chứng minh là same-origin.
 * Ưu tiên `Sec-Fetch-Site` (trình duyệt đặt, JS không giả được), rồi tới `Origin`.
 */
export function isTrustedRequest(
  req: TrustCheckInput,
  allowedOrigins: readonly string[] = [],
): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin' || site === 'none') return true;

  const origin = req.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) return true;
  if (site || !origin) return false;

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/server/csrf.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/server/csrf.ts src/lib/auth/server/csrf.test.ts
git commit -m "feat(auth): kiểm tra CSRF bằng Sec-Fetch-Site và Origin"
```

---

### Task 4: Client gọi auth-service (upstream)

**Files:**
- Create: `src/lib/auth/server/upstream.ts`
- Test: `src/lib/auth/server/upstream.test.ts`

**Interfaces:**
- Consumes: `readAuthServerConfig` (Task 1), `logger` từ `@/lib/logger`
- Produces:
  - `type ForwardHeaders = { ip: string | null; userAgent: string | null }`
  - `forwardHeaders(headers: Headers): ForwardHeaders`
  - `type UpstreamFailure = { ok: false; status: number; body: unknown }`
  - `type LoginData = { tokens: { accessToken: string; expiresIn: number; tokenType: string }; user: Record<string, unknown> }`
  - `type LoginSuccess = { ok: true; data: LoginData; timestamp: string; refreshToken: string }`
  - `type RefreshSuccess = { ok: true; accessToken: string; expiresIn: number; refreshToken: string }`
  - `upstreamLogin(input: { username: string; password: string; deviceType: string; deviceName?: string }, forward: ForwardHeaders): Promise<LoginSuccess | UpstreamFailure>`
  - `upstreamRefresh(refreshToken: string, forward: ForwardHeaders): Promise<RefreshSuccess | UpstreamFailure>`
  - `upstreamLogout(accessToken: string | null, refreshToken: string | null, forward: ForwardHeaders): Promise<void>` (không bao giờ ném)

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/server/upstream.test.ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardHeaders, upstreamLogin, upstreamLogout, upstreamRefresh } from './upstream';

const FORWARD = { ip: '203.0.113.9', userAgent: 'UA/1' };

function json(body: unknown, init: { status?: number; cookies?: string[] } = {}): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const cookie of init.cookies ?? []) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

const LOGIN_OK = {
  success: true,
  data: {
    tokens: { accessToken: 'acc', refreshToken: '', expiresIn: 900, tokenType: 'Bearer' },
    user: { id: 'u1', username: 'huy' },
  },
  timestamp: '2026-10-04T00:00:00.000Z',
};

describe('upstream auth', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('AUTH_URL', 'http://auth.test');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('forwardHeaders lấy ip và user-agent', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'user-agent': 'X' });
    expect(forwardHeaders(headers)).toEqual({ ip: '1.2.3.4, 5.6.7.8', userAgent: 'X' });
    expect(forwardHeaders(new Headers({ 'x-real-ip': '9.9.9.9' })).ip).toBe('9.9.9.9');
  });

  it('login thành công: trích refresh token từ Set-Cookie', async () => {
    fetchMock.mockResolvedValue(
      json(LOGIN_OK, { cookies: ['refresh_token=rt1; Path=/api; HttpOnly; Max-Age=7776000'] }),
    );
    const result = await upstreamLogin({ username: 'huy', password: 'pw', deviceType: 'WEB' }, FORWARD);
    expect(result).toMatchObject({ ok: true, refreshToken: 'rt1', timestamp: LOGIN_OK.timestamp });
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.tokens.accessToken).toBe('acc');
    expect(result.data.user).toEqual({ id: 'u1', username: 'huy' });
  });

  it('login chuyển tiếp IP và user-agent tới BE', async () => {
    fetchMock.mockResolvedValue(json(LOGIN_OK, { cookies: ['refresh_token=rt1; Path=/api'] }));
    await upstreamLogin({ username: 'a', password: 'b', deviceType: 'WEB', deviceName: 'Chrome' }, FORWARD);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://auth.test/api/v1/auth/login');
    const headers = new Headers(init.headers);
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.9');
    expect(headers.get('user-agent')).toBe('UA/1');
    expect(JSON.parse(String(init.body))).toEqual({
      username: 'a',
      password: 'b',
      deviceType: 'WEB',
      deviceName: 'Chrome',
    });
  });

  it('login lỗi 401: trả nguyên status và body của BE', async () => {
    const body = { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Sai mật khẩu' } };
    fetchMock.mockResolvedValue(json(body, { status: 401 }));
    expect(await upstreamLogin({ username: 'a', password: 'b', deviceType: 'WEB' }, FORWARD)).toEqual({
      ok: false,
      status: 401,
      body,
    });
  });

  it('login thiếu refresh cookie: 502', async () => {
    fetchMock.mockResolvedValue(json(LOGIN_OK));
    const result = await upstreamLogin({ username: 'a', password: 'b', deviceType: 'WEB' }, FORWARD);
    expect(result).toMatchObject({ ok: false, status: 502 });
  });

  it('login lỗi mạng: 502 với mã AUTH_UPSTREAM_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await upstreamLogin({ username: 'a', password: 'b', deviceType: 'WEB' }, FORWARD);
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(result)).toContain('AUTH_UPSTREAM_UNAVAILABLE');
  });

  it('login body BE sai shape: 502', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { nope: 1 } }, { cookies: ['refresh_token=r'] }));
    expect(await upstreamLogin({ username: 'a', password: 'b', deviceType: 'WEB' }, FORWARD)).toMatchObject({
      ok: false,
      status: 502,
    });
  });

  it('refresh gửi cookie, nhận refresh token đã xoay vòng', async () => {
    fetchMock.mockResolvedValue(
      json({ success: true, data: { accessToken: 'acc2', expiresIn: 900 } }, { cookies: ['refresh_token=rt2; Path=/api'] }),
    );
    const result = await upstreamRefresh('rt1', FORWARD);
    expect(result).toEqual({ ok: true, accessToken: 'acc2', expiresIn: 900, refreshToken: 'rt2' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://auth.test/api/v1/auth/refresh');
    expect(new Headers(init.headers).get('cookie')).toBe('refresh_token=rt1');
  });

  it('refresh không xoay vòng: giữ refresh token cũ', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { accessToken: 'acc2', expiresIn: 900 } }));
    expect(await upstreamRefresh('rt1', FORWARD)).toMatchObject({ ok: true, refreshToken: 'rt1' });
  });

  it('refresh 401: trả failure', async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: { code: 'AUTH_REFRESH_FAILED' } }, { status: 401 }));
    expect(await upstreamRefresh('rt1', FORWARD)).toMatchObject({ ok: false, status: 401 });
  });

  it('logout không ném khi BE lỗi', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    await expect(upstreamLogout('acc', 'rt1', FORWARD)).resolves.toBeUndefined();
  });

  it('logout gửi Bearer và cookie', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await upstreamLogout('acc', 'rt1', FORWARD);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://auth.test/api/v1/auth/logout');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer acc');
    expect(headers.get('cookie')).toBe('refresh_token=rt1');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/server/upstream.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/server/upstream.ts
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { readAuthServerConfig } from './config';

const UPSTREAM_TIMEOUT_MS = 8_000;
const REFRESH_SET_COOKIE = /^refresh_token=([^;]*)/;

export type ForwardHeaders = { ip: string | null; userAgent: string | null };
export type UpstreamFailure = { ok: false; status: number; body: unknown };

const accessSchema = z.object({ accessToken: z.string().min(1), expiresIn: z.number().positive() });
const loginDataSchema = z.object({
  tokens: accessSchema.extend({ tokenType: z.string().default('Bearer') }),
  user: z.record(z.string(), z.unknown()),
});
const loginEnvelopeSchema = z.object({ data: loginDataSchema, timestamp: z.string().default('') });
const refreshEnvelopeSchema = z.object({ data: accessSchema });

export type LoginData = z.infer<typeof loginDataSchema>;
export type LoginSuccess = { ok: true; data: LoginData; timestamp: string; refreshToken: string };
export type RefreshSuccess = { ok: true; accessToken: string; expiresIn: number; refreshToken: string };

export function forwardHeaders(headers: Headers): ForwardHeaders {
  return {
    // BE giới hạn tốc độ theo IP: không chuyển tiếp thì mọi người dùng cùng dùng IP của server Next.
    ip: headers.get('x-forwarded-for') ?? headers.get('x-real-ip'),
    userAgent: headers.get('user-agent'),
  };
}

function gatewayFailure(code: string, message: string): UpstreamFailure {
  return {
    ok: false,
    status: 502,
    body: { success: false, error: { code, message }, timestamp: new Date().toISOString() },
  };
}

function extractRefreshToken(res: Response): string | null {
  for (const line of res.headers.getSetCookie()) {
    const match = REFRESH_SET_COOKIE.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function post(
  path: string,
  forward: ForwardHeaders,
  extra: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<Response | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra.headers };
  if (forward.ip) headers['x-forwarded-for'] = forward.ip;
  if (forward.userAgent) headers['user-agent'] = forward.userAgent;
  try {
    return await fetch(`${readAuthServerConfig().authUrl}${path}`, {
      method: 'POST',
      headers,
      body: extra.body === undefined ? undefined : JSON.stringify(extra.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('Auth upstream unreachable', { path, reason: error instanceof Error ? error.name : 'unknown' });
    return null;
  }
}

async function failureFrom(res: Response): Promise<UpstreamFailure> {
  const body: unknown = await res.json().catch(() => null);
  return { ok: false, status: res.status, body };
}

const UNAVAILABLE = () => gatewayFailure('AUTH_UPSTREAM_UNAVAILABLE', 'Không kết nối được dịch vụ xác thực');
const BAD_RESPONSE = () => gatewayFailure('AUTH_UPSTREAM_INVALID', 'Dịch vụ xác thực trả dữ liệu không hợp lệ');

export async function upstreamLogin(
  input: { username: string; password: string; deviceType: string; deviceName?: string },
  forward: ForwardHeaders,
): Promise<LoginSuccess | UpstreamFailure> {
  const res = await post('/api/v1/auth/login', forward, { body: input });
  if (!res) return UNAVAILABLE();
  if (!res.ok) return failureFrom(res);

  const refreshToken = extractRefreshToken(res);
  const parsed = loginEnvelopeSchema.safeParse(await res.json().catch(() => null));
  if (!refreshToken || !parsed.success) return BAD_RESPONSE();
  return { ok: true, data: parsed.data.data, timestamp: parsed.data.timestamp, refreshToken };
}

export async function upstreamRefresh(
  refreshToken: string,
  forward: ForwardHeaders,
): Promise<RefreshSuccess | UpstreamFailure> {
  const res = await post('/api/v1/auth/refresh', forward, {
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });
  if (!res) return UNAVAILABLE();
  if (!res.ok) return failureFrom(res);

  const parsed = refreshEnvelopeSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return BAD_RESPONSE();
  return {
    ok: true,
    accessToken: parsed.data.data.accessToken,
    expiresIn: parsed.data.data.expiresIn,
    // BE không xoay vòng thì không có Set-Cookie: giữ token cũ.
    refreshToken: extractRefreshToken(res) ?? refreshToken,
  };
}

export async function upstreamLogout(
  accessToken: string | null,
  refreshToken: string | null,
  forward: ForwardHeaders,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (refreshToken) headers.Cookie = `refresh_token=${refreshToken}`;
  await post('/api/v1/auth/logout', forward, { headers });
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/server/upstream.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/server/upstream.ts src/lib/auth/server/upstream.test.ts
git commit -m "feat(auth): client gọi auth-service từ server, chuyển tiếp IP/UA"
```

---

### Task 5: Refresh single-flight có cache ngắn

**Files:**
- Create: `src/lib/auth/server/refresh.ts`
- Test: `src/lib/auth/server/refresh.test.ts`

**Interfaces:**
- Consumes: `upstreamRefresh`, `ForwardHeaders`, `RefreshSuccess`, `UpstreamFailure` (Task 4)
- Produces:
  - `refreshOnce(refreshToken: string, forward: ForwardHeaders): Promise<RefreshSuccess | UpstreamFailure>`
  - `resetRefreshCache(): void` (chỉ cho test)

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/server/refresh.test.ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshOnce, resetRefreshCache } from './refresh';
import { upstreamRefresh } from './upstream';

vi.mock('./upstream', () => ({ upstreamRefresh: vi.fn() }));

const FORWARD = { ip: null, userAgent: null };
const OK = { ok: true as const, accessToken: 'a2', expiresIn: 900, refreshToken: 'r2' };
const mocked = vi.mocked(upstreamRefresh);

describe('refreshOnce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRefreshCache();
    mocked.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('gộp các lần gọi đồng thời cùng refresh token thành một request', async () => {
    mocked.mockResolvedValue(OK);
    const results = await Promise.all([
      refreshOnce('r1', FORWARD),
      refreshOnce('r1', FORWARD),
      refreshOnce('r1', FORWARD),
    ]);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === results[0])).toBe(true);
  });

  it('request đến trễ mang token cũ trong 10 giây nhận cùng kết quả', async () => {
    mocked.mockResolvedValue(OK);
    await refreshOnce('r1', FORWARD);
    vi.advanceTimersByTime(9_000);
    expect(await refreshOnce('r1', FORWARD)).toEqual(OK);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it('sau 10 giây gọi BE lại', async () => {
    mocked.mockResolvedValue(OK);
    await refreshOnce('r1', FORWARD);
    vi.advanceTimersByTime(10_001);
    await refreshOnce('r1', FORWARD);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('token khác nhau không dùng chung kết quả', async () => {
    mocked.mockResolvedValue(OK);
    await refreshOnce('r1', FORWARD);
    await refreshOnce('r9', FORWARD);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('không cache kết quả lỗi: lần sau thử lại', async () => {
    mocked.mockResolvedValueOnce({ ok: false, status: 502, body: null }).mockResolvedValueOnce(OK);
    expect(await refreshOnce('r1', FORWARD)).toMatchObject({ ok: false });
    expect(await refreshOnce('r1', FORWARD)).toEqual(OK);
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/server/refresh.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/server/refresh.ts
import { createHash } from 'node:crypto';
import { upstreamRefresh, type ForwardHeaders, type RefreshSuccess, type UpstreamFailure } from './upstream';

type Outcome = RefreshSuccess | UpstreamFailure;
type Entry = { promise: Promise<Outcome>; settledAt: number | null };

/**
 * Request đã bắt đầu trước khi trình duyệt nhận cookie mới vẫn mang refresh token cũ.
 * Giữ kết quả thành công ngắn hạn để chúng nhận lại cùng token thay vì refresh lần hai
 * (BE xoay vòng sẽ coi lần hai là dùng lại token và thu hồi phiên).
 */
const RESULT_TTL_MS = 10_000;

const entries = new Map<string, Entry>();

function keyOf(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function prune(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.settledAt !== null && now - entry.settledAt >= RESULT_TTL_MS) entries.delete(key);
  }
}

export function refreshOnce(refreshToken: string, forward: ForwardHeaders): Promise<Outcome> {
  const now = Date.now();
  prune(now);
  const key = keyOf(refreshToken);
  const existing = entries.get(key);
  if (existing) return existing.promise;

  const entry: Entry = {
    settledAt: null,
    promise: upstreamRefresh(refreshToken, forward).then((outcome) => {
      if (outcome.ok) entry.settledAt = Date.now();
      else entries.delete(key);
      return outcome;
    }),
  };
  entries.set(key, entry);
  return entry.promise;
}

export function resetRefreshCache(): void {
  entries.clear();
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/server/refresh.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/server/refresh.ts src/lib/auth/server/refresh.test.ts
git commit -m "feat(auth): gộp refresh đồng thời và cache 10s theo refresh token"
```

---

### Task 6: Ghi/xoá cookie phiên và response helper

**Files:**
- Create: `src/lib/auth/server/session-cookies.ts`
- Create: `src/lib/auth/server/responses.ts`
- Test: `src/lib/auth/server/session-cookies.test.ts`

**Interfaces:**
- Consumes: `cookieName`, `sessionCookieOptions`, `accessMaxAge`, `REFRESH_MAX_AGE_SECONDS`, `COOKIE_BASE` (Task 2)
- Produces:
  - `type SessionTokens = { accessToken: string; expiresIn: number; refreshToken: string }`
  - `applySessionCookies(response: NextResponse, secure: boolean, tokens: SessionTokens): void`
  - `clearSessionCookies(response: NextResponse, secure: boolean): void`
  - `errorEnvelope(code: string, message: string): { success: false; error: { code: string; message: string }; timestamp: string }`
  - `noStore(response: NextResponse): NextResponse`

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/auth/server/session-cookies.test.ts
// @vitest-environment node
import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { applySessionCookies, clearSessionCookies } from './session-cookies';
import { errorEnvelope, noStore } from './responses';

const TOKENS = { accessToken: 'acc', expiresIn: 900, refreshToken: 'ref' };

function setCookies(response: NextResponse): string[] {
  return response.headers.getSetCookie();
}

describe('session cookies', () => {
  it('HTTPS: dùng __Host-, httpOnly, Secure, lax, path=/', () => {
    const response = NextResponse.json({});
    applySessionCookies(response, true, TOKENS);
    const cookies = setCookies(response);
    const access = cookies.find((c) => c.startsWith('__Host-access_token=acc'));
    const refresh = cookies.find((c) => c.startsWith('__Host-refresh_token=ref'));
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/Secure/i);
    expect(access).toMatch(/SameSite=lax/i);
    expect(access).toMatch(/Path=\//);
    expect(access).toMatch(/Max-Age=870/);
    expect(refresh).toMatch(/Max-Age=7776000/);
  });

  it('HTTP: tên thường, không Secure', () => {
    const response = NextResponse.json({});
    applySessionCookies(response, false, TOKENS);
    const cookies = setCookies(response);
    expect(cookies.some((c) => c.startsWith('access_token=acc') && !/Secure/i.test(c))).toBe(true);
  });

  it('xoá cookie: Max-Age=0 cho cả hai và xoá cookie cũ path=/api', () => {
    const response = NextResponse.json({});
    clearSessionCookies(response, false);
    const cookies = setCookies(response);
    expect(cookies.filter((c) => /Max-Age=0/i.test(c)).length).toBeGreaterThanOrEqual(3);
    expect(cookies.some((c) => c.startsWith('refresh_token=;') && /Path=\/api/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token=;') && /Path=\/(;|$)/i.test(c))).toBe(true);
  });

  it('applySessionCookies cũng xoá cookie cũ path=/api để không trùng tên', () => {
    const response = NextResponse.json({});
    applySessionCookies(response, false, TOKENS);
    expect(setCookies(response).some((c) => c.startsWith('refresh_token=;') && /Path=\/api/i.test(c))).toBe(true);
  });

  it('errorEnvelope đúng shape ApiErrorBody và noStore đặt cache-control', () => {
    expect(errorEnvelope('X', 'Lỗi')).toMatchObject({ success: false, error: { code: 'X', message: 'Lỗi' } });
    expect(noStore(NextResponse.json({})).headers.get('cache-control')).toBe('no-store');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/auth/server/session-cookies.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/auth/server/responses.ts
import type { NextResponse } from 'next/server';

/** Cùng shape `ApiErrorBody` để `apiClient.parseError` đọc được như lỗi từ BE. */
export function errorEnvelope(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

export function noStore(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store');
  return response;
}
```

```ts
// src/lib/auth/server/session-cookies.ts
import type { NextResponse } from 'next/server';
import {
  COOKIE_BASE,
  REFRESH_MAX_AGE_SECONDS,
  accessMaxAge,
  cookieName,
  sessionCookieOptions,
  type CookieKind,
} from '@/lib/auth/cookies';

export type SessionTokens = { accessToken: string; expiresIn: number; refreshToken: string };

const KINDS: readonly CookieKind[] = ['access', 'refresh'];

/**
 * BE cũ đặt `refresh_token` ở path=/api. Cùng tên với cookie mới (chế độ HTTP) sẽ gây
 * nhập nhằng, nên xoá nó. Ghi bằng header thô và PHẢI gọi sau `cookies.set`, vì
 * `cookies.set` ghi lại toàn bộ Set-Cookie của response.
 */
function expireLegacyRefreshCookie(response: NextResponse): void {
  response.headers.append('set-cookie', `${COOKIE_BASE.refresh}=; Path=/api; Max-Age=0; HttpOnly`);
}

export function applySessionCookies(response: NextResponse, secure: boolean, tokens: SessionTokens): void {
  response.cookies.set(
    cookieName('access', secure),
    tokens.accessToken,
    sessionCookieOptions(secure, accessMaxAge(tokens.expiresIn)),
  );
  response.cookies.set(
    cookieName('refresh', secure),
    tokens.refreshToken,
    sessionCookieOptions(secure, REFRESH_MAX_AGE_SECONDS),
  );
  expireLegacyRefreshCookie(response);
}

export function clearSessionCookies(response: NextResponse, secure: boolean): void {
  for (const kind of KINDS) {
    response.cookies.set(cookieName(kind, secure), '', sessionCookieOptions(secure, 0));
  }
  expireLegacyRefreshCookie(response);
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/auth/server/session-cookies.test.ts && npx tsc --noEmit`
Expected: PASS. Nếu một assertion về thứ tự/định dạng `Set-Cookie` lệch do cách `ResponseCookies` serialize, chỉnh **assertion** cho khớp định dạng thật (giữ nguyên ý: có `Max-Age=0`, có `Path=/api`) — không đổi hành vi cài đặt.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/server/session-cookies.ts src/lib/auth/server/responses.ts src/lib/auth/server/session-cookies.test.ts
git commit -m "feat(auth): ghi/xoá cookie phiên và xoá cookie refresh path=/api cũ"
```

---

### Task 7: Route handler login / token / logout

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/token/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Test: `src/app/api/auth/auth-routes.test.ts`

**Interfaces:**
- Consumes: `readAuthServerConfig` (T1), `readSessionCookie`, `isSecureRequest`, `secondsUntilExpiry` (T2), `isTrustedRequest` (T3), `upstreamLogin`, `upstreamLogout`, `forwardHeaders` (T4), `refreshOnce` (T5), `applySessionCookies`, `clearSessionCookies`, `errorEnvelope`, `noStore` (T6)
- Produces (HTTP):
  - `POST /api/auth/login` body `{ username, password, deviceType, deviceName? }` → `200 { success: true, data: { user, tokens: { accessToken, refreshToken: '', expiresIn, tokenType } }, timestamp }` + cookie; lỗi BE chuyển tiếp nguyên status/body
  - `POST /api/auth/token` body `{ forceRefresh?: boolean }` → `200 { success: true, data: { accessToken, expiresIn, tokenType: 'Bearer' }, timestamp }`; `401 AUTH_REFRESH_FAILED` + xoá cookie
  - `POST /api/auth/logout` → `204` + xoá cookie
  - Mọi route: `404` khi `mode !== 'bff'`; `403 CSRF_REJECTED` khi `!isTrustedRequest`

- [ ] **Step 1: Viết test lỗi**

```ts
// src/app/api/auth/auth-routes.test.ts
// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRefreshCache } from '@/lib/auth/server/refresh';
import { POST as login } from './login/route';
import { POST as token } from './token/route';
import { POST as logout } from './logout/route';

const fetchMock = vi.fn();
const SAME = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };

function jwt(secondsFromNow: number): string {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;
}

function post(path: string, init: { headers?: Record<string, string>; body?: unknown; cookie?: string } = {}) {
  return new NextRequest(`https://app.test${path}`, {
    method: 'POST',
    headers: { ...(init.headers ?? SAME), ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function upstreamJson(body: unknown, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

describe('BFF auth routes', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'bff');
    vi.stubEnv('AUTH_URL', 'http://auth.test');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    resetRefreshCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('404 khi chưa bật chế độ bff', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'legacy');
    expect((await login(post('/api/auth/login', { body: {} }))).status).toBe(404);
    expect((await token(post('/api/auth/token', { body: {} }))).status).toBe(404);
    expect((await logout(post('/api/auth/logout'))).status).toBe(404);
  });

  it('403 khi request ghi không phải same-origin', async () => {
    const res = await login(post('/api/auth/login', { headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.test' }, body: {} }));
    expect(res.status).toBe(403);
    expect((await token(post('/api/auth/token', { headers: {}, body: {} }))).status).toBe(403);
    expect((await logout(post('/api/auth/logout', { headers: { 'sec-fetch-site': 'cross-site' } }))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('login 400 khi body sai', async () => {
    const res = await login(post('/api/auth/login', { body: { username: '' } }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('login thành công: đặt cookie httpOnly, không lộ refresh token trong body, no-store', async () => {
    fetchMock.mockResolvedValue(
      upstreamJson(
        {
          success: true,
          data: { tokens: { accessToken: jwt(900), refreshToken: '', expiresIn: 900, tokenType: 'Bearer' }, user: { id: 'u1' } },
          timestamp: '2026-10-04T00:00:00.000Z',
        },
        200,
        ['refresh_token=RT-SECRET; Path=/api; HttpOnly'],
      ),
    );
    const res = await login(post('/api/auth/login', { body: { username: 'huy', password: 'pw', deviceType: 'WEB' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.tokens.refreshToken).toBe('');
    expect(JSON.stringify(body)).not.toContain('RT-SECRET');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('__Host-refresh_token=RT-SECRET') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('__Host-access_token='))).toBe(true);
  });

  it('login lỗi từ BE: chuyển tiếp nguyên status/body, không đặt cookie', async () => {
    const errorBody = { success: false, error: { code: 'AUTH_ACCOUNT_DELETED', message: 'x', details: { restoreToken: 'r' } } };
    fetchMock.mockResolvedValue(upstreamJson(errorBody, 403));
    const res = await login(post('/api/auth/login', { body: { username: 'a', password: 'b', deviceType: 'WEB' } }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(errorBody);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('token: còn access cookie thì trả luôn, không gọi BE', async () => {
    const access = jwt(600);
    const res = await token(post('/api/auth/token', { body: {}, cookie: `__Host-access_token=${access}; __Host-refresh_token=r1` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBe(access);
    expect(body.data.expiresIn).toBeGreaterThan(590);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('token: hết access cookie thì refresh và đặt cookie mới', async () => {
    fetchMock.mockResolvedValue(
      upstreamJson({ success: true, data: { accessToken: 'acc2', expiresIn: 900 } }, 200, ['refresh_token=r2; Path=/api']),
    );
    const res = await token(post('/api/auth/token', { body: {}, cookie: '__Host-refresh_token=r1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.accessToken).toBe('acc2');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('__Host-refresh_token=r2'))).toBe(true);
  });

  it('token forceRefresh: bỏ qua access cookie còn hạn và refresh', async () => {
    fetchMock.mockResolvedValue(upstreamJson({ success: true, data: { accessToken: 'fresh', expiresIn: 900 } }));
    const res = await token(
      post('/api/auth/token', { body: { forceRefresh: true }, cookie: `__Host-access_token=${jwt(600)}; __Host-refresh_token=r1` }),
    );
    expect((await res.json()).data.accessToken).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('token: refresh thất bại thì 401 và xoá cookie (chặn vòng lặp redirect)', async () => {
    fetchMock.mockResolvedValue(upstreamJson({ success: false, error: { code: 'AUTH_SESSION_REVOKED' } }, 401));
    const res = await token(
      post('/api/auth/token', { body: { forceRefresh: true }, cookie: `__Host-access_token=${jwt(600)}; __Host-refresh_token=r1` }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('AUTH_REFRESH_FAILED');
    expect(res.headers.getSetCookie().filter((c) => /Max-Age=0/i.test(c)).length).toBeGreaterThanOrEqual(2);
  });

  it('token: không có cookie nào thì 401', async () => {
    const res = await token(post('/api/auth/token', { body: {} }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logout: gọi BE, xoá cookie, trả 204; vẫn xoá cookie khi BE lỗi', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const res = await logout(post('/api/auth/logout', { cookie: '__Host-access_token=a; __Host-refresh_token=r' }));
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie().filter((c) => /Max-Age=0/i.test(c)).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/app/api/auth/auth-routes.test.ts`
Expected: FAIL — module route không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isSecureRequest } from '@/lib/auth/cookies';
import { readAuthServerConfig } from '@/lib/auth/server/config';
import { isTrustedRequest } from '@/lib/auth/server/csrf';
import { errorEnvelope, noStore } from '@/lib/auth/server/responses';
import { applySessionCookies } from '@/lib/auth/server/session-cookies';
import { forwardHeaders, upstreamLogin } from '@/lib/auth/server/upstream';

export const runtime = 'nodejs';

const bodySchema = z.object({
  username: z.string().min(1).max(254),
  password: z.string().min(1).max(1024),
  deviceType: z.string().min(1).max(32),
  deviceName: z.string().max(200).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = readAuthServerConfig();
  if (config.mode !== 'bff') return new NextResponse(null, { status: 404 });
  if (!isTrustedRequest(request, config.allowedOrigins)) {
    return NextResponse.json(errorEnvelope('CSRF_REJECTED', 'Yêu cầu không hợp lệ'), { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(errorEnvelope('INVALID_INPUT', 'Dữ liệu không hợp lệ'), { status: 400 });
  }

  const result = await upstreamLogin(parsed.data, forwardHeaders(request.headers));
  if (!result.ok) return noStore(NextResponse.json(result.body, { status: result.status }));

  const { tokens, user } = result.data;
  const response = NextResponse.json({
    success: true,
    // refreshToken luôn rỗng: trình duyệt không bao giờ thấy refresh token.
    data: { user, tokens: { ...tokens, refreshToken: '' } },
    timestamp: result.timestamp,
  });
  applySessionCookies(response, isSecureRequest(request.headers, request.url), {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
    refreshToken: result.refreshToken,
  });
  return noStore(response);
}
```

```ts
// src/app/api/auth/token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isSecureRequest, readSessionCookie } from '@/lib/auth/cookies';
import { secondsUntilExpiry } from '@/lib/auth/jwt-exp';
import { readAuthServerConfig } from '@/lib/auth/server/config';
import { isTrustedRequest } from '@/lib/auth/server/csrf';
import { refreshOnce } from '@/lib/auth/server/refresh';
import { errorEnvelope, noStore } from '@/lib/auth/server/responses';
import { applySessionCookies, clearSessionCookies } from '@/lib/auth/server/session-cookies';
import { forwardHeaders } from '@/lib/auth/server/upstream';

export const runtime = 'nodejs';

const bodySchema = z.object({ forceRefresh: z.boolean().optional() }).default({});

function tokenResponse(accessToken: string, expiresIn: number): NextResponse {
  return NextResponse.json({
    success: true,
    data: { accessToken, expiresIn, tokenType: 'Bearer' },
    timestamp: new Date().toISOString(),
  });
}

/** Cầu nối tạm (gỡ ở P2): trình duyệt vẫn cần access token cho socket/task/notion/upload. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = readAuthServerConfig();
  if (config.mode !== 'bff') return new NextResponse(null, { status: 404 });
  if (!isTrustedRequest(request, config.allowedOrigins)) {
    return NextResponse.json(errorEnvelope('CSRF_REJECTED', 'Yêu cầu không hợp lệ'), { status: 403 });
  }

  const { forceRefresh } = bodySchema.parse(await request.json().catch(() => ({})));
  const secure = isSecureRequest(request.headers, request.url);
  const access = readSessionCookie(request.cookies, 'access');
  const refresh = readSessionCookie(request.cookies, 'refresh');

  if (access && !forceRefresh) {
    return noStore(tokenResponse(access, secondsUntilExpiry(access)));
  }

  const failure = () => {
    const response = NextResponse.json(errorEnvelope('AUTH_REFRESH_FAILED', 'Phiên đăng nhập đã hết hạn'), { status: 401 });
    clearSessionCookies(response, secure);
    return noStore(response);
  };
  if (!refresh) return failure();

  const outcome = await refreshOnce(refresh, forwardHeaders(request.headers));
  if (!outcome.ok) return failure();

  const response = tokenResponse(outcome.accessToken, outcome.expiresIn);
  applySessionCookies(response, secure, outcome);
  return noStore(response);
}
```

```ts
// src/app/api/auth/logout/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { isSecureRequest, readSessionCookie } from '@/lib/auth/cookies';
import { readAuthServerConfig } from '@/lib/auth/server/config';
import { isTrustedRequest } from '@/lib/auth/server/csrf';
import { errorEnvelope, noStore } from '@/lib/auth/server/responses';
import { clearSessionCookies } from '@/lib/auth/server/session-cookies';
import { forwardHeaders, upstreamLogout } from '@/lib/auth/server/upstream';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = readAuthServerConfig();
  if (config.mode !== 'bff') return new NextResponse(null, { status: 404 });
  if (!isTrustedRequest(request, config.allowedOrigins)) {
    return NextResponse.json(errorEnvelope('CSRF_REJECTED', 'Yêu cầu không hợp lệ'), { status: 403 });
  }

  await upstreamLogout(
    readSessionCookie(request.cookies, 'access'),
    readSessionCookie(request.cookies, 'refresh'),
    forwardHeaders(request.headers),
  );
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response, isSecureRequest(request.headers, request.url));
  return noStore(response);
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/app/api/auth/auth-routes.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth
git commit -m "feat(auth): route BFF login/token/logout đặt cookie httpOnly"
```

---

### Task 8: `proxy.ts` — refresh, bảo vệ route, gắn Bearer, CSRF

**Files:**
- Create: `src/proxy.ts`
- Test: `src/proxy.test.ts`

**Interfaces:**
- Consumes: `isBffMode`, `readAuthServerConfig` (T1), cookie helpers (T2), `isTrustedRequest` (T3), `forwardHeaders` (T4), `refreshOnce` (T5), `applySessionCookies`, `clearSessionCookies`, `errorEnvelope` (T6)
- Produces: `proxy(request: NextRequest): Promise<NextResponse>`, `config.matcher`, `isPublicPath(pathname: string): boolean`

Quy tắc hành vi (chế độ `bff`; chế độ `legacy` trả `NextResponse.next()` ngay):
1. `/api/*` (trừ method an toàn) không `isTrustedRequest` → `403 CSRF_REJECTED`.
2. Có refresh cookie, thiếu access cookie → `refreshOnce`; thành công thì đặt cookie mới và ghi đè header `cookie` của request đi tiếp; thất bại thì xoá cookie.
3. Đường dẫn công khai (`isPublicPath`): không ép đăng nhập. Trang khách (`/login`, `/register`, `/forgot-password`) mà đã có access → redirect `/chat`.
4. Còn lại là trang cần đăng nhập: không có access → redirect `/login`. `/api/v1/*` **không bao giờ** bị chặn ở đây (BE tự trả 401).
5. `/api/v1/*` và có access → đặt request header `authorization: Bearer <access>` (ghi đè header client gửi).

- [ ] **Step 1: Viết test lỗi**

```ts
// src/proxy.test.ts
// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRefreshCache } from '@/lib/auth/server/refresh';
import { isPublicPath, proxy } from './proxy';

const fetchMock = vi.fn();

function get(path: string, cookie?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://app.test${path}`, {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
  });
}

function overridden(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'bff');
    vi.stubEnv('AUTH_URL', 'http://auth.test');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    resetRefreshCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('legacy: cho qua mọi thứ, không redirect, không đụng cookie', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'legacy');
    const res = await proxy(get('/chat'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.status).toBe(200);
  });

  it('isPublicPath', () => {
    for (const path of ['/', '/login', '/register', '/verify-email', '/forgot-password', '/p/abc', '/i/xyz', '/offline', '/api/auth/token', '/api/v1/auth/login', '/api/giphy']) {
      expect(isPublicPath(path)).toBe(true);
    }
    for (const path of ['/chat', '/chat/1', '/notes', '/settings', '/api/v1/users/me', '/bot/app']) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it('chưa đăng nhập vào trang bảo vệ → redirect /login', async () => {
    const res = await proxy(get('/chat/1'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/login');
  });

  it('chưa đăng nhập vào trang công khai → đi tiếp', async () => {
    expect((await proxy(get('/login'))).headers.get('x-middleware-next')).toBe('1');
    expect((await proxy(get('/p/abc'))).status).toBe(200);
  });

  it('đã đăng nhập vào /login → redirect /chat', async () => {
    const res = await proxy(get('/login', '__Host-access_token=acc'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/chat');
  });

  it('đã đăng nhập: trang bảo vệ đi tiếp', async () => {
    expect((await proxy(get('/chat', '__Host-access_token=acc'))).headers.get('x-middleware-next')).toBe('1');
  });

  it('/api/v1 có access → gắn Bearer, ghi đè header client gửi', async () => {
    const res = await proxy(get('/api/v1/users/me', '__Host-access_token=acc', { authorization: 'Bearer client-sent' }));
    expect(overridden(res, 'authorization')).toBe('Bearer acc');
  });

  it('/api/v1 không có access → đi tiếp không chặn, không gắn Bearer', async () => {
    const res = await proxy(get('/api/v1/users/me'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(overridden(res, 'authorization')).toBeNull();
  });

  it('thiếu access nhưng có refresh → refresh, đặt cookie, cookie request mang token mới', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { accessToken: 'acc2', expiresIn: 900 } }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'refresh_token=r2; Path=/api' },
      }),
    );
    const res = await proxy(get('/chat', '__Host-refresh_token=r1; theme=dark'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('__Host-access_token=acc2'))).toBe(true);
    expect(overridden(res, 'cookie')).toContain('__Host-access_token=acc2');
    expect(overridden(res, 'cookie')).toContain('theme=dark');
  });

  it('refresh thất bại → xoá cookie và redirect /login', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 }));
    const res = await proxy(get('/chat', '__Host-refresh_token=r1'));
    expect(res.status).toBe(307);
    expect(res.headers.getSetCookie().some((c) => /Max-Age=0/i.test(c))).toBe(true);
  });

  it('/api/* ghi cross-site → 403, không gọi BE', async () => {
    const req = new NextRequest('https://app.test/api/v1/messages', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.test', cookie: '__Host-access_token=acc' },
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('/api/* ghi same-origin → đi tiếp', async () => {
    const req = new NextRequest('https://app.test/api/v1/messages', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin', cookie: '__Host-access_token=acc' },
    });
    expect((await proxy(req)).headers.get('x-middleware-next')).toBe('1');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/proxy.test.ts`
Expected: FAIL — `Cannot find module './proxy'`

- [ ] **Step 3: Cài đặt**

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  cookieName,
  isSecureRequest,
  readSessionCookie,
  withCookies,
} from '@/lib/auth/cookies';
import { isBffMode, readAuthServerConfig } from '@/lib/auth/server/config';
import { isTrustedRequest } from '@/lib/auth/server/csrf';
import { refreshOnce } from '@/lib/auth/server/refresh';
import { errorEnvelope } from '@/lib/auth/server/responses';
import { applySessionCookies, clearSessionCookies, type SessionTokens } from '@/lib/auth/server/session-cookies';
import { forwardHeaders } from '@/lib/auth/server/upstream';

const PUBLIC_EXACT = new Set(['/']);
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/offline',
  '/p/',
  '/i/',
  '/api/auth/',
  '/api/v1/auth/',
  '/api/giphy',
  '/api/docs',
];
const GUEST_ONLY_PREFIXES = ['/login', '/register', '/forgot-password'];

/** Khớp chính prefix và mọi đường dẫn con (`/p/` khớp `/p` và `/p/abc`; `/login` không khớp `/login-x`). */
function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => {
    const base = prefix.replace(/\/$/, '');
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || matchesPrefix(pathname, PUBLIC_PREFIXES);
}

function isGuestOnly(pathname: string): boolean {
  return matchesPrefix(pathname, GUEST_ONLY_PREFIXES);
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!isBffMode()) return NextResponse.next();

  const config = readAuthServerConfig();
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (isApi && !isTrustedRequest(request, config.allowedOrigins)) {
    return NextResponse.json(errorEnvelope('CSRF_REJECTED', 'Yêu cầu không hợp lệ'), { status: 403 });
  }

  const secure = isSecureRequest(request.headers, request.url);
  let access = readSessionCookie(request.cookies, 'access');
  const refresh = readSessionCookie(request.cookies, 'refresh');
  let issued: SessionTokens | null = null;
  let sessionLost = false;

  // Refresh chỉ ở đây: Server Component không ghi được cookie lúc render.
  if (!access && refresh) {
    const outcome = await refreshOnce(refresh, forwardHeaders(request.headers));
    if (outcome.ok) {
      access = outcome.accessToken;
      issued = outcome;
    } else {
      sessionLost = true;
    }
  }

  const finish = (response: NextResponse): NextResponse => {
    if (issued) applySessionCookies(response, secure, issued);
    if (sessionLost) clearSessionCookies(response, secure);
    return response;
  };

  if (!isPublicPath(pathname) && !access) return finish(redirectTo(request, '/login'));
  if (access && isGuestOnly(pathname)) return finish(redirectTo(request, '/chat'));

  const requestHeaders = new Headers(request.headers);
  if (issued) {
    requestHeaders.set(
      'cookie',
      withCookies(request.headers.get('cookie'), {
        [cookieName('access', secure)]: issued.accessToken,
        [cookieName('refresh', secure)]: issued.refreshToken,
      }),
    );
  }
  // BE tự trả 401 cho endpoint cần đăng nhập; proxy không chặn /api/v1 để endpoint công khai vẫn chạy.
  if (access && pathname.startsWith('/api/v1/')) requestHeaders.set('authorization', `Bearer ${access}`);

  return finish(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|js|css|map|woff2?|mp3|wav|webmanifest)$).*)'],
};
```

Giữ function < 50 dòng: nếu `proxy` vượt, tách phần "đảm bảo phiên" (đoạn refresh) ra hàm `ensureSession(request, secure)` trong cùng file, trả `{ access, issued, sessionLost }`.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/proxy.test.ts && npx tsc --noEmit`
Expected: PASS. Nếu header `x-middleware-request-*` khác tên trong Next bản đang cài, đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` và chỉnh **hàm `overridden` trong test** theo cách Next thực sự mã hoá request header — không đổi hành vi cài đặt.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/proxy.test.ts
git commit -m "feat(auth): proxy.ts refresh phiên, bảo vệ route, gắn Bearer và chặn CSRF"
```

---

### Task 9: Nối client vào endpoint theo chế độ

**Files:**
- Create: `src/lib/api/auth-endpoints.ts`
- Modify: `src/lib/api/client.ts` (hàm `resolveBase`, `refreshAccessToken`, nhánh `AUTH_SESSION_REVOKED` trong `recoverFrom401`)
- Modify: `src/services/auth.api.ts` (`login`, `logout`, `refreshAccessToken`)
- Test: `src/lib/api/auth-endpoints.test.ts`; chạy lại `src/lib/api/client.test.ts`

**Interfaces:**
- Consumes: `env.NEXT_PUBLIC_AUTH_MODE` (T1)
- Produces:
  - `authEndpoints(): { login: string; token: string; logout: string }`
  - `refreshInit(force: boolean): { headers?: Record<string, string>; body?: string }` (chỉ có body ở chế độ bff)
  - `clearBffSession(): void` (bắn-và-quên `POST /api/auth/logout` ở chế độ bff; không làm gì ở legacy)

**Lưu ý file dài:** `src/lib/api/client.ts` đã 304 dòng (> 300). Mọi logic mới đặt ở `auth-endpoints.ts`; trong `client.ts` chỉ đổi tại chỗ và **rút gọn** để file không dài thêm (xoá comment thừa/dòng trống hợp lý nếu cần; không refactor ngoài phạm vi).

- [ ] **Step 1: Viết test lỗi**

```ts
// src/lib/api/auth-endpoints.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(mode: 'legacy' | 'bff') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', mode);
  return import('./auth-endpoints');
}

describe('auth-endpoints', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('legacy: dùng /api/v1/auth/*', async () => {
    const { authEndpoints } = await load('legacy');
    expect(authEndpoints()).toEqual({
      login: '/api/v1/auth/login',
      token: '/api/v1/auth/refresh',
      logout: '/api/v1/auth/logout',
    });
  });

  it('bff: dùng /api/auth/*', async () => {
    const { authEndpoints } = await load('bff');
    expect(authEndpoints()).toEqual({
      login: '/api/auth/login',
      token: '/api/auth/token',
      logout: '/api/auth/logout',
    });
  });

  it('refreshInit: legacy không gửi body (BE có thể từ chối trường lạ)', async () => {
    const { refreshInit } = await load('legacy');
    expect(refreshInit(true)).toEqual({});
  });

  it('refreshInit: bff gửi forceRefresh', async () => {
    const { refreshInit } = await load('bff');
    expect(refreshInit(true)).toEqual({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceRefresh: true }),
    });
    expect(refreshInit(false).body).toBe(JSON.stringify({ forceRefresh: false }));
  });

  it('clearBffSession: bff gọi logout, legacy không làm gì', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    (await load('legacy')).clearBffSession();
    expect(fetchMock).not.toHaveBeenCalled();

    (await load('bff')).clearBffSession();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST', credentials: 'include' });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận lỗi**

Run: `npx vitest run src/lib/api/auth-endpoints.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Cài đặt**

```ts
// src/lib/api/auth-endpoints.ts
import { env } from '@/config/env';

type AuthEndpoints = { login: string; token: string; logout: string };

const LEGACY: AuthEndpoints = {
  login: '/api/v1/auth/login',
  token: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
};
const BFF: AuthEndpoints = {
  login: '/api/auth/login',
  token: '/api/auth/token',
  logout: '/api/auth/logout',
};

export function authEndpoints(): AuthEndpoints {
  return env.NEXT_PUBLIC_AUTH_MODE === 'bff' ? BFF : LEGACY;
}

/** Chỉ chế độ bff cần body; BE legacy có thể từ chối trường lạ. */
export function refreshInit(force: boolean): { headers?: Record<string, string>; body?: string } {
  if (env.NEXT_PUBLIC_AUTH_MODE !== 'bff') return {};
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceRefresh: force }),
  };
}

/** Phiên bị thu hồi: xoá cookie phía server để proxy không đẩy /login ↔ /chat vô hạn. */
export function clearBffSession(): void {
  if (env.NEXT_PUBLIC_AUTH_MODE !== 'bff') return;
  void fetch(BFF.logout, { method: 'POST', credentials: 'include' }).catch(() => undefined);
}
```

Sửa `src/lib/api/client.ts`:

1. Import: `import { authEndpoints, clearBffSession, refreshInit } from '@/lib/api/auth-endpoints';`
2. Đầu hàm `resolveBase` thêm (route BFF luôn same-origin, bất kể `USE_PROXY`):
   ```ts
   if (path.startsWith('/api/auth/')) return '';
   ```
3. Trong `refreshAccessToken`, thay lệnh `fetch` bằng (client luôn ép làm mới vì access cookie có thể chính là token đang bị 401, và để lịch refresh chủ động không lặp):
   ```ts
   const res = await fetch(buildUrl(authEndpoints().token), {
     method: 'POST',
     credentials: 'include',
     ...refreshInit(true),
   });
   ```
4. Trong `recoverFrom401`, nhánh `AUTH_SESSION_REVOKED`, thêm `clearBffSession();` ngay sau `applyToken(null);`.

Sửa `src/services/auth.api.ts`:
- `login`: đổi `'/api/v1/auth/login'` thành `authEndpoints().login`.
- `logout`: `apiClient.post<void>(authEndpoints().logout)`.
- `refreshAccessToken` (dùng khi khởi động, **không** ép làm mới để trúng access cookie còn hạn, không gọi BE):
  ```ts
  refreshAccessToken: () =>
    apiClient.post<AuthTokens>(authEndpoints().token, { auth: false, ...refreshInit(false) }),
  ```
- Thêm import `authEndpoints`, `refreshInit` từ `@/lib/api/auth-endpoints`.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/api src/features/auth && npx tsc --noEmit && npx eslint src/lib/api src/services/auth.api.ts src/lib/auth src/proxy.ts src/app/api/auth`
Expected: PASS, không lỗi eslint. `client.test.ts` hiện có vẫn xanh (chế độ mặc định legacy).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api src/services/auth.api.ts
git commit -m "feat(auth): client chọn endpoint theo AUTH_MODE, dọn phiên BFF khi bị thu hồi"
```

---

### Task 10: Tài liệu và kiểm tra tổng

**Files:**
- Modify: `.claude/patterns/hybrid-query.md` (mục "Helper trong repo")
- Modify: `docs/superpowers/specs/2026-10-03-bff-auth-hybrid-design.md` (bảng giai đoạn §4 theo "điều chỉnh" ở đầu plan này)
- Modify: `next.config.ts` (chỉ sửa comment lỗi thời đầu file: Electron dùng `output: 'standalone'`, không phải static export)

- [ ] **Step 1: Sửa `hybrid-query.md`**

Thay toàn bộ mục `## Helper trong repo` (3 gạch đầu dòng tham chiếu file chưa tồn tại) bằng:

```md
## Helper trong repo

Chưa có. `makeQueryClient`, `prefetchDehydrated`, `unwrapOrRedirect` và test tích hợp sẽ được thêm ở giai đoạn P1 của `docs/superpowers/specs/2026-10-03-bff-auth-hybrid-design.md`, sau khi nền BFF auth (P0) xong. Hiện `src/lib/query/` chỉ có `client.ts` và `debounced-invalidate.ts`.
```

- [ ] **Step 2: Sửa comment `next.config.ts`**

Thay 2 dòng đầu của comment `BUILD_TARGET=electron  → static export ...` thành:

```
 * BUILD_TARGET=electron  → output: 'standalone'; Electron chạy server Next cục bộ (electron/main.js).
 *                           Hiện FE gọi thẳng backend qua NEXT_PUBLIC_*_URL (rewrites tắt) — đổi ở P3.
```

(Chỉ đổi comment, không đổi code.)

- [ ] **Step 3: Cập nhật bảng giai đoạn trong spec §4**

P0: "Nền BFF: cờ `AUTH_MODE`, cookie httpOnly, `proxy.ts` (refresh + CSRF + Bearer + bảo vệ route), route login/token/logout; cầu nối token cho client". P1: thêm `session.ts`, `server-fetch.ts`, hybrid chat. P2: BE (`sid`, họ token, ticket, thu hồi thiết bị) + gỡ cầu nối token + socket/SSE dùng ticket + double-submit CSRF + danh sách thiết bị. P3: Electron.

- [ ] **Step 4: Chạy toàn bộ kiểm tra**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src`
Expected: toàn bộ xanh (so với trước thay đổi: không test nào đỏ mới).

- [ ] **Step 5: Commit**

```bash
git add .claude/patterns/hybrid-query.md docs/superpowers/specs/2026-10-03-bff-auth-hybrid-design.md next.config.ts
git commit -m "docs(auth): chỉnh pattern hybrid, bảng giai đoạn spec và comment Electron"
```

---

## Kiểm tra thủ công (người review thực hiện, không giao Codex)

Chạy khi mọi task xanh; theo ghi chú của dự án: bật `next dev` + đo bằng Chrome, **tắt dev server trước khi giao việc tiếp cho Codex**.

1. Đặt `NEXT_PUBLIC_AUTH_MODE=bff`, `NEXT_PUBLIC_USE_PROXY=true`, `AUTH_URL=<auth-service>` rồi `npm run dev`.
2. Đăng nhập: DevTools → Application → Cookies thấy `access_token`/`refresh_token` (`HttpOnly`, `path=/`); response `/api/auth/login` không chứa refresh token.
3. Tải lại `/chat`: không còn `POST /api/v1/auth/refresh` từ trình duyệt; có `POST /api/auth/token` trả ngay (không chờ BE).
4. Xoá cookie access thủ công, tải lại: proxy refresh âm thầm, trang vẫn vào được.
5. Thu hồi phiên (đăng nhập ở nơi khác rồi thu hồi): không bị lặp `/login` ↔ `/chat`.
6. Mở trang chat thật: tin nhắn realtime/socket vẫn chạy (cầu nối token), upload ảnh và Notion vẫn chạy.
7. Gọi `fetch('/api/auth/logout', {method:'POST'})` từ một trang origin khác (hoặc `curl` không `Origin`): bị `403`.
