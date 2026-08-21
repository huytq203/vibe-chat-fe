# Media Picker (Emoji / GIF / Sticker) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp ba điểm vào rời rạc (Emoji / Sticker / menu mobile lồng nhau) của thanh soạn tin thành **một** picker duy nhất có 3 tab, đồng thời thêm GIF từ Giphy qua proxy Next route handler — không thay đổi backend.

**Architecture:** Client chỉ nói chuyện với `/api/giphy` (same-origin). Route handler giữ `GIPHY_API_KEY` server-only, trả payload đã rút gọn và **không** trả URL file thật; khi gửi, client đưa `id` cho `/api/giphy/asset`, proxy tự resolve URL rồi stream bytes về. Bytes đó thành `File(.gif)` → `mediaApi.uploadDirect(..., 'ATTACHMENT')` → `sendMessage({ type: 'IMAGE', attachmentIds })`, tái dùng nguyên pipeline media sẵn có.

**Tech Stack:** Next.js 16 App Router (route handler `runtime = 'nodejs'`), React 19, TanStack Query v5 (`useInfiniteQuery` / `useMutation`), Zod, Base UI (`Tabs`/`Popover`/`Drawer` qua `@/components/ui/*`), Tailwind v4, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-08-21-composer-media-picker-design.md`](../specs/2026-08-21-composer-media-picker-design.md)

## Global Constraints

- Không `any`, không `@ts-ignore`, không `eslint-disable` (trừ khi có comment nêu lý do). Không `as` tuỳ tiện — dùng type guard.
- Component < 200 dòng · function < 50 dòng · file < 300 dòng · hook < 80 dòng.
- Mọi UI hiển thị data API phải có đủ **loading / error / empty / data**.
- Mọi fetch client-side qua TanStack Query. Cấm `useEffect + fetch`.
- API transport ở `src/services/<scope>.api.ts`; query key ở `src/services/keys.ts`. Cấm tạo `features/<x>/api/`.
- **Không thêm package mới.** Cụ thể: KHÔNG cài `@giphy/js-fetch-api` hay `@giphy/react-components` — tự `fetch` + Zod.
- Named export bắt buộc (trừ route handler của Next và Page/Layout).
- Secrets chỉ ở server. `GIPHY_API_KEY` **không bao giờ** có prefix `NEXT_PUBLIC_`.
- Input từ client phải Zod-validate tại biên route trước khi dùng.
- Đặt tên: component `PascalCase.tsx`, hook đơn `useCamelCase.ts`, hook aggregator `use-<kind>.ts`, util `kebab-case.ts`, folder `kebab-case`.
- Import bằng alias `@/...`, không relative dài.
- Tiếng Việt cho mọi chuỗi hiển thị và comment.
- Lệnh kiểm tra: `npx vitest run <path>` (một file), `npm test` (toàn bộ), `npm run typecheck`, `npm run lint`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/lib/rate-limit/memory.ts` | Sliding-window rate limiter in-memory + trích IP client. Thuần TS, không phụ thuộc Next. |
| `src/app/api/giphy/giphy-env.ts` | Đọc + Zod-validate `GIPHY_API_KEY` (lazy, server-only). Hằng số base URL Giphy. |
| `src/app/api/giphy/route.ts` | `GET` trending/search → payload rút gọn `{ items, nextOffset }`. |
| `src/app/api/giphy/asset/route.ts` | `GET ?id=` → stream bytes GIF. Điểm chặn SSRF. |
| `src/features/chat/types/gif.ts` | Zod schema + type `GiphyItem` / `GiphyPage` (Zod là nguồn sự thật type). |
| `src/services/giphy.api.ts` | Transport thuần tới `/api/giphy`. Không đụng cache/state. |
| `src/services/keys.ts` | Thêm `giphyKeys`. |
| `src/features/chat/hooks/use-giphy.ts` | `useGiphyGifs` (infinite query) + `useSendGif` (mutation download→upload→send). |
| `src/features/chat/components/messages/media-picker/use-picker-tab.ts` | Nhớ tab cuối qua localStorage wrapper. |
| `.../media-picker/GifPicker.tsx` | Ô tìm kiếm + lưới GIF + 4 trạng thái + infinite scroll. |
| `.../media-picker/MediaPickerPanel.tsx` | Khung 3 tab, chỉ render, không giữ logic async. |
| `.../media-picker/MediaPickerTrigger.tsx` | Nút mở + chọn vỏ Popover/Drawer + sở hữu mutation sticker/GIF. |
| `.../media-picker/index.ts` | Barrel tường minh (không `export *`). |

**Ranh giới:** `Panel` là component thuần trình bày — nhận callback, không gọi hook mutation. `Trigger` sở hữu toàn bộ state async. Nhờ vậy `Panel` test được mà không cần QueryClient.

---

## Task 0: Chuẩn bị nhánh

- [ ] **Step 1: Tạo nhánh làm việc**

Repo đang ở `main` và có 4 file dirty không liên quan (`src/app/layout.tsx`, `src/features/chat/components/contact/SharedTabs.tsx`, `src/features/chat/components/layout/AiChatHeader.tsx`, `src/styles/index.css`). **Không** commit các file này trong bất kỳ task nào dưới đây — mọi lệnh `git add` đều liệt kê đường dẫn tường minh.

```bash
git checkout -b feat/composer-media-picker
```

- [ ] **Step 2: Xác nhận baseline xanh**

Run: `npm test`
Expected: PASS toàn bộ. Nếu đã có test đỏ từ trước, ghi lại danh sách để phân biệt với lỗi do plan này gây ra.

---

## Task 1: Rate limiter in-memory

**Files:**
- Create: `src/lib/rate-limit/memory.ts`
- Test: `src/lib/rate-limit/memory.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `checkRateLimit(options: { key: string; limit: number; windowMs: number; now?: number }): { ok: boolean; retryAfterSeconds: number }`
  - `resetRateLimit(): void`
  - `getClientIp(request: Request): string`

- [ ] **Step 1: Viết test thất bại**

Create `src/lib/rate-limit/memory.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, getClientIp, resetRateLimit } from './memory';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('cho qua khi chưa chạm giới hạn', () => {
    const first = checkRateLimit({ key: 'ip-1', limit: 3, windowMs: 60_000, now: 1_000 });
    const second = checkRateLimit({ key: 'ip-1', limit: 3, windowMs: 60_000, now: 1_100 });

    expect(first).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(second.ok).toBe(true);
  });

  it('chặn request vượt giới hạn và trả thời gian chờ', () => {
    for (let i = 0; i < 3; i += 1) {
      checkRateLimit({ key: 'ip-2', limit: 3, windowMs: 60_000, now: 1_000 + i });
    }

    const blocked = checkRateLimit({ key: 'ip-2', limit: 3, windowMs: 60_000, now: 1_500 });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('cho qua lại sau khi cửa sổ trôi qua', () => {
    checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 1_000 });
    expect(checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 2_000 }).ok).toBe(false);
    expect(checkRateLimit({ key: 'ip-3', limit: 1, windowMs: 60_000, now: 62_000 }).ok).toBe(true);
  });

  it('đếm độc lập giữa các key', () => {
    checkRateLimit({ key: 'a', limit: 1, windowMs: 60_000, now: 1_000 });
    expect(checkRateLimit({ key: 'b', limit: 1, windowMs: 60_000, now: 1_000 }).ok).toBe(true);
  });
});

describe('getClientIp', () => {
  it('lấy IP đầu tiên trong x-forwarded-for', () => {
    const request = new Request('http://localhost/api/giphy', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('fallback sang x-real-ip rồi unknown', () => {
    const withReal = new Request('http://localhost/api/giphy', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });
    const bare = new Request('http://localhost/api/giphy');

    expect(getClientIp(withReal)).toBe('198.51.100.2');
    expect(getClientIp(bare)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/lib/rate-limit/memory.test.ts`
Expected: FAIL — `Failed to resolve import "./memory"`.

- [ ] **Step 3: Viết implementation tối thiểu**

Create `src/lib/rate-limit/memory.ts`:

```ts
/**
 * Rate-limit sliding window lưu trong RAM của tiến trình.
 *
 * CHỈ đúng khi app chạy MỘT instance (Electron standalone, 1 pod). Scale ngang
 * → thay ruột bằng Redis, giữ nguyên chữ ký hàm để call-site không phải sửa.
 */

const hits = new Map<string, number[]>();

/** Quá số key này thì quét dọn các bucket đã hết hạn (chặn Map phình vô hạn). */
const SWEEP_THRESHOLD = 10_000;

export type RateLimitResult = {
  ok: boolean;
  /** Số giây client nên chờ trước khi thử lại. 0 khi `ok`. */
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  /** Tiêm được để test không phụ thuộc đồng hồ thật. */
  now?: number;
};

function sweep(now: number, windowMs: number): void {
  for (const [key, times] of hits) {
    const last = times[times.length - 1];
    if (last === undefined || last <= now - windowMs) hits.delete(key);
  }
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  if (hits.size > SWEEP_THRESHOLD) sweep(now, windowMs);

  const from = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((time) => time > from);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSeconds: 0 };
}

/** Xoá toàn bộ bộ đếm — dùng trong test để các case không ảnh hưởng nhau. */
export function resetRateLimit(): void {
  hits.clear();
}

/** IP client sau proxy (Vercel/nginx). Không xác định được → gộp chung bucket 'unknown'. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/lib/rate-limit/memory.test.ts`
Expected: PASS — 6 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit/memory.ts src/lib/rate-limit/memory.test.ts
git commit -m "feat(lib): add in-memory sliding window rate limiter"
```

---

## Task 2: Giphy env + route tìm kiếm

**Files:**
- Create: `src/app/api/giphy/giphy-env.ts`
- Create: `src/app/api/giphy/route.ts`
- Test: `src/app/api/giphy/route.test.ts`

**Interfaces:**
- Consumes: `checkRateLimit`, `getClientIp`, `resetRateLimit` từ `@/lib/rate-limit/memory` (Task 1).
- Produces:
  - `readGiphyEnv(): { GIPHY_API_KEY: string } | null`
  - `GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs'`
  - `GET(request: Request): Promise<Response>` trả `{ items: Array<{ id, title, previewUrl, previewWidth, previewHeight }>, nextOffset: number | null }`.

> **Ghi chú kiểu:** handler nhận `Request` chuẩn (không phải `NextRequest`) và tự `new URL(request.url)`. Nhờ vậy test dựng được request bằng `new Request(...)` mà không cần bootstrap Next.

- [ ] **Step 1: Viết test thất bại**

Create `src/app/api/giphy/route.test.ts`:

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimit } from '@/lib/rate-limit/memory';
import { GET } from './route';

const upstreamPayload = {
  data: [
    {
      id: 'abc123',
      title: 'mèo nhảy',
      images: {
        fixed_width_small: {
          url: 'https://media.giphy.com/media/abc123/100w.gif',
          webp: 'https://media.giphy.com/media/abc123/100w.webp',
          width: '100',
          height: '80',
        },
      },
    },
  ],
  pagination: { total_count: 50, count: 1, offset: 0 },
};

function makeRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/giphy${queryString}`, {
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });
}

function mockUpstream(payload: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(payload), { status: ok ? 200 : 500 })),
  );
}

describe('GET /api/giphy', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv('GIPHY_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('trả 503 khi chưa cấu hình GIPHY_API_KEY', async () => {
    vi.stubEnv('GIPHY_API_KEY', '');
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'GIPHY_NOT_CONFIGURED' },
    });
  });

  it('trả 400 khi kind=search mà thiếu q', async () => {
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=search'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'INVALID_QUERY' } });
  });

  it('map payload Giphy về shape rút gọn và KHÔNG lộ url gốc', async () => {
    mockUpstream(upstreamPayload);

    const response = await GET(makeRequest('?kind=trending'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      items: [
        {
          id: 'abc123',
          title: 'mèo nhảy',
          previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
          previewWidth: 100,
          previewHeight: 80,
        },
      ],
      nextOffset: 1,
    });
  });

  it('gửi rating=g và limit cố định lên Giphy', async () => {
    mockUpstream(upstreamPayload);

    await GET(makeRequest('?kind=search&q=m%C3%A8o'));

    const calledWith = vi.mocked(fetch).mock.calls[0]?.[0];
    const url = new URL(String(calledWith));
    expect(url.pathname).toBe('/v1/gifs/search');
    expect(url.searchParams.get('rating')).toBe('g');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(url.searchParams.get('q')).toBe('mèo');
  });

  it('nextOffset = null khi đã hết trang', async () => {
    mockUpstream({ ...upstreamPayload, pagination: { total_count: 1, count: 1, offset: 0 } });

    const body = await (await GET(makeRequest('?kind=trending'))).json();

    expect(body.nextOffset).toBeNull();
  });

  it('trả 429 khi vượt rate limit', async () => {
    mockUpstream(upstreamPayload);
    for (let i = 0; i < 60; i += 1) {
      await GET(makeRequest('?kind=trending'));
    }

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });

  it('trả 502 khi Giphy lỗi', async () => {
    mockUpstream({ message: 'boom' }, false);

    const response = await GET(makeRequest('?kind=trending'));

    expect(response.status).toBe(502);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/app/api/giphy/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Viết `giphy-env.ts`**

Create `src/app/api/giphy/giphy-env.ts`:

```ts
import { z } from 'zod';

const schema = z.object({ GIPHY_API_KEY: z.string().min(1) });

export type GiphyEnv = z.infer<typeof schema>;

export const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

/**
 * Đọc key Giphy — SERVER-ONLY, tuyệt đối không đặt prefix NEXT_PUBLIC_.
 *
 * Parse LAZY (lúc có request, không phải lúc import) để build không vỡ khi thiếu
 * key; route tự trả 503 GIPHY_NOT_CONFIGURED và picker hiện empty-state.
 */
export function readGiphyEnv(): GiphyEnv | null {
  const parsed = schema.safeParse({ GIPHY_API_KEY: process.env.GIPHY_API_KEY });
  return parsed.success ? parsed.data : null;
}
```

- [ ] **Step 4: Viết `route.ts`**

Create `src/app/api/giphy/route.ts`:

```ts
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit/memory';
import { GIPHY_API_BASE, readGiphyEnv } from './giphy-env';

export const runtime = 'nodejs';

/** Cố định phía server — client KHÔNG được chọn limit (chặn ép quota Giphy). */
const PAGE_SIZE = 24;
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const UPSTREAM_TIMEOUT_MS = 8_000;

const querySchema = z
  .object({
    kind: z.enum(['trending', 'search']),
    q: z.string().trim().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(4990).default(0),
  })
  .refine((value) => value.kind !== 'search' || value.q !== undefined, {
    message: 'q bắt buộc khi kind=search',
    path: ['q'],
  });

/** Giphy trả width/height dạng chuỗi → coerce. Chỉ lấy đúng field cần dùng. */
const upstreamSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().default(''),
      images: z.object({
        fixed_width_small: z.object({
          url: z.string().url(),
          webp: z.string().url().optional(),
          width: z.coerce.number().int().positive(),
          height: z.coerce.number().int().positive(),
        }),
      }),
    }),
  ),
  pagination: z.object({
    total_count: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
  }),
});

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function buildUpstreamUrl(
  apiKey: string,
  kind: 'trending' | 'search',
  q: string | undefined,
  offset: number,
): URL {
  const url = new URL(`${GIPHY_API_BASE}/${kind}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('rating', 'g');
  url.searchParams.set('bundle', 'messaging_non_clips');
  if (kind === 'search') {
    url.searchParams.set('q', q ?? '');
    url.searchParams.set('lang', 'vi');
  }
  return url;
}

export async function GET(request: Request): Promise<Response> {
  const limited = checkRateLimit({ key: `giphy:list:${getClientIp(request)}`, ...RATE_LIMIT });
  if (!limited.ok) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Bạn thao tác hơi nhanh, thử lại sau giây lát.' } },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  }

  const env = readGiphyEnv();
  if (!env) return fail(503, 'GIPHY_NOT_CONFIGURED', 'Tính năng GIF chưa được cấu hình.');

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    kind: params.get('kind') ?? 'trending',
    q: params.get('q') ?? undefined,
    offset: params.get('offset') ?? 0,
  });
  if (!parsed.success) return fail(400, 'INVALID_QUERY', 'Tham số tìm kiếm không hợp lệ.');

  const { kind, q, offset } = parsed.data;

  let payload: unknown;
  try {
    const response = await fetch(buildUpstreamUrl(env.GIPHY_API_KEY, kind, q, offset), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Giphy trả về lỗi.');
    payload = await response.json();
  } catch {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Không kết nối được tới Giphy.');
  }

  const upstream = upstreamSchema.safeParse(payload);
  if (!upstream.success) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Giphy trả về dữ liệu lạ.');

  const { data, pagination } = upstream.data;
  // KHÔNG trả url file thật: client chỉ cầm `id`, proxy /asset tự resolve khi gửi.
  const items = data.map((gif) => ({
    id: gif.id,
    title: gif.title,
    previewUrl: gif.images.fixed_width_small.webp ?? gif.images.fixed_width_small.url,
    previewWidth: gif.images.fixed_width_small.width,
    previewHeight: gif.images.fixed_width_small.height,
  }));

  const consumed = pagination.offset + pagination.count;
  const nextOffset = items.length > 0 && consumed < pagination.total_count ? consumed : null;

  return Response.json(
    { items, nextOffset },
    {
      headers: {
        'Cache-Control': kind === 'trending' ? 'public, max-age=300' : 'public, max-age=60',
      },
    },
  );
}
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `npx vitest run src/app/api/giphy/route.test.ts`
Expected: PASS — 7 test.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/giphy/giphy-env.ts src/app/api/giphy/route.ts src/app/api/giphy/route.test.ts
git commit -m "feat(api): add Giphy search proxy route with rate limiting"
```

---

## Task 3: Route tải bytes GIF

**Files:**
- Create: `src/app/api/giphy/asset/route.ts`
- Test: `src/app/api/giphy/asset/route.test.ts`

**Interfaces:**
- Consumes: `readGiphyEnv`, `GIPHY_API_BASE` (Task 2); `checkRateLimit`, `getClientIp` (Task 1).
- Produces: `GET(request: Request): Promise<Response>` — body là stream bytes ảnh, `Content-Type: image/*`.

- [ ] **Step 1: Viết test thất bại**

Create `src/app/api/giphy/asset/route.test.ts`:

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimit } from '@/lib/rate-limit/memory';
import { GET } from './route';

const detailPayload = {
  data: {
    images: {
      downsized_medium: { url: 'https://media.giphy.com/media/abc123/giphy.gif' },
      original: { url: 'https://media.giphy.com/media/abc123/original.gif' },
    },
  },
};

function makeRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/giphy/asset${queryString}`, {
    headers: { 'x-forwarded-for': '203.0.113.8' },
  });
}

/** fetch #1 = detail JSON, fetch #2 = bytes ảnh. */
function mockTwoHop(assetHeaders: Record<string, string>): void {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(detailPayload), { status: 200 }))
    .mockResolvedValueOnce(new Response('GIF89a-bytes', { status: 200, headers: assetHeaders }));
  vi.stubGlobal('fetch', fetchMock);
}

describe('GET /api/giphy/asset', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv('GIPHY_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('từ chối id chứa ký tự ngoài [A-Za-z0-9] (chặn SSRF)', async () => {
    mockTwoHop({ 'content-type': 'image/gif' });

    const response = await GET(makeRequest('?id=https%3A%2F%2Fevil.test%2Fx'));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stream bytes GIF với content-type ảnh', async () => {
    mockTwoHop({ 'content-type': 'image/gif', 'content-length': '12' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/gif');
    await expect(response.text()).resolves.toBe('GIF89a-bytes');
  });

  it('từ chối khi upstream không phải ảnh', async () => {
    mockTwoHop({ 'content-type': 'text/html' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(502);
  });

  it('từ chối file vượt 8MB', async () => {
    mockTwoHop({ 'content-type': 'image/gif', 'content-length': String(9 * 1024 * 1024) });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(413);
  });

  it('trả 503 khi chưa cấu hình key', async () => {
    vi.stubEnv('GIPHY_API_KEY', '');
    mockTwoHop({ 'content-type': 'image/gif' });

    const response = await GET(makeRequest('?id=abc123'));

    expect(response.status).toBe(503);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/app/api/giphy/asset/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Viết implementation**

Create `src/app/api/giphy/asset/route.ts`:

```ts
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit/memory';
import { GIPHY_API_BASE, readGiphyEnv } from '../giphy-env';

export const runtime = 'nodejs';

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
/** GIF gửi đi tối đa 8MB — chặn proxy bị lợi dụng thành relay tải file lớn. */
const MAX_BYTES = 8 * 1024 * 1024;
const DETAIL_TIMEOUT_MS = 8_000;
const ASSET_TIMEOUT_MS = 15_000;

/**
 * CHỈ nhận id Giphy, KHÔNG nhận URL. Đây là điểm chặn SSRF: không có cách nào
 * ép proxy gọi tới host tuỳ ý, vì URL thật do chính server resolve từ Giphy API.
 */
const querySchema = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]+$/)
    .max(64),
});

const detailSchema = z.object({
  data: z.object({
    images: z.object({
      downsized_medium: z.object({ url: z.string().url() }).optional(),
      downsized: z.object({ url: z.string().url() }).optional(),
      original: z.object({ url: z.string().url() }).optional(),
    }),
  }),
});

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** Phòng thủ lớp hai: kể cả Giphy trả URL lạ cũng không đi ra ngoài giphy.com. */
function isGiphyHost(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    return protocol === 'https:' && (hostname === 'giphy.com' || hostname.endsWith('.giphy.com'));
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<Response> {
  const parsed = querySchema.safeParse({ id: new URL(request.url).searchParams.get('id') ?? '' });
  if (!parsed.success) return fail(400, 'INVALID_QUERY', 'Mã GIF không hợp lệ.');

  const limited = checkRateLimit({ key: `giphy:asset:${getClientIp(request)}`, ...RATE_LIMIT });
  if (!limited.ok) {
    return Response.json(
      { error: { code: 'RATE_LIMITED', message: 'Bạn gửi GIF hơi nhanh, thử lại sau giây lát.' } },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  }

  const env = readGiphyEnv();
  if (!env) return fail(503, 'GIPHY_NOT_CONFIGURED', 'Tính năng GIF chưa được cấu hình.');

  const { id } = parsed.data;
  const detailUrl = new URL(`${GIPHY_API_BASE}/${id}`);
  detailUrl.searchParams.set('api_key', env.GIPHY_API_KEY);

  let detailPayload: unknown;
  try {
    const response = await fetch(detailUrl, { signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS) });
    if (!response.ok) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Không lấy được GIF từ Giphy.');
    detailPayload = await response.json();
  } catch {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Không kết nối được tới Giphy.');
  }

  const detail = detailSchema.safeParse(detailPayload);
  if (!detail.success) return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Giphy trả về dữ liệu lạ.');

  const { images } = detail.data.data;
  // downsized_medium (~≤5MB) đủ nét cho chat và nhẹ hơn original nhiều lần.
  const source = images.downsized_medium?.url ?? images.downsized?.url ?? images.original?.url;
  if (!source || !isGiphyHost(source)) {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'GIF không khả dụng.');
  }

  let asset: Response;
  try {
    asset = await fetch(source, { signal: AbortSignal.timeout(ASSET_TIMEOUT_MS) });
  } catch {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'Tải GIF thất bại.');
  }

  const contentType = asset.headers.get('content-type') ?? '';
  if (!asset.ok || !asset.body || !contentType.startsWith('image/')) {
    return fail(502, 'GIPHY_UPSTREAM_ERROR', 'GIF không khả dụng.');
  }

  const contentLength = Number(asset.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BYTES) {
    return fail(413, 'GIF_TOO_LARGE', 'GIF này quá lớn để gửi.');
  }

  return new Response(asset.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Disposition': `inline; filename="giphy-${id}.gif"`,
    },
  });
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/app/api/giphy/asset/route.test.ts`
Expected: PASS — 5 test.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/giphy/asset/route.ts src/app/api/giphy/asset/route.test.ts
git commit -m "feat(api): add Giphy asset proxy with SSRF and size guards"
```

---

## Task 4: Type + transport + query key

**Files:**
- Create: `src/features/chat/types/gif.ts`
- Create: `src/services/giphy.api.ts`
- Test: `src/services/giphy.api.test.ts`
- Modify: `src/services/keys.ts` (thêm block mới ở cuối file)
- Modify: `src/features/chat/types/index.ts` (thêm block re-export)

**Interfaces:**
- Consumes: shape response của Task 2 và Task 3.
- Produces:
  - `giphyItemSchema`, `giphyPageSchema`, `type GiphyItem`, `type GiphyPage`
  - `giphyApi.list({ q: string; offset: number }): Promise<GiphyPage>`
  - `giphyApi.fetchAsset(id: string): Promise<Blob>`
  - `class GiphyError extends Error { readonly code: string }`
  - `giphyKeys.all`, `giphyKeys.list(q: string)`

> **Lệch nhỏ so với spec §4.2 (có chủ đích):** spec ghi `giphyKeys.trending() / search(q)`. Hook coi `q === ''` là trending nên **một** key `list(q)` là đủ; hai key sẽ tạo hai cache trùng nghĩa. Ghi lại ở đây để người review không tưởng là bỏ sót.

- [ ] **Step 1: Viết test thất bại**

Create `src/services/giphy.api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GiphyError, giphyApi } from './giphy.api';

const page = {
  items: [
    {
      id: 'abc123',
      title: 'mèo nhảy',
      previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
      previewWidth: 100,
      previewHeight: 80,
    },
  ],
  nextOffset: 24,
};

afterEach(() => vi.unstubAllGlobals());

describe('giphyApi.list', () => {
  it('gọi kind=trending khi q rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(page)));

    await giphyApi.list({ q: '', offset: 0 });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]), 'http://localhost');
    expect(url.searchParams.get('kind')).toBe('trending');
    expect(url.searchParams.get('q')).toBeNull();
  });

  it('gọi kind=search kèm q và offset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(page)));

    const result = await giphyApi.list({ q: 'mèo', offset: 24 });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]), 'http://localhost');
    expect(url.searchParams.get('kind')).toBe('search');
    expect(url.searchParams.get('q')).toBe('mèo');
    expect(url.searchParams.get('offset')).toBe('24');
    expect(result).toEqual(page);
  });

  it('ném GiphyError mang đúng code khi route trả lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: { code: 'GIPHY_NOT_CONFIGURED', message: 'chưa cấu hình' } }, { status: 503 }),
      ),
    );

    await expect(giphyApi.list({ q: '', offset: 0 })).rejects.toMatchObject({
      code: 'GIPHY_NOT_CONFIGURED',
    });
  });

  it('ném lỗi khi payload sai schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [{ id: 1 }] })));

    await expect(giphyApi.list({ q: '', offset: 0 })).rejects.toThrow();
  });
});

describe('giphyApi.fetchAsset', () => {
  it('trả Blob khi thành công', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('bytes', { status: 200, headers: { 'content-type': 'image/gif' } })),
    );

    const blob = await giphyApi.fetchAsset('abc123');

    expect(blob.size).toBeGreaterThan(0);
  });

  it('ném GiphyError khi route trả lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'GIF_TOO_LARGE', message: 'quá lớn' } }, { status: 413 })),
    );

    await expect(giphyApi.fetchAsset('abc123')).rejects.toBeInstanceOf(GiphyError);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/services/giphy.api.test.ts`
Expected: FAIL — `Failed to resolve import "./giphy.api"`.

- [ ] **Step 3: Viết type**

Create `src/features/chat/types/gif.ts`:

```ts
import { z } from 'zod';

/** Zod là nguồn sự thật type cho data có I/O — không viết type tay song song (rule 01). */
export const giphyItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  previewUrl: z.string().url(),
  previewWidth: z.number().int().positive(),
  previewHeight: z.number().int().positive(),
});

export const giphyPageSchema = z.object({
  items: z.array(giphyItemSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export type GiphyItem = z.infer<typeof giphyItemSchema>;
export type GiphyPage = z.infer<typeof giphyPageSchema>;
```

- [ ] **Step 4: Viết transport**

Create `src/services/giphy.api.ts`:

```ts
import { z } from 'zod';
import { giphyPageSchema, type GiphyPage } from '@/features/chat/types/gif';

/**
 * Transport GIF — gọi route handler same-origin `/api/giphy`.
 *
 * KHÔNG dùng `apiClient`: route này không cần JWT của vibe backend và không
 * dùng envelope {success,data} của BE. Pure transport, không đụng cache/state.
 */

export class GiphyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GiphyError';
    this.code = code;
  }
}

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

async function throwFromResponse(response: Response): Promise<never> {
  const raw: unknown = await response.json().catch(() => null);
  const parsed = errorSchema.safeParse(raw);
  throw new GiphyError(
    parsed.success ? parsed.data.error.code : 'GIPHY_UNKNOWN',
    parsed.success ? parsed.data.error.message : 'Không tải được GIF.',
  );
}

export const giphyApi = {
  /** `q` rỗng → trending. Ngược lại → search. */
  list: async ({ q, offset }: { q: string; offset: number }): Promise<GiphyPage> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (q) {
      params.set('kind', 'search');
      params.set('q', q);
    } else {
      params.set('kind', 'trending');
    }

    const response = await fetch(`/api/giphy?${params.toString()}`);
    if (!response.ok) await throwFromResponse(response);
    return giphyPageSchema.parse(await response.json());
  },

  /** Tải bytes GIF qua proxy (né CORS + giấu URL gốc). */
  fetchAsset: async (id: string): Promise<Blob> => {
    const response = await fetch(`/api/giphy/asset?id=${encodeURIComponent(id)}`);
    if (!response.ok) await throwFromResponse(response);
    return response.blob();
  },
} as const;
```

- [ ] **Step 5: Thêm query key**

Modify `src/services/keys.ts` — thêm vào cuối file:

```ts
export const giphyKeys = {
  all: ['giphy'] as const,
  /** `q` rỗng = trending; dùng chung một key để tránh hai cache trùng nghĩa. */
  list: (q: string) => [...giphyKeys.all, 'list', q] as const,
} as const;
```

- [ ] **Step 6: Re-export type**

Modify `src/features/chat/types/index.ts` — thêm sau dòng `export type { Sticker, StickerPack, MyStickers } from './sticker';`:

```ts
export type { GiphyItem, GiphyPage } from './gif';
```

- [ ] **Step 7: Chạy test + typecheck**

Run: `npx vitest run src/services/giphy.api.test.ts && npm run typecheck`
Expected: PASS — 6 test; typecheck không lỗi.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/types/gif.ts src/features/chat/types/index.ts \
        src/services/giphy.api.ts src/services/giphy.api.test.ts src/services/keys.ts
git commit -m "feat(services): add Giphy transport, schema and query keys"
```

---

## Task 5: Hook `use-giphy`

**Files:**
- Create: `src/features/chat/hooks/use-giphy.ts`
- Test: `src/features/chat/hooks/use-giphy.test.tsx`

**Interfaces:**
- Consumes: `giphyApi`, `GiphyError` (Task 4); `giphyKeys` (Task 4); `mediaApi.uploadDirect` từ `@/services/media.api`; `buildOptimisticAttachment` từ `./useAttachments`; `useSendMessage` từ `./use-mutations`; `useMessageReplyStore` từ `@/features/chat/stores/message-reply.store`.
- Produces:
  - `useGiphyGifs(query: string)` → `UseInfiniteQueryResult<InfiniteData<GiphyPage>, Error>`
  - `useSendGif(conversationId: string)` → `UseMutationResult<void, Error, GiphyItem>`

> `useSendGif` gắn `optimisticAttachment: buildOptimisticAttachment(media)` — `SendMessageInput` đã hỗ trợ sẵn field này (`src/features/chat/types/message.ts:139`), nhờ đó bong bóng GIF hiện ngay khi mutation gửi đi thay vì đợi echo từ WS.

- [ ] **Step 1: Viết test thất bại**

Create `src/features/chat/hooks/use-giphy.test.tsx`:

```tsx
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSendGif } from './use-giphy';
import type { GiphyItem } from '@/features/chat/types/gif';

const fetchAsset = vi.fn();
const uploadDirect = vi.fn();
const sendMessage = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/giphy.api', async () => {
  const actual = await vi.importActual<typeof import('@/services/giphy.api')>('@/services/giphy.api');
  return { ...actual, giphyApi: { list: vi.fn(), fetchAsset: (id: string) => fetchAsset(id) } };
});

vi.mock('@/services/media.api', () => ({
  mediaApi: { uploadDirect: (...args: unknown[]) => uploadDirect(...args) },
}));

vi.mock('./use-mutations', () => ({
  useSendMessage: () => ({ mutateAsync: sendMessage }),
}));

vi.mock('sonner', () => ({ toast: { error: (msg: string) => toastError(msg) } }));

const media = {
  id: 'media-1',
  originalName: 'giphy-abc123.gif',
  size: 1024,
  mimeType: 'image/gif',
  width: 200,
  height: 160,
  duration: null,
  downloadUrl: 'https://s3.test/signed.gif',
};

const gif: GiphyItem = {
  id: 'abc123',
  title: 'mèo nhảy',
  previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
  previewWidth: 100,
  previewHeight: 80,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSendGif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAsset.mockResolvedValue(new Blob(['bytes'], { type: 'image/gif' }));
    uploadDirect.mockResolvedValue(media);
    sendMessage.mockResolvedValue('msg-1');
  });

  it('tải asset → upload ATTACHMENT → gửi tin IMAGE kèm attachmentIds', async () => {
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    expect(fetchAsset).toHaveBeenCalledWith('abc123');
    const [file, category] = uploadDirect.mock.calls[0] ?? [];
    expect(category).toBe('ATTACHMENT');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('giphy-abc123.gif');
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        type: 'IMAGE',
        attachmentIds: ['media-1'],
      }),
    );
  });

  it('không gửi tin khi tải asset thất bại và báo lỗi cho người dùng', async () => {
    fetchAsset.mockRejectedValue(new Error('mạng lỗi'));
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(uploadDirect).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('không gửi tin khi upload thất bại', async () => {
    uploadDirect.mockRejectedValue(new Error('upload hỏng'));
    const { result } = renderHook(() => useSendGif('conv-1'), { wrapper });

    result.current.mutate(gif);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/features/chat/hooks/use-giphy.test.tsx`
Expected: FAIL — `Failed to resolve import "./use-giphy"`.

- [ ] **Step 3: Viết implementation**

Create `src/features/chat/hooks/use-giphy.ts`:

```ts
'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GiphyError, giphyApi } from '@/services/giphy.api';
import { giphyKeys } from '@/services/keys';
import { mediaApi } from '@/services/media.api';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import type { GiphyItem } from '@/features/chat/types/gif';
import { buildOptimisticAttachment } from './useAttachments';
import { useSendMessage } from './use-mutations';

/** `query` PHẢI là giá trị đã debounce — component gọi `useDebouncedValue` trước khi truyền vào. */
export function useGiphyGifs(query: string) {
  return useInfiniteQuery({
    queryKey: giphyKeys.list(query),
    queryFn: ({ pageParam }) => giphyApi.list({ q: query, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Gửi GIF = tải bytes qua proxy → upload như ảnh thường → gửi tin IMAGE.
 * BE không có type GIF và IMAGE bắt buộc attachmentIds (FRONTEND/04-messages.md),
 * nên đây là đường duy nhất không cần đổi backend.
 */
export function useSendGif(conversationId: string) {
  const send = useSendMessage();
  const replying = useMessageReplyStore((s) => s.replying);
  const cancelReply = useMessageReplyStore((s) => s.cancelReply);

  return useMutation<void, Error, GiphyItem>({
    mutationFn: async (gif) => {
      const blob = await giphyApi.fetchAsset(gif.id);
      const file = new File([blob], `giphy-${gif.id}.gif`, { type: 'image/gif' });
      // category ATTACHMENT: BE validate theo ĐUÔI file, `.gif` nằm trong whitelist.
      const media = await mediaApi.uploadDirect(file, 'ATTACHMENT');

      await send.mutateAsync({
        conversationId,
        type: 'IMAGE',
        attachmentIds: [media.id],
        clientNonce: crypto.randomUUID(),
        replyToMessageId:
          replying?.conversationId === conversationId ? replying.messageId : undefined,
        optimisticAttachment: buildOptimisticAttachment(media),
      });

      cancelReply();
    },
    onError: (error) => {
      toast.error(
        error instanceof GiphyError ? error.message : 'Gửi GIF thất bại. Bạn thử lại nhé.',
      );
    },
  });
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/features/chat/hooks/use-giphy.test.tsx`
Expected: PASS — 3 test.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/hooks/use-giphy.ts src/features/chat/hooks/use-giphy.test.tsx
git commit -m "feat(chat): add Giphy query and send-gif hooks"
```

---

## Task 6: `GifPicker`

**Files:**
- Create: `src/features/chat/components/messages/media-picker/GifPicker.tsx`
- Test: `src/features/chat/components/messages/media-picker/GifPicker.test.tsx`

**Interfaces:**
- Consumes: `useGiphyGifs` (Task 5); `useDebouncedValue` từ `@/lib/hooks/useDebouncedValue`; `GiphyError` (Task 4).
- Produces: `GifPicker({ onPick, sendingId }: { onPick: (gif: GiphyItem) => void; sendingId?: string | null })`

- [ ] **Step 1: Viết test thất bại**

Create `src/features/chat/components/messages/media-picker/GifPicker.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GiphyError } from '@/services/giphy.api';
import { GifPicker } from './GifPicker';

const useGiphyGifs = vi.fn();
vi.mock('@/features/chat/hooks/use-giphy', () => ({
  useGiphyGifs: (query: string) => useGiphyGifs(query),
}));

// jsdom không có IntersectionObserver — sentinel "tải thêm" cần stub này.
class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('IntersectionObserver', ObserverStub);

const gif = {
  id: 'abc123',
  title: 'mèo nhảy',
  previewUrl: 'https://media.giphy.com/media/abc123/100w.webp',
  previewWidth: 100,
  previewHeight: 80,
};

function mockState(state: Record<string, unknown>): void {
  useGiphyGifs.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...state,
  });
}

describe('GifPicker — 4 trạng thái', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loading: hiện skeleton', () => {
    mockState({ isPending: true });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByTestId('gif-skeleton')).toBeInTheDocument();
  });

  it('error: hiện thông báo kèm nút thử lại', async () => {
    const refetch = vi.fn();
    mockState({ isError: true, error: new Error('toang'), refetch });
    render(<GifPicker onPick={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(screen.getByText('Không tải được GIF')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('error GIPHY_NOT_CONFIGURED: không cho thử lại', () => {
    mockState({ isError: true, error: new GiphyError('GIPHY_NOT_CONFIGURED', 'chưa cấu hình') });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByText('Tính năng GIF chưa được cấu hình')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('empty: báo không tìm thấy', () => {
    mockState({ data: { pages: [{ items: [], nextOffset: null }] } });
    render(<GifPicker onPick={vi.fn()} />);

    expect(screen.getByText(/Chưa có GIF nào/)).toBeInTheDocument();
  });

  it('data: render lưới và gọi onPick', async () => {
    const onPick = vi.fn();
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    render(<GifPicker onPick={onPick} />);

    await userEvent.click(screen.getByRole('button', { name: 'mèo nhảy' }));

    expect(onPick).toHaveBeenCalledWith(gif);
  });

  it('khoá lưới khi đang gửi một GIF', () => {
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    render(<GifPicker onPick={vi.fn()} sendingId="abc123" />);

    expect(screen.getByRole('button', { name: 'mèo nhảy' })).toBeDisabled();
  });

  it('gõ tìm kiếm rồi truyền query đã debounce xuống hook', async () => {
    vi.useFakeTimers();
    mockState({ data: { pages: [{ items: [gif], nextOffset: null }] } });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<GifPicker onPick={vi.fn()} />);

    await user.type(screen.getByRole('searchbox', { name: 'Tìm GIF' }), 'mèo');
    expect(useGiphyGifs).toHaveBeenLastCalledWith('');

    await vi.advanceTimersByTimeAsync(400);
    expect(useGiphyGifs).toHaveBeenLastCalledWith('mèo');

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/features/chat/components/messages/media-picker/GifPicker.test.tsx`
Expected: FAIL — `Failed to resolve import "./GifPicker"`.

- [ ] **Step 3: Viết implementation**

Create `src/features/chat/components/messages/media-picker/GifPicker.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useGiphyGifs } from '@/features/chat/hooks/use-giphy';
import { GiphyError } from '@/services/giphy.api';
import type { GiphyItem } from '@/features/chat/types/gif';
import { cn } from '@/lib/utils/cn';

type GifPickerProps = {
  onPick: (gif: GiphyItem) => void;
  /** id GIF đang gửi — hiện spinner trên ô đó và khoá cả lưới. */
  sendingId?: string | null;
};

function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}

export function GifPicker({ onPick, sendingId }: GifPickerProps) {
  const [term, setTerm] = useState('');
  const query = useDebouncedValue(term, 350);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useGiphyGifs(query);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const notConfigured = error instanceof GiphyError && error.code === 'GIPHY_NOT_CONFIGURED';

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <label className="sr-only" htmlFor="gif-search">
          Tìm GIF
        </label>
        <input
          id="gif-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Tìm GIF trên GIPHY..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isPending ? (
        <div data-testid="gif-skeleton" className="grid flex-1 grid-cols-2 content-start gap-2 overflow-hidden p-2 md:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <StatusBox>
          <ImageOff className="h-7 w-7" />
          <p>{notConfigured ? 'Tính năng GIF chưa được cấu hình' : 'Không tải được GIF'}</p>
          {!notConfigured && (
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              Thử lại
            </Button>
          )}
        </StatusBox>
      ) : items.length === 0 ? (
        <StatusBox>
          <ImageOff className="h-7 w-7" />
          <p>{query ? `Không tìm thấy GIF cho "${query}"` : 'Chưa có GIF nào'}</p>
        </StatusBox>
      ) : (
        <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2 md:grid-cols-3">
          {items.map((gif) => (
            <button
              key={gif.id}
              type="button"
              disabled={Boolean(sendingId)}
              onClick={() => onPick(gif)}
              aria-label={gif.title || 'GIF'}
              style={{ aspectRatio: `${gif.previewWidth} / ${gif.previewHeight}` }}
              className={cn(
                'relative overflow-hidden rounded-lg bg-muted transition-opacity',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sendingId && sendingId !== gif.id && 'opacity-40',
              )}
            >
              {/* Ảnh CDN Giphy, không qua next/image (URL ngoài + cần giữ animation). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gif.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              {sendingId === gif.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </span>
              )}
            </button>
          ))}
          <div ref={sentinelRef} className="col-span-full h-6" />
          {isFetchingNextPage && (
            <p className="col-span-full py-1 text-center text-[12px] text-muted-foreground">
              Đang tải thêm...
            </p>
          )}
        </div>
      )}

      <p className="shrink-0 border-t border-border px-3 py-1.5 text-center text-[10.5px] text-muted-foreground">
        Powered by GIPHY
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/features/chat/components/messages/media-picker/GifPicker.test.tsx`
Expected: PASS — 7 test.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/messages/media-picker/GifPicker.tsx \
        src/features/chat/components/messages/media-picker/GifPicker.test.tsx
git commit -m "feat(chat): add GifPicker with search, infinite scroll and four states"
```

---

## Task 7: Ghi nhớ tab + `MediaPickerPanel`

**Files:**
- Create: `src/features/chat/components/messages/media-picker/use-picker-tab.ts`
- Create: `src/features/chat/components/messages/media-picker/MediaPickerPanel.tsx`
- Test: `src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx`

**Interfaces:**
- Consumes: `getItem`/`setItem` từ `@/lib/storage/local-storage`; `EmojiPicker` từ `@/components/common/EmojiPicker`; `StickerPicker` từ `../StickerPicker`; `GifPicker` (Task 6).
- Produces:
  - `PICKER_TABS`, `type PickerTab = 'emoji' | 'gif' | 'sticker'`, `isPickerTab(value: unknown): value is PickerTab`, `usePickerTab(): [PickerTab, (tab: PickerTab) => void]`
  - `MediaPickerPanel(props)` với props:
    ```ts
    type MediaPickerPanelProps = {
      onEmojiSelect: (emoji: string) => void;
      onPickSticker: (sticker: Sticker) => void;
      onPickGif: (gif: GiphyItem) => void;
      sendingGifId?: string | null;
      /** true khi đang sửa tin — chỉ cho chèn emoji, ẩn GIF/Sticker. */
      emojiOnly?: boolean;
    };
    ```

- [ ] **Step 1: Viết test thất bại**

Create `src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaPickerPanel } from './MediaPickerPanel';

const getItem = vi.fn();
const setItem = vi.fn();

vi.mock('@/lib/storage/local-storage', () => ({
  getItem: (key: string) => getItem(key),
  setItem: (key: string, value: string) => setItem(key, value),
}));

vi.mock('@/components/common/EmojiPicker', () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
  prefetchEmojiPicker: vi.fn(),
}));

vi.mock('../StickerPicker', () => ({
  StickerPicker: () => <div data-testid="sticker-picker" />,
}));

vi.mock('./GifPicker', () => ({
  GifPicker: () => <div data-testid="gif-picker" />,
}));

const baseProps = {
  onEmojiSelect: vi.fn(),
  onPickSticker: vi.fn(),
  onPickGif: vi.fn(),
};

describe('MediaPickerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getItem.mockReturnValue(null);
  });

  it('mặc định mở tab Emoji', () => {
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('gif-picker')).not.toBeInTheDocument();
  });

  it('đổi sang tab GIF và ghi nhớ lựa chọn', async () => {
    render(<MediaPickerPanel {...baseProps} />);

    await userEvent.click(screen.getByRole('tab', { name: 'GIF' }));

    expect(await screen.findByTestId('gif-picker')).toBeInTheDocument();
    expect(setItem).toHaveBeenCalledWith('chat.media-picker.tab', 'gif');
  });

  it('khôi phục tab đã lưu khi mở lại', () => {
    getItem.mockReturnValue('sticker');
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('sticker-picker')).toBeInTheDocument();
  });

  it('bỏ qua giá trị lưu trữ rác', () => {
    getItem.mockReturnValue('hacked');
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('emojiOnly: ẩn hoàn toàn thanh tab và chỉ hiện emoji', () => {
    render(<MediaPickerPanel {...baseProps} emojiOnly />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'GIF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Sticker' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./MediaPickerPanel"`.

- [ ] **Step 3: Viết `use-picker-tab.ts`**

Create `src/features/chat/components/messages/media-picker/use-picker-tab.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';
import { getItem, setItem } from '@/lib/storage/local-storage';

export const PICKER_TABS = ['emoji', 'gif', 'sticker'] as const;
export type PickerTab = (typeof PICKER_TABS)[number];

const STORAGE_KEY = 'chat.media-picker.tab';

/** Type guard thay cho ép kiểu — giá trị trong localStorage không đáng tin. */
export function isPickerTab(value: unknown): value is PickerTab {
  return PICKER_TABS.some((tab) => tab === value);
}

/**
 * Nhớ tab người dùng mở lần cuối.
 *
 * Lazy initializer an toàn vì panel chỉ render sau khi popover/drawer mở
 * (post-hydration) → không có nguy cơ hydration mismatch, và không bị nháy
 * tab mặc định như khi đọc trong useEffect.
 */
export function usePickerTab(): [PickerTab, (tab: PickerTab) => void] {
  const [tab, setTab] = useState<PickerTab>(() => {
    const saved = getItem(STORAGE_KEY);
    return isPickerTab(saved) ? saved : 'emoji';
  });

  const select = useCallback((next: PickerTab) => {
    setTab(next);
    setItem(STORAGE_KEY, next);
  }, []);

  return [tab, select];
}
```

- [ ] **Step 4: Viết `MediaPickerPanel.tsx`**

Create `src/features/chat/components/messages/media-picker/MediaPickerPanel.tsx`:

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { EmojiPicker } from '@/components/common/EmojiPicker';
import type { GiphyItem } from '@/features/chat/types/gif';
import type { Sticker } from '@/features/chat/types/sticker';
import { StickerPicker } from '../StickerPicker';
import { GifPicker } from './GifPicker';
import { isPickerTab, usePickerTab } from './use-picker-tab';

type MediaPickerPanelProps = {
  onEmojiSelect: (emoji: string) => void;
  onPickSticker: (sticker: Sticker) => void;
  onPickGif: (gif: GiphyItem) => void;
  /** id GIF đang gửi — chuyển tiếp cho GifPicker để khoá lưới. */
  sendingGifId?: string | null;
  /** true khi đang sửa tin: chỉ chèn emoji được, GIF/Sticker không gắn vào tin đang sửa. */
  emojiOnly?: boolean;
};

/**
 * Khung 3 tab của picker. Thuần trình bày — mọi mutation do MediaPickerTrigger
 * sở hữu, nhờ vậy component này test được mà không cần QueryClient.
 */
export function MediaPickerPanel({
  onEmojiSelect,
  onPickSticker,
  onPickGif,
  sendingGifId,
  emojiOnly,
}: MediaPickerPanelProps) {
  const [tab, selectTab] = usePickerTab();

  if (emojiOnly) {
    return (
      <div className="h-[440px] w-full md:w-[352px]">
        <EmojiPicker onSelect={onEmojiSelect} />
      </div>
    );
  }

  function handleTabChange(value: unknown): void {
    if (isPickerTab(value)) selectTab(value);
  }

  return (
    <Tabs
      value={tab}
      onValueChange={handleTabChange}
      className="h-[440px] w-full md:w-[352px]"
    >
      <TabsList className="m-2 w-[calc(100%-1rem)] shrink-0 justify-around">
        <TabsTrigger value="emoji" className="flex-1">
          Emoji
        </TabsTrigger>
        <TabsTrigger value="gif" className="flex-1">
          GIF
        </TabsTrigger>
        <TabsTrigger value="sticker" className="flex-1">
          Sticker
        </TabsTrigger>
      </TabsList>

      <TabsContent value="emoji" className="mt-0 flex-1 overflow-hidden">
        <EmojiPicker onSelect={onEmojiSelect} />
      </TabsContent>
      <TabsContent value="gif" className="mt-0 h-[calc(100%-3.25rem)]">
        <GifPicker onPick={onPickGif} sendingId={sendingGifId} />
      </TabsContent>
      <TabsContent value="sticker" className="mt-0 flex-1 overflow-hidden">
        <StickerPicker onPick={onPickSticker} />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `npx vitest run src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx`
Expected: PASS — 5 test.

> Nếu `getByRole('tab', ...)` không khớp, kiểm tra Base UI render `role="tab"` trên `BaseTabs.Tab` (mặc định có). Không đổi test sang `getByText` — vai trò a11y là thứ đang được kiểm.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/components/messages/media-picker/use-picker-tab.ts \
        src/features/chat/components/messages/media-picker/MediaPickerPanel.tsx \
        src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx
git commit -m "feat(chat): add MediaPickerPanel with remembered tab selection"
```

---

## Task 8: `MediaPickerTrigger` + barrel

**Files:**
- Create: `src/features/chat/components/messages/media-picker/MediaPickerTrigger.tsx`
- Create: `src/features/chat/components/messages/media-picker/index.ts`

**Interfaces:**
- Consumes: `MediaPickerPanel` (Task 7); `useSendGif` (Task 5); `useSendSticker` từ `@/features/chat/hooks/use-stickers`; `useIsMobile`; `Popover*`, `Drawer*`, `Button`.
- Produces: `MediaPickerTrigger({ conversationId, disabled, emojiOnly, onEmojiSelect })`

- [ ] **Step 1: Viết implementation**

Create `src/features/chat/components/messages/media-picker/MediaPickerTrigger.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { Drawer, DrawerContent } from '@/components/ui/drawer/Drawer';
import { prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSendSticker } from '@/features/chat/hooks/use-stickers';
import { useSendGif } from '@/features/chat/hooks/use-giphy';
import type { GiphyItem } from '@/features/chat/types/gif';
import type { Sticker } from '@/features/chat/types/sticker';
import { MediaPickerPanel } from './MediaPickerPanel';

type MediaPickerTriggerProps = {
  conversationId: string;
  disabled?: boolean;
  /** true khi đang sửa tin — panel chỉ còn emoji. */
  emojiOnly?: boolean;
  onEmojiSelect: (emoji: string) => void;
};

/**
 * Điểm vào DUY NHẤT cho emoji / GIF / sticker. Sở hữu toàn bộ state async;
 * MediaPickerPanel chỉ trình bày.
 */
export function MediaPickerTrigger({
  conversationId,
  disabled,
  emojiOnly,
  onEmojiSelect,
}: MediaPickerTriggerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [sendingGifId, setSendingGifId] = useState<string | null>(null);
  const sendSticker = useSendSticker(conversationId);
  const sendGif = useSendGif(conversationId);

  function handleEmojiSelect(emoji: string): void {
    onEmojiSelect(emoji);
    setOpen(false);
  }

  function handlePickSticker(sticker: Sticker): void {
    sendSticker.mutate(sticker, { onSuccess: () => setOpen(false) });
  }

  // Giữ panel mở trong lúc gửi: useSendGif phải tải + upload xong mới có bong bóng
  // optimistic, đóng ngay sẽ khiến người dùng không thấy phản hồi nào trong 1–2s.
  function handlePickGif(gif: GiphyItem): void {
    if (sendingGifId) return;
    setSendingGifId(gif.id);
    sendGif.mutate(gif, {
      onSuccess: () => setOpen(false),
      onSettled: () => setSendingGifId(null),
    });
  }

  const panel = (
    <MediaPickerPanel
      emojiOnly={emojiOnly}
      sendingGifId={sendingGifId}
      onEmojiSelect={handleEmojiSelect}
      onPickSticker={handlePickSticker}
      onPickGif={handlePickGif}
    />
  );

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      title="Emoji, GIF và sticker"
      aria-label="Emoji, GIF và sticker"
      className="text-muted-foreground hover:text-primary"
      onMouseEnter={prefetchEmojiPicker}
      onFocus={prefetchEmojiPicker}
    >
      <Smile className="h-[18px] w-[18px]" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <span onClick={() => !disabled && setOpen(true)}>{triggerButton}</span>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent direction="bottom" className="max-h-[70dvh] rounded-t-2xl">
            {panel}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{triggerButton}</PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
        {panel}
      </PopoverContent>
    </Popover>
  );
}
```

> **Lưu ý a11y:** nhánh mobile bọc nút trong `<span onClick>` là mùi code. Nếu `DrawerTrigger` (đã export sẵn, dùng pattern `render` giống `PopoverTrigger`) hoạt động, **hãy dùng nó** thay cho `<span>`: `<DrawerTrigger>{triggerButton}</DrawerTrigger>` đặt trong `<Drawer>`. Thử `DrawerTrigger` trước; chỉ giữ `<span>` nếu Base UI báo lỗi lồng nút.

- [ ] **Step 2: Viết barrel**

Create `src/features/chat/components/messages/media-picker/index.ts`:

```ts
export { MediaPickerTrigger } from './MediaPickerTrigger';
```

- [ ] **Step 3: Kiểm tra typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS, không cảnh báo mới.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/components/messages/media-picker/MediaPickerTrigger.tsx \
        src/features/chat/components/messages/media-picker/index.ts
git commit -m "feat(chat): add MediaPickerTrigger with popover and drawer shells"
```

---

## Task 9: Thu gọn `ComposerActions` + dọn `useMessageComposer`

**Files:**
- Modify: `src/features/chat/components/messages/ComposerActions.tsx` (345 → ~155 dòng)
- Modify: `src/features/chat/components/messages/ComposerActions.test.tsx`
- Modify: `src/features/chat/hooks/useMessageComposer.ts:42`, `:288-291`, `:296-298` (state `emojiOpen` + `handleEmojiButtonClick` + return)
- Modify: `src/features/chat/components/messages/MessageInput.tsx:66-90`, `:205-226`

**Interfaces:**
- Consumes: `MediaPickerTrigger` (Task 8).
- Produces: `ComposerActionsProps` **bỏ** ba prop `emojiOpen`, `onEmojiOpenChange`, `onEmojiButtonClick`; giữ `onEmojiSelect`. `useMessageComposer` không còn trả `emojiOpen` / `setEmojiOpen` / `handleEmojiButtonClick`.

- [ ] **Step 1: Cập nhật test cho hành vi mới (test sẽ đỏ)**

Modify `src/features/chat/components/messages/ComposerActions.test.tsx` — thay toàn bộ nội dung:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposerActions } from './ComposerActions';

let isMobile = false;

vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

vi.mock('./media-picker', () => ({
  MediaPickerTrigger: ({ emojiOnly }: { emojiOnly?: boolean }) => (
    <button type="button" aria-label="Emoji, GIF và sticker" data-emoji-only={String(Boolean(emojiOnly))} />
  ),
}));

const baseProps = {
  conversationId: 'conv-1',
  isEditing: false,
  expanded: false,
  selfDestructTtl: null,
  onFiles: vi.fn(),
  onSelfDestruct: vi.fn(),
  onScheduleClick: vi.fn(),
  onContactClick: vi.fn(),
  onEmojiSelect: vi.fn(),
  onToggleExpanded: vi.fn(),
};

describe('ComposerActions', () => {
  beforeEach(() => {
    isMobile = false;
    vi.clearAllMocks();
  });

  it('desktop: giữ shortcut ảnh/tệp và đúng MỘT nút mở picker', () => {
    render(<ComposerActions {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi tệp' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Emoji, GIF và sticker' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Sticker' })).not.toBeInTheDocument();
  });

  it('mobile: nút picker vẫn hiện ngoài thanh, ảnh/tệp nằm trong menu', async () => {
    isMobile = true;
    render(<ComposerActions {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Emoji, GIF và sticker' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi ảnh' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));

    expect(await screen.findByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
  });

  it('khi sửa tin: picker chuyển sang chế độ chỉ emoji', () => {
    render(<ComposerActions {...baseProps} isEditing />);

    expect(screen.getByRole('button', { name: 'Emoji, GIF và sticker' })).toHaveAttribute(
      'data-emoji-only',
      'true',
    );
  });

  it('giữ action Mở WebApp trong menu thêm', async () => {
    const onWebappClick = vi.fn();
    render(<ComposerActions {...baseProps} onWebappClick={onWebappClick} />);

    expect(screen.queryByRole('button', { name: 'Mở WebApp' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mở WebApp' }));

    expect(onWebappClick).toHaveBeenCalledOnce();
  });

  it('chỉ hiện upload ảnh sticker trong hội thoại bot Stickers', () => {
    render(<ComposerActions {...baseProps} stickerBotConversation />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh sticker' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi tệp' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `npx vitest run src/features/chat/components/messages/ComposerActions.test.tsx`
Expected: FAIL — component cũ vẫn còn nút "Emoji"/"Sticker" riêng và vẫn đòi prop `emojiOpen`.

- [ ] **Step 3: Viết lại `ComposerActions.tsx`**

Replace toàn bộ `src/features/chat/components/messages/ComposerActions.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import {
  BarChart2,
  Bot,
  CalendarClock,
  Check,
  Clock,
  IdCard,
  MoreHorizontal,
  PanelTopOpen,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover/Popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { cn } from "@/lib/utils/cn";
import { SELF_DESTRUCT_OPTIONS } from "@/features/chat/utils";
import type { AttachmentKind } from "@/features/chat/hooks/useAttachments";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { AttachmentButtons } from "./attachment/AttachmentButtons";
import { MediaPickerTrigger } from "./media-picker";

type ActionItemProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
};

function ActionItem({ icon, label, onClick, active }: ActionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

type ComposerActionsProps = {
  conversationId: string;
  disabled?: boolean;
  isEditing: boolean;
  expanded: boolean;
  selfDestructTtl: number | null;
  onFiles: (files: FileList | File[], kind: AttachmentKind) => void;
  onSelfDestruct: (seconds: number | null) => void;
  onScheduleClick: () => void;
  onContactClick: () => void;
  onEmojiSelect: (emoji: string) => void;
  onToggleExpanded: () => void;
  onWebappClick?: () => void;
  onAiClick?: () => void;
  onPollClick?: () => void;
  stickerBotConversation?: boolean;
};

/** Cụm nút trái của ô soạn: đính kèm, picker emoji/GIF/sticker, menu tuỳ chọn. */
export function ComposerActions({
  conversationId,
  disabled,
  isEditing,
  expanded,
  selfDestructTtl,
  onFiles,
  onSelfDestruct,
  onScheduleClick,
  onContactClick,
  onEmojiSelect,
  onToggleExpanded,
  onWebappClick,
  onAiClick,
  onPollClick,
  stickerBotConversation,
}: ComposerActionsProps) {
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  function handleMoreAction(fn: () => void) {
    setMoreOpen(false);
    fn();
  }

  return (
    <div className="flex items-center">
      {!isEditing && !isMobile && (
        <AttachmentButtons
          onFiles={onFiles}
          disabled={disabled}
          stickerMode={stickerBotConversation}
        />
      )}

      <MediaPickerTrigger
        conversationId={conversationId}
        disabled={disabled}
        emojiOnly={isEditing}
        onEmojiSelect={onEmojiSelect}
      />

      {!isEditing && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              title="Thêm tuỳ chọn"
              aria-label="Thêm tuỳ chọn"
              className="h-11 w-11 text-muted-foreground hover:text-primary md:h-8 md:w-8"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            showArrow={false}
            className="w-auto p-1.5"
          >
            <div className="flex min-w-[180px] flex-col gap-0.5">
              {isMobile && (
                <AttachmentButtons
                  variant="menu"
                  onFiles={onFiles}
                  disabled={disabled}
                  stickerMode={stickerBotConversation}
                />
              )}
              {onWebappClick && (
                <ActionItem
                  icon={<PanelTopOpen className="h-[18px] w-[18px]" />}
                  label="Mở WebApp"
                  onClick={() => handleMoreAction(onWebappClick)}
                />
              )}
              {onAiClick && (
                <ActionItem
                  icon={<Bot className="h-[18px] w-[18px]" />}
                  label="Hỏi AI"
                  onClick={() => handleMoreAction(onAiClick)}
                />
              )}
              {onPollClick && (
                <ActionItem
                  icon={<BarChart2 className="h-[18px] w-[18px]" />}
                  label="Bình chọn"
                  onClick={() => handleMoreAction(onPollClick)}
                />
              )}
              <ActionItem
                icon={<IdCard className="h-[18px] w-[18px]" />}
                label="Danh thiếp"
                onClick={() => handleMoreAction(onContactClick)}
              />
              <ActionItem
                icon={
                  <Type
                    className={cn("h-[18px] w-[18px]", expanded && "text-primary")}
                  />
                }
                label={expanded ? "Thu gọn" : "Mở rộng"}
                onClick={() => handleMoreAction(onToggleExpanded)}
                active={expanded}
              />
              <ActionItem
                icon={<CalendarClock className="h-[18px] w-[18px]" />}
                label="Hẹn giờ"
                onClick={() => handleMoreAction(onScheduleClick)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted md:min-h-0",
                        selfDestructTtl ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      <Clock className="h-[18px] w-[18px]" />
                      Tin nhắn tự huỷ
                    </button>
                  }
                />
                <DropdownMenuContent
                  side={isMobile ? "top" : "right"}
                  align="start"
                  className="min-w-[150px]"
                >
                  {SELF_DESTRUCT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.label}
                      onClick={() => handleMoreAction(() => onSelfDestruct(opt.seconds))}
                      className={cn(
                        "justify-between",
                        selfDestructTtl === opt.seconds && "text-warning",
                      )}
                    >
                      {opt.label}
                      {selfDestructTtl === opt.seconds && <Check className="h-3.5 w-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Dọn `useMessageComposer`**

Modify `src/features/chat/hooks/useMessageComposer.ts`:

1. Xoá dòng khai báo state (hiện ở dòng 42): `const [emojiOpen, setEmojiOpen] = useState(false);`
2. Xoá hàm `handleEmojiButtonClick`:
   ```ts
   function handleEmojiButtonClick() {
     setEmojiOpen((v) => !v);
   }
   ```
3. Trong `handleEmojiSelect`, xoá dòng `setEmojiOpen(false);` — chỉ còn:
   ```ts
   function handleEmojiSelect(emoji: string) {
     editorRef.current?.insertText(emoji);
   }
   ```
4. Trong object `return`, xoá 3 dòng: `emojiOpen,`, `setEmojiOpen,`, `handleEmojiButtonClick,`.

- [ ] **Step 5: Dọn `MessageInput`**

Modify `src/features/chat/components/messages/MessageInput.tsx`:

1. Trong destructure `useMessageComposer(...)` (dòng 66–90): xoá `emojiOpen,`, `setEmojiOpen,`, `handleEmojiButtonClick,`.
2. Trong JSX `<ComposerActions>` (dòng 205–226): xoá 3 dòng prop
   ```tsx
   emojiOpen={emojiOpen}
   onEmojiOpenChange={setEmojiOpen}
   onEmojiButtonClick={handleEmojiButtonClick}
   ```
   Giữ nguyên `onEmojiSelect={handleEmojiSelect}`.

- [ ] **Step 6: Chạy test + typecheck + lint**

Run: `npx vitest run src/features/chat/components/messages/ComposerActions.test.tsx && npm run typecheck && npm run lint`
Expected: PASS — 5 test; typecheck sạch (nếu còn báo `emojiOpen` là chưa xoá hết ở Step 4/5).

- [ ] **Step 7: Kiểm tra giới hạn dòng**

Run: `wc -l src/features/chat/components/messages/ComposerActions.tsx`
Expected: < 200 dòng.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/components/messages/ComposerActions.tsx \
        src/features/chat/components/messages/ComposerActions.test.tsx \
        src/features/chat/components/messages/MessageInput.tsx \
        src/features/chat/hooks/useMessageComposer.ts
git commit -m "refactor(chat): collapse emoji and sticker entry points into media picker"
```

---

## Task 10: Env mẫu + kiểm tra toàn cục

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Khai báo biến môi trường**

Modify `.env.example` — thêm vào khối "Server-side":

```bash
# ---------- Giphy (server-only — KHÔNG đặt NEXT_PUBLIC_) ----------
# Key cho picker GIF trong ô soạn tin. Lấy tại https://developers.giphy.com/dashboard/
# Thiếu key → /api/giphy trả 503 và tab GIF hiện "Tính năng GIF chưa được cấu hình".
GIPHY_API_KEY=
```

- [ ] **Step 2: Thêm key thật vào `.env.local`**

```bash
echo 'GIPHY_API_KEY=<key-lấy-từ-developers.giphy.com>' >> .env.local
```

Nếu chưa có key: bỏ qua bước này. Tính năng vẫn build và chạy được, tab GIF hiện empty-state.

- [ ] **Step 3: Chạy toàn bộ kiểm tra**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS toàn bộ. So sánh với danh sách test đỏ đã ghi ở Task 0 Step 2 — không được có test đỏ mới.

- [ ] **Step 4: Kiểm thử thủ công**

Run: `npm run dev`

Kiểm bằng tay theo checklist:
1. Desktop: bấm nút 😊 → popover mở neo vào nút, có 3 tab.
2. Tab Emoji → chọn emoji → chèn vào editor, popover đóng.
3. Tab GIF → thấy trending; gõ "mèo" → kết quả đổi sau ~350ms; cuộn xuống → tải thêm.
4. Chọn 1 GIF → ô hiện spinner, panel đóng khi gửi xong, bong bóng GIF chạy animation trong khung chat.
5. Tab Sticker → gửi sticker như cũ.
6. Đóng picker rồi mở lại → về đúng tab lần trước.
7. Thu cửa sổ < 768px → nút mở bottom sheet, cùng 3 tab.
8. Bấm sửa một tin nhắn → nút picker chỉ còn emoji, không có tab GIF/Sticker.
9. Trả lời một tin rồi gửi GIF → GIF gắn đúng quote trả lời.

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "docs: document GIPHY_API_KEY in env template"
```

---

## Self-Review

**Spec coverage:**

| Mục spec | Task |
|---|---|
| §3.1 luồng gửi GIF không đụng BE | Task 5 |
| §3.2 key sau route handler, không đụng rewrite | Task 2, 3, 10 |
| §3.3 Popover desktop + Drawer mobile | Task 8 |
| §4.1 `giphy-env.ts` / `route.ts` / `asset/route.ts` / rate-limit | Task 1, 2, 3 |
| §4.2 types / transport / keys / hooks | Task 4, 5 |
| §4.3 Trigger / Panel / GifPicker / use-picker-tab / attribution GIPHY | Task 6, 7, 8 |
| §4.4 dọn ComposerActions + useMessageComposer + MessageInput | Task 9 |
| §5 bốn trạng thái | Task 6 Step 1 (7 test) |
| §6 a11y (aria-label, label ẩn, role tab) | Task 6, 7, 8 |
| §7 bảo mật (SSRF, rating=g, content-type, size, rate-limit) | Task 1, 2, 3 |
| §8 test | Task 1–7, 9 |
| §9 env | Task 10 |

**Lệch có chủ đích so với spec (đã ghi lý do tại chỗ):**
- `giphyKeys.list(q)` thay cho `trending()/search(q)` — Task 4.
- Thêm prop `emojiOnly` cho picker: spec §4.4 không nói tới trường hợp đang **sửa tin**, mà bản cũ vẫn cho chèn emoji khi sửa. Không có `emojiOnly` thì tính năng này bị mất — Task 7, 8, 9.
- `useSendGif` dùng `optimisticAttachment` (spec không nêu) để bong bóng hiện ngay — Task 5.

**Type consistency:** `GiphyItem` giữ nguyên 5 field `{ id, title, previewUrl, previewWidth, previewHeight }` xuyên suốt route (Task 2) → schema (Task 4) → hook (Task 5) → `GifPicker` (Task 6) → `Panel`/`Trigger` (Task 7, 8). `GiphyError.code` dùng thống nhất ở Task 4, 5, 6. `PickerTab` khớp giữa `use-picker-tab.ts` và `MediaPickerPanel.tsx`.
