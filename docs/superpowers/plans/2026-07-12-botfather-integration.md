# BotFather Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép owner (user đang chat) tạo/sửa/xoá bot và quản lý token (issue/rotate/revoke) ngay trong FE `vibe-chat-fe`, gọi thẳng Management API đã có sẵn của `bot-service`.

**Architecture:** `bot-service` là backend REST thứ 3 (song song `vibe-chat` + `auth-service`), dùng chung Keycloak JWT owner. FE mở rộng `apiClient` dùng chung (không viết client riêng) để trỏ các path `/api/v1/bot*` sang `bot-service`. Thêm 1 tab Settings mới ("Bot của tôi") gồm list bot + quản lý token, dùng RHF+Zod cho form, TanStack Query cho server state.

**Tech Stack:** NestJS 11 (bot-service, Prisma), Next.js 16 App Router + React 19 + TypeScript strict, TanStack Query v5, React Hook Form + Zod, Basuicn UI, Vitest + Testing Library (unit), Playwright (e2e critical path).

**Spec:** `docs/superpowers/specs/2026-07-12-botfather-integration-design.md`

## Global Constraints

- Bot-service: theo `.claude/CLAUDE.md` + `.claude/rules/*` của `bot-service` — Controller→Service→Repository→Schema, DTO validate mọi input, KHÔNG return secret/hash qua API, error qua `{code, message}`.
- FE: theo `.claude/CLAUDE.md` + `.claude/rules/*` của `vibe-chat-fe` — không `any`, component < 200 dòng / hook < 80 dòng / file < 300 dòng, đủ 4 trạng thái (loading/error/empty/data) cho mọi UI đọc API, API transport chỉ ở `src/services/*.api.ts`, query key ở `src/services/keys.ts`, mọi lib bên thứ 3 wrap trong `src/lib/`, `'use client'` chỉ ở component lá.
- KHÔNG log/hiện token plaintext ngoài phạm vi màn hình "reveal 1 lần".
- Test FE mock transport qua `vi.mock('@/services/<x>.api')` — KHÔNG dùng MSW (chưa có precedent thật trong repo dù có trong `package.json`).
- Playwright chạy trên backend thật (không mock network) — cần `bot-service` (port từ `NEXT_PUBLIC_BOT_URL`/proxy), `vibe-chat`, `auth-service` đang chạy.

---

## Task 1: Backend — `GET /api/v1/bots/:botId/tokens`

**Files:**
- Modify: `bot-service/src/modules/bot-tokens/bot-tokens.repository.ts`
- Create: `bot-service/src/modules/bot-tokens/dto/response-bot-token-list-item.dto.ts`
- Modify: `bot-service/src/modules/bot-tokens/bot-tokens.service.ts`
- Modify: `bot-service/src/modules/bots/bot-tokens.controller.ts`
- Modify: `bot-service/src/modules/bot-tokens/bot-tokens.service.spec.ts`

**Interfaces:**
- Produces: `BotTokensRepository.findAllByBotId(botId: string, tx?: Prisma.TransactionClient): Promise<BotToken[]>`; `BotTokensService.listTokens(botId: string): Promise<ResponseBotTokenListItemDto[]>`; `ResponseBotTokenListItemDto { id, prefix, scopes: string[], expiresAt: string | null, lastUsedAt: string | null, revokedAt: string | null, createdAt: string }`; route `GET /api/v1/bots/:botId/tokens` (owner JWT, 200 → `ResponseBotTokenListItemDto[]`, 404 `BOT_NOT_FOUND` nếu bot không thuộc owner).

- [ ] **Step 1: Viết test thất bại cho `BotTokensService.listTokens`**

Mở `bot-service/src/modules/bot-tokens/bot-tokens.service.spec.ts`. Sửa khối khai báo mock đầu file (dòng 43-68) — thêm `findAllByBotId` vào mock repo:

```ts
describe('BotTokensService', () => {
  const create = jest.fn();
  const findByPrefix = jest.fn();
  const findByIdForBot = jest.fn();
  const findAllByBotId = jest.fn();
  const revoke = jest.fn();
  const revokeAllActiveForBot = jest.fn();
  const touchLastUsed = jest.fn();
  const record = jest.fn();
  const transaction = jest.fn((fn: (tx: undefined) => unknown) =>
    fn(undefined),
  );

  const repo = {
    create,
    findByPrefix,
    findByIdForBot,
    findAllByBotId,
    revoke,
    revokeAllActiveForBot,
    touchLastUsed,
  } as unknown as BotTokensRepository;
```

Thêm khối test mới ngay TRƯỚC dòng cuối cùng `});` (đóng `describe('BotTokensService')`, hiện ở cuối file):

```ts
  describe('listTokens', () => {
    it('nên trả danh sách token đã map, KHÔNG có tokenHash', async () => {
      // Arrange
      findAllByBotId.mockResolvedValue([
        buildToken({
          id: 'token-1',
          prefix: 'abc123',
          scopes: ['messages:send'],
          expiresAt: new Date('2026-12-01T00:00:00.000Z'),
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ]);

      // Act
      const result = await service.listTokens('bot-1');

      // Assert
      expect(findAllByBotId).toHaveBeenCalledWith('bot-1');
      expect(result).toEqual([
        {
          id: 'token-1',
          prefix: 'abc123',
          scopes: ['messages:send'],
          expiresAt: '2026-12-01T00:00:00.000Z',
          lastUsedAt: null,
          revokedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
      expect(result[0]).not.toHaveProperty('tokenHash');
    });

    it('nên trả mảng rỗng khi bot chưa có token nào', async () => {
      // Arrange
      findAllByBotId.mockResolvedValue([]);

      // Act
      const result = await service.listTokens('bot-1');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd bot-service && npx jest bot-tokens.service.spec.ts -t listTokens`
Expected: FAIL — `service.listTokens is not a function`.

- [ ] **Step 3: Thêm `findAllByBotId` vào repository**

Thêm vào cuối `bot-service/src/modules/bot-tokens/bot-tokens.repository.ts` (trước dấu `}` đóng class):

```ts
  findAllByBotId(
    botId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BotToken[]> {
    const client = tx ?? this.prisma;
    return client.botToken.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
    });
  }
```

- [ ] **Step 4: Tạo DTO response**

Tạo file `bot-service/src/modules/bot-tokens/dto/response-bot-token-list-item.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * KHÔNG bao giờ chứa `tokenHash`/plaintext — chỉ metadata để owner quản lý token.
 */
export class ResponseBotTokenListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prefix!: string;

  @ApiProperty({ type: [String] })
  scopes!: string[];

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastUsedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  revokedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
```

- [ ] **Step 5: Thêm `listTokens` vào service**

Trong `bot-service/src/modules/bot-tokens/bot-tokens.service.ts`, thêm import:

```ts
import { ResponseBotTokenListItemDto } from './dto/response-bot-token-list-item.dto';
```

Thêm method (đặt sau `revokeToken`, trước `revokeAllForBot`):

```ts
  async listTokens(botId: string): Promise<ResponseBotTokenListItemDto[]> {
    const tokens = await this.repo.findAllByBotId(botId);
    return tokens.map((t) => ({
      id: t.id,
      prefix: t.prefix,
      scopes: t.scopes,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      revokedAt: t.revokedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }));
  }
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `cd bot-service && npx jest bot-tokens.service.spec.ts -t listTokens`
Expected: PASS (2 test).

- [ ] **Step 7: Thêm route GET vào controller**

Trong `bot-service/src/modules/bots/bot-tokens.controller.ts`, sửa import `@nestjs/common` (thêm `Get`):

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
```

Thêm import DTO:

```ts
import { ResponseBotTokenListItemDto } from '../bot-tokens/dto/response-bot-token-list-item.dto';
```

Thêm method (đặt ngay sau constructor, trước method `create`):

```ts
  @Get()
  @ApiOperation({ summary: 'Danh sách token của bot (không lộ secret)' })
  @ApiResponse({ status: 200, type: [ResponseBotTokenListItemDto] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bot' })
  async list(
    @CurrentOwner() owner: AuthenticatedOwner,
    @Param('botId', ParseUUIDPipe) botId: string,
  ): Promise<ResponseBotTokenListItemDto[]> {
    await this.bots.findOwnedActiveBotOrFail(owner.ownerId, botId);
    return this.botTokens.listTokens(botId);
  }
```

- [ ] **Step 8: Build + lint + full test suite bot-tokens**

Run: `cd bot-service && npm run lint && npm run build && npx jest bot-tokens`
Expected: lint 0 lỗi, build thành công, toàn bộ test trong `bot-tokens.service.spec.ts` PASS.

- [ ] **Step 9: Commit**

```bash
cd bot-service
git add src/modules/bot-tokens/bot-tokens.repository.ts \
  src/modules/bot-tokens/dto/response-bot-token-list-item.dto.ts \
  src/modules/bot-tokens/bot-tokens.service.ts \
  src/modules/bots/bot-tokens.controller.ts \
  src/modules/bot-tokens/bot-tokens.service.spec.ts
git commit -m "feat(bot-tokens): thêm GET /bots/:botId/tokens — list token không lộ secret"
```

---

## Task 2: FE hạ tầng — kết nối `bot-service` qua `apiClient`

**Files:**
- Modify: `vibe-chat-fe/src/config/env.ts`
- Modify: `vibe-chat-fe/next.config.ts`
- Modify: `vibe-chat-fe/src/lib/api/client.ts`
- Create: `vibe-chat-fe/src/lib/api/client.test.ts`
- Modify: `vibe-chat-fe/.env.example` (nếu tồn tại — thêm `NEXT_PUBLIC_BOT_URL`, `BOT_URL`)

**Interfaces:**
- Produces: `env.NEXT_PUBLIC_BOT_URL: string`; path bất kỳ bắt đầu `/api/v1/bot` (bao gồm `/api/v1/bots`) được route sang bot-service khi gọi qua `apiClient`.

- [ ] **Step 1: Viết test thất bại cho `resolveApiUrl`**

Tạo file `vibe-chat-fe/src/lib/api/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://auth.test',
    NEXT_PUBLIC_VIBE_URL: 'http://vibe.test',
    NEXT_PUBLIC_BOT_URL: 'http://bot.test',
    NEXT_PUBLIC_WS_URL: 'http://vibe.test',
    NEXT_PUBLIC_CALL_WS_URL: 'http://vibe.test',
    NEXT_PUBLIC_USE_PROXY: false,
  },
}));

describe('resolveApiUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('nên route /api/v1/bots sang NEXT_PUBLIC_BOT_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/bots')).toBe('http://bot.test/api/v1/bots');
  });

  it('nên route /api/v1/bot/messages sang NEXT_PUBLIC_BOT_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/bot/messages')).toBe(
      'http://bot.test/api/v1/bot/messages',
    );
  });

  it('nên route /api/v1/auth/login sang NEXT_PUBLIC_AUTH_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/auth/login')).toBe(
      'http://auth.test/api/v1/auth/login',
    );
  });

  it('nên route path khác sang NEXT_PUBLIC_VIBE_URL', async () => {
    const { resolveApiUrl } = await import('./client');
    expect(resolveApiUrl('/api/v1/conversations')).toBe(
      'http://vibe.test/api/v1/conversations',
    );
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/lib/api/client.test.ts`
Expected: FAIL — 2 test đầu fail vì `resolveApiUrl('/api/v1/bots')` hiện trả về `http://vibe.test/api/v1/bots` (chưa có nhánh bot), và test import báo lỗi field `NEXT_PUBLIC_BOT_URL` không tồn tại trên type `env` (do `env.ts` chưa khai báo).

- [ ] **Step 3: Thêm `NEXT_PUBLIC_BOT_URL` vào `env.ts`**

Trong `vibe-chat-fe/src/config/env.ts`, thêm vào `schema` (ngay sau `NEXT_PUBLIC_TASK_WS_URL`):

```ts
  NEXT_PUBLIC_TASK_WS_URL: z.string().url(),
  // bot-service (Management API "BotFather" — tạo/sửa/xoá bot, issue/rotate/revoke token).
  NEXT_PUBLIC_BOT_URL: z.string().url(),
```

Và thêm vào object `parsed` (ngay sau `NEXT_PUBLIC_TASK_WS_URL: process.env.NEXT_PUBLIC_TASK_WS_URL,`):

```ts
  NEXT_PUBLIC_TASK_WS_URL: process.env.NEXT_PUBLIC_TASK_WS_URL,
  NEXT_PUBLIC_BOT_URL: process.env.NEXT_PUBLIC_BOT_URL,
```

- [ ] **Step 4: Thêm rewrite rule vào `next.config.ts`**

Trong `vibe-chat-fe/next.config.ts`, thêm khai báo (ngay sau dòng khai báo `TASK_URL`):

```ts
const TASK_URL = process.env.TASK_URL || process.env.NEXT_PUBLIC_TASK_URL;
// bot-service (Management API riêng, cùng envelope {success,data,error} với auth-service).
const BOT_URL = process.env.BOT_URL || process.env.NEXT_PUBLIC_BOT_URL;
```

Sửa khối `rewrites()` — thêm rule bot TRƯỚC rule catch-all `/api/v1/:path*`, đặt SAU khối `if (TASK_URL) { rules.unshift(...) }` đã có (để `/api/v1/bots`/`bot` không rơi vào catch-all VIBE_URL):

```ts
    async rewrites() {
      const rules = [
        { source: '/api/v1/auth/:path*', destination: `${AUTH_URL}/api/v1/auth/:path*` },
        { source: '/api/v1/:path*', destination: `${VIBE_URL}/api/v1/:path*` },
        { source: '/api/docs/:path*', destination: `${VIBE_URL}/api/docs/:path*` },
      ];
      if (TASK_URL) {
        rules.unshift({ source: '/task-proxy/:path*', destination: `${TASK_URL}/:path*` });
      }
      // bot-service: prefix riêng /api/v1/bot(s) — phải đứng trước catch-all /api/v1/:path*.
      if (BOT_URL) {
        rules.unshift(
          { source: '/api/v1/bots/:path*', destination: `${BOT_URL}/api/v1/bots/:path*` },
          { source: '/api/v1/bot/:path*', destination: `${BOT_URL}/api/v1/bot/:path*` },
        );
      }
      return rules;
    },
```

- [ ] **Step 5: Sửa `resolveBase()` trong `client.ts`**

Trong `vibe-chat-fe/src/lib/api/client.ts`, thay:

```ts
function resolveBase(path: string): string {
  // USE_PROXY=true → same-origin, để Next rewrites proxy. USE_PROXY=false → gọi thẳng BE.
  if (env.NEXT_PUBLIC_USE_PROXY) return '';
  return path.startsWith('/api/v1/auth/') ? env.NEXT_PUBLIC_AUTH_URL : env.NEXT_PUBLIC_VIBE_URL;
}
```

thành:

```ts
function resolveBase(path: string): string {
  // USE_PROXY=true → same-origin, để Next rewrites proxy. USE_PROXY=false → gọi thẳng BE.
  if (env.NEXT_PUBLIC_USE_PROXY) return '';
  if (path.startsWith('/api/v1/auth/')) return env.NEXT_PUBLIC_AUTH_URL;
  // bot-service: cả /api/v1/bot/... (self, messages) lẫn /api/v1/bots/... (management).
  if (path.startsWith('/api/v1/bot')) return env.NEXT_PUBLIC_BOT_URL;
  return env.NEXT_PUBLIC_VIBE_URL;
}
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/lib/api/client.test.ts`
Expected: PASS (4 test).

- [ ] **Step 7: Cập nhật `.env.example` (nếu file tồn tại)**

Run: `test -f vibe-chat-fe/.env.example && grep -n "NEXT_PUBLIC_TASK_URL" vibe-chat-fe/.env.example`

Nếu có output, thêm 2 dòng ngay sau dòng `NEXT_PUBLIC_TASK_URL=...` trong `.env.example`:

```
BOT_URL=http://localhost:3010
NEXT_PUBLIC_BOT_URL=http://localhost:3010
```

- [ ] **Step 8: Typecheck + lint toàn dự án**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 9: Commit**

```bash
cd vibe-chat-fe
git add src/config/env.ts next.config.ts src/lib/api/client.ts src/lib/api/client.test.ts .env.example
git commit -m "feat(bots): mở rộng apiClient route /api/v1/bot* sang bot-service"
```

---

## Task 3: FE — `schemas.ts` + `types.ts`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/schemas.ts`
- Create: `vibe-chat-fe/src/features/bots/schemas.test.ts`
- Create: `vibe-chat-fe/src/features/bots/types.ts`

**Interfaces:**
- Produces: `BOT_TOKEN_SCOPES`, `BotTokenScope`, `createBotSchema`/`CreateBotInput`, `updateBotSchema`/`UpdateBotInput`, `issueTokenSchema`/`IssueTokenInput` (từ `schemas.ts`); `Bot`, `BotListPage`, `BotCreated`, `BotTokenIssued`, `BotTokenListItem` (từ `types.ts`).

- [ ] **Step 1: Viết test thất bại cho schema**

Tạo `vibe-chat-fe/src/features/bots/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createBotSchema, issueTokenSchema } from './schemas';

describe('createBotSchema', () => {
  it('nên pass với username hợp lệ chứa "bot"', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(true);
  });

  it('nên reject username không chứa "bot"', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_service',
      displayName: 'Weather',
    });
    expect(result.success).toBe(false);
  });

  it('nên reject username bắt đầu bằng số', () => {
    const result = createBotSchema.safeParse({
      username: '1weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(false);
  });

  it('nên reject displayName rỗng', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: '',
    });
    expect(result.success).toBe(false);
  });

  it('nên cho description optional', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(true);
  });
});

describe('issueTokenSchema', () => {
  it('nên pass khi không truyền scopes/expiresAt', () => {
    expect(issueTokenSchema.safeParse({}).success).toBe(true);
  });

  it('nên reject scope không hợp lệ', () => {
    const result = issueTokenSchema.safeParse({ scopes: ['not:a:scope'] });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/schemas.test.ts`
Expected: FAIL — không tìm thấy module `./schemas`.

- [ ] **Step 3: Tạo `schemas.ts`**

Tạo `vibe-chat-fe/src/features/bots/schemas.ts`:

```ts
import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
const USERNAME_CONTAINS_BOT = /bot/i;

export const createBotSchema = z.object({
  username: z
    .string()
    .regex(
      USERNAME_PATTERN,
      'Username phải bắt đầu bằng chữ cái, 3-32 ký tự, chỉ gồm chữ/số/underscore',
    )
    .regex(USERNAME_CONTAINS_BOT, 'Username phải chứa "bot" để phân biệt với tên user thường'),
  displayName: z.string().min(1, 'Không được để trống').max(64, 'Tối đa 64 ký tự'),
  description: z.string().max(500, 'Tối đa 500 ký tự').optional(),
});
export type CreateBotInput = z.infer<typeof createBotSchema>;

export const updateBotSchema = createBotSchema.partial();
export type UpdateBotInput = z.infer<typeof updateBotSchema>;

export const BOT_TOKEN_SCOPES = [
  'messages:send',
  'media:send',
  'webhook:manage',
  'commands:manage',
] as const;
export type BotTokenScope = (typeof BOT_TOKEN_SCOPES)[number];

export const BOT_TOKEN_SCOPE_LABELS: Record<BotTokenScope, string> = {
  'messages:send': 'Gửi tin nhắn',
  'media:send': 'Gửi media',
  'webhook:manage': 'Quản lý webhook',
  'commands:manage': 'Quản lý command',
};

export const issueTokenSchema = z.object({
  scopes: z.array(z.enum(BOT_TOKEN_SCOPES)).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/schemas.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Tạo `types.ts`**

Tạo `vibe-chat-fe/src/features/bots/types.ts`:

```ts
import type { BotTokenScope } from './schemas';

export interface Bot {
  id: string;
  username: string;
  displayName: string;
  description?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  provisioned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotListPage {
  items: Bot[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Trả về đúng 1 lần khi tạo/issue/rotate — plaintext KHÔNG lưu lại được. */
export interface BotTokenIssued {
  id: string;
  token: string;
  prefix: string;
  scopes: BotTokenScope[];
  expiresAt?: string;
  createdAt: string;
}

export interface BotCreated {
  bot: Bot;
  token: BotTokenIssued;
}

/** Metadata token — KHÔNG chứa plaintext/hash. */
export interface BotTokenListItem {
  id: string;
  prefix: string;
  scopes: BotTokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 6: Typecheck**

Run: `cd vibe-chat-fe && npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 7: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/schemas.ts src/features/bots/schemas.test.ts src/features/bots/types.ts
git commit -m "feat(bots): thêm schemas + types cho feature quản lý bot"
```

---

## Task 4: FE — `bots.api.ts` + `bot-tokens.api.ts` + `keys.ts`

**Files:**
- Modify: `vibe-chat-fe/src/services/keys.ts`
- Create: `vibe-chat-fe/src/services/bots.api.ts`
- Create: `vibe-chat-fe/src/services/bot-tokens.api.ts`

**Interfaces:**
- Consumes: `Bot`, `BotListPage`, `BotCreated`, `BotTokenIssued`, `BotTokenListItem` (Task 3); `CreateBotInput`, `UpdateBotInput`, `IssueTokenInput` (Task 3).
- Produces: `botKeys.all`, `botKeys.list(page, limit)`; `botTokenKeys.all`, `botTokenKeys.list(botId)`; `botsApi.{list,create,update,remove}`; `botTokensApi.{list,issue,rotate,revoke}`.

- [ ] **Step 1: Thêm key factory vào `keys.ts`**

Thêm vào cuối `vibe-chat-fe/src/services/keys.ts`:

```ts
export const botKeys = {
  all: ['bots'] as const,
  list: (page: number, limit: number) => [...botKeys.all, 'list', page, limit] as const,
} as const;

export const botTokenKeys = {
  all: ['bot-tokens'] as const,
  list: (botId: string) => [...botTokenKeys.all, 'list', botId] as const,
} as const;
```

- [ ] **Step 2: Tạo `bots.api.ts`**

Tạo `vibe-chat-fe/src/services/bots.api.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { Bot, BotCreated, BotListPage } from '@/features/bots/types';
import type { CreateBotInput, UpdateBotInput } from '@/features/bots/schemas';

/**
 * REST endpoints Management API bot-service (BotFather). Pure transport.
 * Hook TanStack ở features/bots/hooks/*.
 */
export const botsApi = {
  list: async (params: { page: number; limit: number }): Promise<BotListPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Bot[]>('GET', '/api/v1/bots', {
      query: { page: params.page, limit: params.limit },
    });
    const m = meta as
      | { page?: number; limit?: number; total?: number; totalPages?: number }
      | undefined;
    return {
      items: data,
      page: m?.page ?? params.page,
      limit: m?.limit ?? params.limit,
      total: m?.total ?? data.length,
      totalPages: m?.totalPages ?? 1,
    };
  },

  create: (input: CreateBotInput) =>
    apiClient.post<BotCreated>('/api/v1/bots', { body: input }),

  update: (botId: string, input: UpdateBotInput) =>
    apiClient.patch<Bot>(`/api/v1/bots/${encodeURIComponent(botId)}`, { body: input }),

  remove: (botId: string) =>
    apiClient.delete<void>(`/api/v1/bots/${encodeURIComponent(botId)}`),
} as const;
```

- [ ] **Step 3: Tạo `bot-tokens.api.ts`**

Tạo `vibe-chat-fe/src/services/bot-tokens.api.ts`:

```ts
import { apiClient } from '@/lib/api/client';
import type { BotTokenIssued, BotTokenListItem } from '@/features/bots/types';
import type { IssueTokenInput } from '@/features/bots/schemas';

/**
 * REST endpoints token của 1 bot (nested resource `/bots/:botId/tokens`).
 * Hook TanStack ở features/bots/hooks/*.
 */
export const botTokensApi = {
  list: (botId: string) =>
    apiClient.get<BotTokenListItem[]>(`/api/v1/bots/${encodeURIComponent(botId)}/tokens`),

  issue: (botId: string, input: IssueTokenInput) =>
    apiClient.post<BotTokenIssued>(`/api/v1/bots/${encodeURIComponent(botId)}/tokens`, {
      body: input,
    }),

  rotate: (botId: string, tokenId: string, input: IssueTokenInput) =>
    apiClient.post<BotTokenIssued>(
      `/api/v1/bots/${encodeURIComponent(botId)}/tokens/${encodeURIComponent(tokenId)}/rotate`,
      { body: input },
    ),

  revoke: (botId: string, tokenId: string) =>
    apiClient.delete<void>(
      `/api/v1/bots/${encodeURIComponent(botId)}/tokens/${encodeURIComponent(tokenId)}`,
    ),
} as const;
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi. (Không có test riêng cho `*.api.ts` — đúng convention hiện có, transport được test gián tiếp qua hook ở Task 5/6.)

- [ ] **Step 5: Commit**

```bash
cd vibe-chat-fe
git add src/services/keys.ts src/services/bots.api.ts src/services/bot-tokens.api.ts
git commit -m "feat(bots): thêm bots.api.ts + bot-tokens.api.ts + query keys"
```

---

## Task 5: FE hooks — Bot (query + mutation)

**Files:**
- Create: `vibe-chat-fe/src/features/bots/hooks/use-query.ts`
- Create: `vibe-chat-fe/src/features/bots/hooks/use-query.test.ts`
- Create: `vibe-chat-fe/src/features/bots/hooks/use-mutations.ts`
- Create: `vibe-chat-fe/src/features/bots/hooks/use-mutations.test.ts`

**Interfaces:**
- Consumes: `botsApi` (Task 4), `botKeys` (Task 4).
- Produces: `useBots(params: { page: number; limit: number })`; `useCreateBot()`, `useUpdateBot(botId: string)`, `useDeleteBot()` (mutation hooks TanStack).

- [ ] **Step 1: Viết test thất bại cho `useBots`**

Tạo `vibe-chat-fe/src/features/bots/hooks/use-query.test.ts`:

```ts
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBots } from './use-query';
import type { BotListPage } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockList = vi.mocked(botsApi.list);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

const PAGE: BotListPage = {
  items: [
    {
      id: 'bot-1',
      username: 'weather_bot',
      displayName: 'Weather Bot',
      status: 'ACTIVE',
      provisioned: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

describe('useBots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gọi botsApi.list với đúng tham số và trả data', async () => {
    mockList.mockResolvedValue(PAGE);
    const { result } = renderHook(() => useBots({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.current.data).toEqual(PAGE);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-query.test.ts`
Expected: FAIL — không tìm thấy module `./use-query`.

- [ ] **Step 3: Tạo `use-query.ts`**

Tạo `vibe-chat-fe/src/features/bots/hooks/use-query.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys } from '@/services/keys';

/** Danh sách bot của owner hiện tại (trang đơn giản, không infinite-scroll). */
export function useBots(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: botKeys.list(params.page, params.limit),
    queryFn: () => botsApi.list(params),
  });
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-query.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Viết test thất bại cho mutation hooks**

Tạo `vibe-chat-fe/src/features/bots/hooks/use-mutations.test.ts`:

```ts
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateBot, useUpdateBot, useDeleteBot } from './use-mutations';
import type { Bot, BotCreated } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockCreate = vi.mocked(botsApi.create);
const mockUpdate = vi.mocked(botsApi.update);
const mockRemove = vi.mocked(botsApi.remove);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const CREATED: BotCreated = {
  bot: BOT,
  token: {
    id: 'token-1',
    token: 'bot-1:secret',
    prefix: 'secret',
    scopes: ['messages:send'],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('bots mutation hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useCreateBot gọi botsApi.create và invalidate botKeys.all khi thành công', async () => {
    mockCreate.mockResolvedValue(CREATED);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreateBot(), { wrapper: Wrapper });

    result.current.mutate({ username: 'weather_bot', displayName: 'Weather Bot' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bots'] });
  });

  it('useUpdateBot gọi botsApi.update với đúng botId', async () => {
    mockUpdate.mockResolvedValue(BOT);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateBot('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ displayName: 'New Name' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith('bot-1', { displayName: 'New Name' });
  });

  it('useDeleteBot gọi botsApi.remove với botId', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteBot(), { wrapper: Wrapper });

    result.current.mutate('bot-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemove).toHaveBeenCalledWith('bot-1');
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-mutations.test.ts`
Expected: FAIL — không tìm thấy module `./use-mutations`.

- [ ] **Step 7: Tạo `use-mutations.ts`**

Tạo `vibe-chat-fe/src/features/bots/hooks/use-mutations.ts`:

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys } from '@/services/keys';
import type { CreateBotInput, UpdateBotInput } from '../schemas';

/** Tạo bot mới — response kèm token plaintext (chỉ hiện 1 lần). */
export function useCreateBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBotInput) => botsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Sửa displayName/description của 1 bot. */
export function useUpdateBot(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBotInput) => botsApi.update(botId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Xoá (soft-delete) bot — BE tự thu hồi toàn bộ token. */
export function useDeleteBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) => botsApi.remove(botId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}
```

- [ ] **Step 8: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-mutations.test.ts`
Expected: PASS (3 test).

- [ ] **Step 9: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 10: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/hooks/use-query.ts src/features/bots/hooks/use-query.test.ts \
  src/features/bots/hooks/use-mutations.ts src/features/bots/hooks/use-mutations.test.ts
git commit -m "feat(bots): thêm hook useBots/useCreateBot/useUpdateBot/useDeleteBot"
```

---

## Task 6: FE hooks — Token (query + mutation)

**Files:**
- Modify: `vibe-chat-fe/src/features/bots/hooks/use-query.ts`
- Modify: `vibe-chat-fe/src/features/bots/hooks/use-query.test.ts`
- Modify: `vibe-chat-fe/src/features/bots/hooks/use-mutations.ts`
- Modify: `vibe-chat-fe/src/features/bots/hooks/use-mutations.test.ts`

**Interfaces:**
- Consumes: `botTokensApi` (Task 4), `botTokenKeys` (Task 4).
- Produces: `useBotTokens(botId: string)`; `useIssueToken(botId: string)`, `useRotateToken(botId: string)`, `useRevokeToken(botId: string)`.

- [ ] **Step 1: Thêm test thất bại cho `useBotTokens` vào `use-query.test.ts`**

Thêm vào cuối `vibe-chat-fe/src/features/bots/hooks/use-query.test.ts` (sau `describe('useBots', ...)`), và thêm mock cho `bot-tokens.api` ở đầu file cạnh mock `bots.api`:

```ts
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn() },
}));
```

Import thêm ở đầu file:

```ts
import { useBots, useBotTokens } from './use-query';
import { botTokensApi } from '@/services/bot-tokens.api';
import type { BotTokenListItem } from '../types';
```

Thêm block test mới ở cuối file:

```ts
describe('useBotTokens', () => {
  const mockTokenList = vi.mocked(botTokensApi.list);
  beforeEach(() => vi.clearAllMocks());

  it('gọi botTokensApi.list với đúng botId', async () => {
    const tokens: BotTokenListItem[] = [
      {
        id: 'token-1',
        prefix: 'abc123',
        scopes: ['messages:send'],
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    mockTokenList.mockResolvedValue(tokens);
    const { result } = renderHook(() => useBotTokens('bot-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTokenList).toHaveBeenCalledWith('bot-1');
    expect(result.current.data).toEqual(tokens);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-query.test.ts`
Expected: FAIL — `useBotTokens` không tồn tại trong `./use-query`.

- [ ] **Step 3: Thêm `useBotTokens` vào `use-query.ts`**

Thêm vào cuối `vibe-chat-fe/src/features/bots/hooks/use-query.ts`:

```ts
import { botTokensApi } from '@/services/bot-tokens.api';
import { botTokenKeys } from '@/services/keys';
```

(gộp vào import block đầu file, cùng với import `botsApi`/`botKeys` đã có)

```ts
/** Danh sách token (metadata, không plaintext) của 1 bot. */
export function useBotTokens(botId: string) {
  return useQuery({
    queryKey: botTokenKeys.list(botId),
    queryFn: () => botTokensApi.list(botId),
    enabled: Boolean(botId),
  });
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-query.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Thêm test thất bại cho token mutation hooks vào `use-mutations.test.ts`**

Thêm mock ở đầu file (cạnh mock `bots.api`):

```ts
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));
```

Import thêm:

```ts
import {
  useCreateBot,
  useUpdateBot,
  useDeleteBot,
  useIssueToken,
  useRotateToken,
  useRevokeToken,
} from './use-mutations';
import { botTokensApi } from '@/services/bot-tokens.api';
import type { BotTokenIssued } from '../types';
```

Thêm block test cuối file:

```ts
const ISSUED: BotTokenIssued = {
  id: 'token-2',
  token: 'bot-1:secret2',
  prefix: 'secret2',
  scopes: ['messages:send'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('token mutation hooks', () => {
  const mockIssue = vi.mocked(botTokensApi.issue);
  const mockRotate = vi.mocked(botTokensApi.rotate);
  const mockRevoke = vi.mocked(botTokensApi.revoke);
  beforeEach(() => vi.clearAllMocks());

  it('useIssueToken gọi botTokensApi.issue với đúng botId + input', async () => {
    mockIssue.mockResolvedValue(ISSUED);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIssueToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ scopes: ['messages:send'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIssue).toHaveBeenCalledWith('bot-1', { scopes: ['messages:send'] });
  });

  it('useRotateToken gọi botTokensApi.rotate với đúng tokenId', async () => {
    mockRotate.mockResolvedValue(ISSUED);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRotateToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ tokenId: 'token-1', input: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRotate).toHaveBeenCalledWith('bot-1', 'token-1', {});
  });

  it('useRevokeToken gọi botTokensApi.revoke với đúng tokenId', async () => {
    mockRevoke.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate('token-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRevoke).toHaveBeenCalledWith('bot-1', 'token-1');
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-mutations.test.ts`
Expected: FAIL — `useIssueToken`/`useRotateToken`/`useRevokeToken` không tồn tại.

- [ ] **Step 7: Thêm token mutation hooks vào `use-mutations.ts`**

Thêm import (gộp vào import block đầu file):

```ts
import { botTokensApi } from '@/services/bot-tokens.api';
import { botTokenKeys } from '@/services/keys';
import type { IssueTokenInput } from '../schemas';
```

Thêm vào cuối file:

```ts
/** Cấp token mới cho bot (ngoài token mặc định lúc tạo, hoặc khi cần thêm scope). */
export function useIssueToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTokenInput) => botTokensApi.issue(botId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token cũ + cấp token mới ngay lập tức (token cũ ngừng hoạt động). */
export function useRotateToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tokenId, input }: { tokenId: string; input: IssueTokenInput }) =>
      botTokensApi.rotate(botId, tokenId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token, không cấp lại. */
export function useRevokeToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => botTokensApi.revoke(botId, tokenId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}
```

- [ ] **Step 8: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/hooks/use-mutations.test.ts`
Expected: PASS (6 test tổng cộng).

- [ ] **Step 9: Typecheck + lint + chạy lại toàn bộ test hooks**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint && npm run test -- src/features/bots/hooks`
Expected: 0 lỗi, tất cả PASS.

- [ ] **Step 10: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/hooks/use-query.ts src/features/bots/hooks/use-query.test.ts \
  src/features/bots/hooks/use-mutations.ts src/features/bots/hooks/use-mutations.test.ts
git commit -m "feat(bots): thêm hook useBotTokens/useIssueToken/useRotateToken/useRevokeToken"
```

---

## Task 7: FE component — `TokenRevealCard`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/TokenRevealCard.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/TokenRevealCard.test.tsx`

**Interfaces:**
- Consumes: không phụ thuộc hook/api — component thuần, nhận `token: string`, `onDone: () => void` qua props.
- Produces: `TokenRevealCard({ token, onDone }: { token: string; onDone: () => void })` — dùng chung cho `CreateBotDialog` (Task 8) và `BotTokensPanel` (Task 11).

- [ ] **Step 1: Viết test thất bại**

Tạo `vibe-chat-fe/src/features/bots/components/TokenRevealCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenRevealCard } from './TokenRevealCard';

describe('TokenRevealCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('hiện đúng token plaintext', () => {
    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);
    expect(screen.getByText('bot-1:secret')).toBeInTheDocument();
  });

  it('nút Đóng bị disable khi chưa tick checkbox xác nhận', () => {
    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: /đóng/i })).toBeDisabled();
  });

  it('nút Đóng enable sau khi tick checkbox, và gọi onDone khi click', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<TokenRevealCard token="bot-1:secret" onDone={onDone} />);

    await user.click(screen.getByRole('checkbox'));
    const closeBtn = screen.getByRole('button', { name: /đóng/i });
    expect(closeBtn).toBeEnabled();

    await user.click(closeBtn);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('click Copy gọi clipboard.writeText với đúng token', async () => {
    const user = userEvent.setup();
    render(<TokenRevealCard token="bot-1:secret" onDone={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('bot-1:secret');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/TokenRevealCard.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Tạo `TokenRevealCard.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/TokenRevealCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Copy, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';

/**
 * Hiện token plaintext đúng 1 lần (create/issue/rotate) — bắt buộc tick xác
 * nhận đã lưu mới cho đóng, tránh mất token vì BE không lưu lại được (chỉ hash).
 */
export function TokenRevealCard({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(token);
    toast.success('Đã copy token');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/[0.08] p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-[12px] text-foreground">
          Token chỉ hiển thị <strong>duy nhất 1 lần</strong>. Hãy lưu lại ngay — bạn sẽ không
          xem lại được token này sau khi đóng.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
        <code className="flex-1 truncate text-[13px]">{token}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy token"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <Checkbox
        checked={saved}
        onCheckedChange={(v) => setSaved(Boolean(v))}
        label="Tôi đã lưu token này ở nơi an toàn"
      />

      <Button type="button" disabled={!saved} onClick={onDone}>
        Đóng
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/TokenRevealCard.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 6: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/TokenRevealCard.tsx src/features/bots/components/TokenRevealCard.test.tsx
git commit -m "feat(bots): thêm TokenRevealCard — hiện token plaintext 1 lần"
```

---

## Task 8: FE component — `CreateBotDialog`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/CreateBotDialog.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/CreateBotDialog.test.tsx`

**Interfaces:**
- Consumes: `useCreateBot()` (Task 5), `createBotSchema`/`CreateBotInput` (Task 3), `TokenRevealCard` (Task 7), `ApiError` (`@/lib/api/client`).
- Produces: `CreateBotDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void })`.

- [ ] **Step 1: Viết test thất bại**

Tạo `vibe-chat-fe/src/features/bots/components/CreateBotDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateBotDialog } from './CreateBotDialog';
import { ApiError } from '@/lib/api/client';

vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockCreate = vi.mocked(botsApi.create);

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CreateBotDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('CreateBotDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('hiện lỗi validate khi username không chứa "bot"', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_service');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText(/phải chứa "bot"/i)).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submit hợp lệ → gọi create → chuyển sang màn hiện token', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      bot: {
        id: 'bot-1',
        username: 'weather_bot',
        displayName: 'Weather Bot',
        status: 'ACTIVE',
        provisioned: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: {
        id: 'token-1',
        token: 'bot-1:secret',
        prefix: 'secret',
        scopes: ['messages:send'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText('bot-1:secret')).toBeInTheDocument();
  });

  it('lỗi 409 BOT_USERNAME_TAKEN → hiện lỗi ở field username', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(
      new ApiError(409, 'BOT_USERNAME_TAKEN', 'Username "weather_bot" đã được sử dụng'),
    );
    renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    expect(await screen.findByText(/đã được sử dụng/i)).toBeInTheDocument();
  });

  it('đóng dialog sau khi bấm Đóng ở màn hiện token → gọi onOpenChange(false)', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      bot: {
        id: 'bot-1',
        username: 'weather_bot',
        displayName: 'Weather Bot',
        status: 'ACTIVE',
        provisioned: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: {
        id: 'token-1',
        token: 'bot-1:secret',
        prefix: 'secret',
        scopes: ['messages:send'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText(/username/i), 'weather_bot');
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'Weather Bot');
    await user.click(screen.getByRole('button', { name: /tạo bot/i }));

    await screen.findByText('bot-1:secret');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /đóng/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/CreateBotDialog.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Tạo `CreateBotDialog.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/CreateBotDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useCreateBot } from '../hooks/use-mutations';
import { createBotSchema, type CreateBotInput } from '../schemas';
import { TokenRevealCard } from './TokenRevealCard';

export function CreateBotDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createBot = useCreateBot();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const form = useForm<CreateBotInput>({
    resolver: zodResolver(createBotSchema),
    defaultValues: { username: '', displayName: '', description: '' },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setIssuedToken(null);
    }
    onOpenChange(next);
  }

  function onSubmit(data: CreateBotInput) {
    createBot.mutate(data, {
      onSuccess: (created) => {
        setIssuedToken(created.token.token);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'BOT_USERNAME_TAKEN') {
          form.setError('username', { message: err.message });
          return;
        }
        toast.error(err instanceof ApiError ? err.message : 'Tạo bot thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {issuedToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Tạo bot thành công</DialogTitle>
              <DialogDescription>Lưu lại token bên dưới trước khi đóng.</DialogDescription>
            </DialogHeader>
            <TokenRevealCard token={issuedToken} onDone={() => handleOpenChange(false)} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Tạo bot mới</DialogTitle>
              <DialogDescription>
                Username phải chứa &quot;bot&quot; để phân biệt với tài khoản người dùng thường.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Username"
                      placeholder="weather_bot"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Tên hiển thị"
                      placeholder="Weather Bot"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Textarea
                      label="Mô tả (tuỳ chọn)"
                      placeholder="Báo thời tiết hằng ngày"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <Button type="submit" isLoading={createBot.isPending}>
                  Tạo bot
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/CreateBotDialog.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 6: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/CreateBotDialog.tsx src/features/bots/components/CreateBotDialog.test.tsx
git commit -m "feat(bots): thêm CreateBotDialog — form tạo bot + reveal token"
```

---

## Task 9: FE component — `EditBotDialog` + `DeleteBotAlertDialog`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/EditBotDialog.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/EditBotDialog.test.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/DeleteBotAlertDialog.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/DeleteBotAlertDialog.test.tsx`

**Interfaces:**
- Consumes: `useUpdateBot`/`useDeleteBot` (Task 5), `updateBotSchema`/`UpdateBotInput` (Task 3), `Bot` (Task 3).
- Produces: `EditBotDialog({ bot, open, onOpenChange }: { bot: Bot; open: boolean; onOpenChange: (open: boolean) => void })`; `DeleteBotAlertDialog({ bot, onDeleted }: { bot: Bot; onDeleted?: () => void })`.

- [ ] **Step 1: Viết test thất bại cho `EditBotDialog`**

Tạo `vibe-chat-fe/src/features/bots/components/EditBotDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditBotDialog } from './EditBotDialog';
import type { Bot } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { update: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockUpdate = vi.mocked(botsApi.update);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  description: 'Cũ',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <EditBotDialog bot={BOT} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe('EditBotDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefill đúng displayName/description hiện tại', () => {
    renderDialog();
    expect(screen.getByLabelText(/tên hiển thị/i)).toHaveValue('Weather Bot');
    expect(screen.getByLabelText(/mô tả/i)).toHaveValue('Cũ');
  });

  it('submit gọi botsApi.update với đúng botId + dữ liệu mới rồi đóng dialog', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({ ...BOT, displayName: 'New Name' });
    const { onOpenChange } = renderDialog();

    await user.clear(screen.getByLabelText(/tên hiển thị/i));
    await user.type(screen.getByLabelText(/tên hiển thị/i), 'New Name');
    await user.click(screen.getByRole('button', { name: /lưu/i }));

    expect(mockUpdate).toHaveBeenCalledWith('bot-1', expect.objectContaining({
      displayName: 'New Name',
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/EditBotDialog.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Tạo `EditBotDialog.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/EditBotDialog.tsx`:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useUpdateBot } from '../hooks/use-mutations';
import { updateBotSchema, type UpdateBotInput } from '../schemas';
import type { Bot } from '../types';

export function EditBotDialog({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateBot = useUpdateBot(bot.id);
  const form = useForm<UpdateBotInput>({
    resolver: zodResolver(updateBotSchema),
    defaultValues: {
      username: bot.username,
      displayName: bot.displayName,
      description: bot.description ?? '',
    },
  });

  function onSubmit(data: UpdateBotInput) {
    updateBot.mutate(data, {
      onSuccess: () => {
        toast.success('Đã cập nhật bot');
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Cập nhật thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa thông tin bot</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Input label="Tên hiển thị" error={fieldState.error?.message} {...field} />
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Textarea label="Mô tả" error={fieldState.error?.message} {...field} />
              )}
            />
            <Button type="submit" isLoading={updateBot.isPending}>
              Lưu
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/EditBotDialog.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Viết test thất bại cho `DeleteBotAlertDialog`**

Tạo `vibe-chat-fe/src/features/bots/components/DeleteBotAlertDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteBotAlertDialog } from './DeleteBotAlertDialog';
import type { Bot } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { remove: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockRemove = vi.mocked(botsApi.remove);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderDialog(onDeleted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteBotAlertDialog bot={BOT} onDeleted={onDeleted} />
    </QueryClientProvider>,
  );
  return { onDeleted };
}

describe('DeleteBotAlertDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện cảnh báo thu hồi toàn bộ token trước khi xoá', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /xoá bot/i }));
    expect(screen.getByText(/thu hồi toàn bộ token/i)).toBeInTheDocument();
  });

  it('xác nhận xoá → gọi botsApi.remove + onDeleted', async () => {
    const user = userEvent.setup();
    mockRemove.mockResolvedValue(undefined);
    const { onDeleted } = renderDialog();

    await user.click(screen.getByRole('button', { name: /xoá bot/i }));
    await user.click(screen.getByRole('button', { name: /^xoá$/i }));

    expect(mockRemove).toHaveBeenCalledWith('bot-1');
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/DeleteBotAlertDialog.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 7: Tạo `DeleteBotAlertDialog.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/DeleteBotAlertDialog.tsx`:

```tsx
'use client';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useDeleteBot } from '../hooks/use-mutations';
import type { Bot } from '../types';

export function DeleteBotAlertDialog({
  bot,
  onDeleted,
}: {
  bot: Bot;
  onDeleted?: () => void;
}) {
  const deleteBot = useDeleteBot();

  function handleDelete() {
    deleteBot.mutate(bot.id, {
      onSuccess: () => {
        toast.success('Đã xoá bot');
        onDeleted?.();
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Xoá bot thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Button variant="danger" size="sm">
          Xoá bot
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bot &quot;{bot.displayName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Xoá sẽ thu hồi toàn bộ token của bot này ngay lập tức. Hành động không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
          <AlertDialogClose
            render={
              <Button variant="danger" size="sm" isLoading={deleteBot.isPending} onClick={handleDelete}>
                Xoá
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 8: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/DeleteBotAlertDialog.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 9: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 10: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/EditBotDialog.tsx src/features/bots/components/EditBotDialog.test.tsx \
  src/features/bots/components/DeleteBotAlertDialog.tsx src/features/bots/components/DeleteBotAlertDialog.test.tsx
git commit -m "feat(bots): thêm EditBotDialog + DeleteBotAlertDialog"
```

---

## Task 10: FE component — `BotRow` + `BotsTab`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/BotRow.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/BotsTab.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/BotsTab.test.tsx`

**Interfaces:**
- Consumes: `useBots` (Task 5), `CreateBotDialog` (Task 8), `EditBotDialog`/`DeleteBotAlertDialog` (Task 9), `Bot` (Task 3), `SettingsSection` (`@/features/settings/components/SettingsSection`).
- Produces: `BotsTab()` — gắn vào `SettingsModal` ở Task 13. `BotRow` không export ra ngoài feature (chỉ dùng nội bộ `BotsTab`), nhưng cần state để mở panel token → Task 11 sẽ thêm state `manageTokenBot` vào `BotsTab`.

- [ ] **Step 1: Viết test thất bại cho `BotsTab`**

Tạo `vibe-chat-fe/src/features/bots/components/BotsTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotsTab } from './BotsTab';
import type { BotListPage } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

const mockList = vi.mocked(botsApi.list);

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotsTab />
    </QueryClientProvider>,
  );
}

const PAGE: BotListPage = {
  items: [
    {
      id: 'bot-1',
      username: 'weather_bot',
      displayName: 'Weather Bot',
      status: 'ACTIVE',
      provisioned: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

describe('BotsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện skeleton khi loading', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(screen.getAllByTestId('bot-skeleton').length).toBeGreaterThan(0);
  });

  it('hiện empty state khi không có bot', async () => {
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    renderTab();
    expect(await screen.findByText(/chưa có bot nào/i)).toBeInTheDocument();
  });

  it('hiện lỗi khi load thất bại', async () => {
    mockList.mockRejectedValue(new Error('network error'));
    renderTab();
    expect(await screen.findByText(/không tải được danh sách bot/i)).toBeInTheDocument();
  });

  it('hiện danh sách bot khi có data', async () => {
    mockList.mockResolvedValue(PAGE);
    renderTab();
    expect(await screen.findByText('weather_bot')).toBeInTheDocument();
    expect(screen.getByText('Weather Bot')).toBeInTheDocument();
  });

  it('mở CreateBotDialog khi click nút Tạo bot mới', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    renderTab();

    await user.click(await screen.findByRole('button', { name: /tạo bot mới/i }));
    expect(await screen.findByText(/username phải chứa/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotsTab.test.tsx`
Expected: FAIL — không tìm thấy module `./BotsTab`.

- [ ] **Step 3: Tạo `BotRow.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/BotRow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { KeyRound, MoreVertical, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { EditBotDialog } from './EditBotDialog';
import { DeleteBotAlertDialog } from './DeleteBotAlertDialog';
import type { Bot } from '../types';

export function BotRow({
  bot,
  onManageTokens,
}: {
  bot: Bot;
  onManageTokens: (bot: Bot) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{bot.username}</p>
          <Badge variant={bot.status === 'ACTIVE' ? 'soft-success' : 'soft-danger'} size="sm">
            {bot.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
          </Badge>
          {!bot.provisioned && (
            <Badge variant="soft-warning" size="sm">
              Chưa provision
            </Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-muted-foreground">{bot.displayName}</p>
      </div>

      <Button variant="ghost" size="sm" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => onManageTokens(bot)}>
        Quản lý token
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn cho ${bot.displayName}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Sửa thông tin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteBotAlertDialog bot={bot} />

      <EditBotDialog bot={bot} open={editOpen} onOpenChange={setEditOpen} />
    </li>
  );
}
```

- [ ] **Step 4: Tạo `BotsTab.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/BotsTab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useBots } from '../hooks/use-query';
import { BotRow } from './BotRow';
import { CreateBotDialog } from './CreateBotDialog';
import type { Bot } from '../types';

const PAGE_LIMIT = 20;

/** Tab "Bot của tôi" trong Settings — list bot + tạo bot + entry quản lý token. */
export function BotsTab() {
  const { data, isLoading, isError } = useBots({ page: 1, limit: PAGE_LIMIT });
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTokenBot, setManageTokenBot] = useState<Bot | null>(null);

  return (
    <SettingsSection
      title="Bot của tôi"
      desc="Tạo và quản lý bot của bạn — giống BotFather bên Telegram."
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} data-testid="bot-skeleton" className="h-[60px] w-full" rounded="lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-[13px] text-muted-foreground">Không tải được danh sách bot.</p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-[13px] text-muted-foreground">Bạn chưa có bot nào.</p>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Tạo bot mới
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((bot) => (
              <BotRow key={bot.id} bot={bot} onManageTokens={setManageTokenBot} />
            ))}
          </ul>
          <div className="mt-4">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Tạo bot mới
            </Button>
          </div>
        </>
      )}

      <CreateBotDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* BotTokensPanel gắn ở Task 11 — render khi manageTokenBot != null */}
    </SettingsSection>
  );
}
```

> Ghi chú: `manageTokenBot`/`setManageTokenBot` được dùng ở Task 11 (thêm render `BotTokensPanel`). Task này để state đã sẵn sàng nhưng panel chưa tồn tại — không render gì thêm, không lỗi TS vì `setManageTokenBot` vẫn được gọi trong `BotRow`.

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotsTab.test.tsx`
Expected: PASS (5 test).

- [ ] **Step 6: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi. (`manageTokenBot` state chưa dùng ngoài `setManageTokenBot` — nếu ESLint báo `no-unused-vars` cho biến `manageTokenBot`, đổi khai báo destructure thành `const [manageTokenBot, setManageTokenBot] = useState<Bot | null>(null); void manageTokenBot;` KHÔNG cần — thực tế biến có dùng ở Task 11 ngay sau, nên chấp nhận sửa file này tiếp ở Task 11 nếu lint đỏ tạm thời. Nếu lint đỏ ở bước này, comment tạm dòng khai báo `manageTokenBot` thành chỉ `const [, setManageTokenBot] = useState<Bot | null>(null);` và bỏ comment lại ở Task 11.)

- [ ] **Step 7: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/BotRow.tsx src/features/bots/components/BotsTab.tsx \
  src/features/bots/components/BotsTab.test.tsx
git commit -m "feat(bots): thêm BotRow + BotsTab — list bot đủ 4 trạng thái"
```

---

## Task 11: FE component — `TokenRow` + `BotTokensPanel`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/TokenRow.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/BotTokensPanel.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/BotTokensPanel.test.tsx`
- Modify: `vibe-chat-fe/src/features/bots/components/BotsTab.tsx`

**Interfaces:**
- Consumes: `useBotTokens`/`useRotateToken`/`useRevokeToken` (Task 6), `TokenRevealCard` (Task 7), `IssueTokenDialog` (Task 12 — import khai báo trước, component tạo ở Task 12 nên Task này CHƯA render `IssueTokenDialog`; nút "Cấp token mới" sẽ nối vào Task 12).
- Produces: `BotTokensPanel({ bot, open, onOpenChange }: { bot: Bot; open: boolean; onOpenChange: (open: boolean) => void })`.

- [ ] **Step 1: Viết test thất bại cho `BotTokensPanel`**

Tạo `vibe-chat-fe/src/features/bots/components/BotTokensPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotTokensPanel } from './BotTokensPanel';
import type { Bot, BotTokenListItem } from '../types';

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));

import { botTokensApi } from '@/services/bot-tokens.api';

const mockList = vi.mocked(botTokensApi.list);
const mockRotate = vi.mocked(botTokensApi.rotate);
const mockRevoke = vi.mocked(botTokensApi.revoke);

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ACTIVE_TOKEN: BotTokenListItem = {
  id: 'token-1',
  prefix: 'abc123',
  scopes: ['messages:send'],
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotTokensPanel bot={BOT} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BotTokensPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('hiện empty state khi bot chưa có token nào', async () => {
    mockList.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/chưa có token nào/i)).toBeInTheDocument();
  });

  it('hiện danh sách token với badge "Đã thu hồi" khi revokedAt != null', async () => {
    mockList.mockResolvedValue([
      { ...ACTIVE_TOKEN, id: 'token-2', revokedAt: '2026-02-01T00:00:00.000Z' },
    ]);
    renderPanel();
    expect(await screen.findByText(/đã thu hồi/i)).toBeInTheDocument();
  });

  it('rotate token → hiện lại TokenRevealCard với token mới', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ACTIVE_TOKEN]);
    mockRotate.mockResolvedValue({
      id: 'token-3',
      token: 'bot-1:newsecret',
      prefix: 'newsecret',
      scopes: ['messages:send'],
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    renderPanel();

    await screen.findByText('abc123••••');
    await user.click(screen.getByRole('button', { name: /rotate/i }));
    await user.click(screen.getByRole('button', { name: /xác nhận rotate/i }));

    expect(mockRotate).toHaveBeenCalledWith('bot-1', 'token-1', {});
    expect(await screen.findByText('bot-1:newsecret')).toBeInTheDocument();
  });

  it('revoke token → gọi botTokensApi.revoke', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ACTIVE_TOKEN]);
    mockRevoke.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByText('abc123••••');
    await user.click(screen.getByRole('button', { name: /^revoke$/i }));
    await user.click(screen.getByRole('button', { name: /xác nhận revoke/i }));

    expect(mockRevoke).toHaveBeenCalledWith('bot-1', 'token-1');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotTokensPanel.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Tạo `TokenRow.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/TokenRow.tsx`:

```tsx
'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog/AlertDialog';
import { BOT_TOKEN_SCOPE_LABELS } from '../schemas';
import type { BotTokenListItem } from '../types';

function fmt(iso: string | null): string {
  return iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm') : '';
}

export function TokenRow({
  token,
  onRotate,
  onRevoke,
  rotating,
  revoking,
}: {
  token: BotTokenListItem;
  onRotate: () => void;
  onRevoke: () => void;
  rotating: boolean;
  revoking: boolean;
}) {
  const revoked = token.revokedAt != null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <code className="text-[13px] font-semibold">{token.prefix}••••</code>
        {revoked ? (
          <Badge variant="soft-danger" size="sm">Đã thu hồi</Badge>
        ) : (
          <Badge variant="soft-success" size="sm">Đang hoạt động</Badge>
        )}
        {token.scopes.map((s) => (
          <Badge key={s} variant="secondary" size="sm">
            {BOT_TOKEN_SCOPE_LABELS[s]}
          </Badge>
        ))}
      </div>

      <p className="text-[12px] text-muted-foreground">
        Tạo lúc {fmt(token.createdAt)} · Hết hạn: {token.expiresAt ? fmt(token.expiresAt) : 'Không giới hạn'}
        {' · '}
        Dùng lần cuối: {token.lastUsedAt ? fmt(token.lastUsedAt) : 'Chưa dùng'}
      </p>

      {!revoked && (
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="ghost" size="sm" isLoading={rotating}>
                Rotate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate token này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Token cũ sẽ ngừng hoạt động ngay lập tức. Bot phải cập nhật token mới để tiếp tục hoạt động.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
                <AlertDialogClose
                  render={
                    <Button variant="danger" size="sm" onClick={onRotate}>
                      Xác nhận rotate
                    </Button>
                  }
                />
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="ghost" size="sm" isLoading={revoking} className="text-destructive">
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Thu hồi token này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bot sẽ không dùng được token này nữa. Hành động không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
                <AlertDialogClose
                  render={
                    <Button variant="danger" size="sm" onClick={onRevoke}>
                      Xác nhận revoke
                    </Button>
                  }
                />
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 4: Tạo `BotTokensPanel.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/BotTokensPanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { ApiError } from '@/lib/api/client';
import { useBotTokens, } from '../hooks/use-query';
import { useRotateToken, useRevokeToken } from '../hooks/use-mutations';
import { TokenRow } from './TokenRow';
import { TokenRevealCard } from './TokenRevealCard';
import type { Bot } from '../types';

export function BotTokensPanel({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: tokens, isLoading, isError } = useBotTokens(bot.id);
  const rotateToken = useRotateToken(bot.id);
  const revokeToken = useRevokeToken(bot.id);
  const [revealToken, setRevealToken] = useState<string | null>(null);

  function handleRotate(tokenId: string) {
    rotateToken.mutate(
      { tokenId, input: {} },
      {
        onSuccess: (issued) => setRevealToken(issued.token),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Rotate token thất bại.'),
      },
    );
  }

  function handleRevoke(tokenId: string) {
    revokeToken.mutate(tokenId, {
      onSuccess: () => toast.success('Đã thu hồi token'),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : 'Thu hồi token thất bại.'),
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setRevealToken(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token của {bot.displayName}</DialogTitle>
          <DialogDescription>Quản lý token dùng để xác thực Bot API.</DialogDescription>
        </DialogHeader>

        {revealToken ? (
          <TokenRevealCard token={revealToken} onDone={() => setRevealToken(null)} />
        ) : (
          <>
            {isLoading && (
              <div className="flex flex-col gap-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-[70px] w-full" rounded="lg" />
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <p className="text-[13px] text-muted-foreground">Không tải được danh sách token.</p>
            )}

            {!isLoading && !isError && tokens && tokens.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Bot này chưa có token nào.</p>
            )}

            {!isLoading && !isError && tokens && tokens.length > 0 && (
              <ul className="flex flex-col gap-2">
                {tokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onRotate={() => handleRotate(token.id)}
                    onRevoke={() => handleRevoke(token.id)}
                    rotating={rotateToken.isPending && rotateToken.variables?.tokenId === token.id}
                    revoking={revokeToken.isPending && revokeToken.variables === token.id}
                  />
                ))}
              </ul>
            )}

            {/* Nút "Cấp token mới" (IssueTokenDialog) gắn ở Task 12 */}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotTokensPanel.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 6: Nối `BotTokensPanel` vào `BotsTab.tsx`**

Sửa `vibe-chat-fe/src/features/bots/components/BotsTab.tsx` — thêm import và render panel. Thay dòng comment `{/* BotTokensPanel gắn ở Task 11 — render khi manageTokenBot != null */}` bằng:

```tsx
import { BotTokensPanel } from './BotTokensPanel';
```

(thêm vào đầu file, cùng nhóm import component)

```tsx
{manageTokenBot && (
  <BotTokensPanel
    bot={manageTokenBot}
    open
    onOpenChange={(next) => {
      if (!next) setManageTokenBot(null);
    }}
  />
)}
```

(thay cho dòng comment ở cuối `SettingsSection`, ngay sau `<CreateBotDialog .../>`)

- [ ] **Step 7: Chạy lại toàn bộ test `BotsTab` + `BotTokensPanel`**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotsTab.test.tsx src/features/bots/components/BotTokensPanel.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 8: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 9: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/TokenRow.tsx src/features/bots/components/BotTokensPanel.tsx \
  src/features/bots/components/BotTokensPanel.test.tsx src/features/bots/components/BotsTab.tsx
git commit -m "feat(bots): thêm TokenRow + BotTokensPanel — rotate/revoke token"
```

---

## Task 12: FE component — `IssueTokenDialog`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/components/IssueTokenDialog.tsx`
- Create: `vibe-chat-fe/src/features/bots/components/IssueTokenDialog.test.tsx`
- Modify: `vibe-chat-fe/src/features/bots/components/BotTokensPanel.tsx`

**Interfaces:**
- Consumes: `useIssueToken` (Task 6), `issueTokenSchema`/`IssueTokenInput`/`BOT_TOKEN_SCOPES`/`BOT_TOKEN_SCOPE_LABELS` (Task 3), `TokenRevealCard` (Task 7).
- Produces: `IssueTokenDialog({ botId, open, onOpenChange, onIssued }: { botId: string; open: boolean; onOpenChange: (open: boolean) => void; onIssued: (token: string) => void })`.

- [ ] **Step 1: Viết test thất bại**

Tạo `vibe-chat-fe/src/features/bots/components/IssueTokenDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueTokenDialog } from './IssueTokenDialog';

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { issue: vi.fn() },
}));

import { botTokensApi } from '@/services/bot-tokens.api';

const mockIssue = vi.mocked(botTokensApi.issue);

function renderDialog(onIssued = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <IssueTokenDialog botId="bot-1" open onOpenChange={vi.fn()} onIssued={onIssued} />
    </QueryClientProvider>,
  );
  return { onIssued };
}

describe('IssueTokenDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiện đủ 4 checkbox scope', () => {
    renderDialog();
    expect(screen.getByLabelText(/gửi tin nhắn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gửi media/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quản lý webhook/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quản lý command/i)).toBeInTheDocument();
  });

  it('tick 1 scope rồi submit → gọi botTokensApi.issue với đúng scope + gọi onIssued', async () => {
    const user = userEvent.setup();
    mockIssue.mockResolvedValue({
      id: 'token-9',
      token: 'bot-1:newtoken',
      prefix: 'newtoken',
      scopes: ['messages:send'],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const { onIssued } = renderDialog();

    await user.click(screen.getByLabelText(/gửi tin nhắn/i));
    await user.click(screen.getByRole('button', { name: /cấp token/i }));

    expect(mockIssue).toHaveBeenCalledWith('bot-1', { scopes: ['messages:send'] });
    await vi.waitFor(() => expect(onIssued).toHaveBeenCalledWith('bot-1:newtoken'));
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/IssueTokenDialog.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Tạo `IssueTokenDialog.tsx`**

Tạo `vibe-chat-fe/src/features/bots/components/IssueTokenDialog.tsx`:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useIssueToken } from '../hooks/use-mutations';
import {
  issueTokenSchema,
  BOT_TOKEN_SCOPES,
  BOT_TOKEN_SCOPE_LABELS,
  type IssueTokenInput,
} from '../schemas';

export function IssueTokenDialog({
  botId,
  open,
  onOpenChange,
  onIssued,
}: {
  botId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (token: string) => void;
}) {
  const issueToken = useIssueToken(botId);
  const form = useForm<IssueTokenInput>({
    resolver: zodResolver(issueTokenSchema),
    defaultValues: { scopes: [] },
  });

  function onSubmit(data: IssueTokenInput) {
    issueToken.mutate(data, {
      onSuccess: (issued) => {
        form.reset({ scopes: [] });
        onIssued(issued.token);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Cấp token thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp token mới</DialogTitle>
          <DialogDescription>Chọn quyền hạn (scope) và hạn dùng cho token.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="scopes"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {BOT_TOKEN_SCOPES.map((scope) => (
                    <Checkbox
                      key={scope}
                      checked={(field.value ?? []).includes(scope)}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        field.onChange(
                          checked
                            ? [...current, scope]
                            : current.filter((s) => s !== scope),
                        );
                      }}
                      label={BOT_TOKEN_SCOPE_LABELS[scope]}
                    />
                  ))}
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field, fieldState }) => (
                <DatePicker
                  mode="single"
                  editable
                  label="Hạn dùng (bỏ trống = không giới hạn)"
                  placeholder="dd/mm/yyyy"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(d) => field.onChange(d instanceof Date ? d.toISOString() : undefined)}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Button type="submit" isLoading={issueToken.isPending}>
              Cấp token
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/IssueTokenDialog.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Nối `IssueTokenDialog` vào `BotTokensPanel.tsx`**

Sửa `vibe-chat-fe/src/features/bots/components/BotTokensPanel.tsx`:

Thêm import:

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { IssueTokenDialog } from './IssueTokenDialog';
```

(gộp `useState`/`Button` vào import đã có nếu trùng — file đã import `useState` từ Task 11, chỉ thêm `Plus`, `Button`, `IssueTokenDialog`)

Thêm state (trong component, cạnh `revealToken`):

```tsx
const [issueOpen, setIssueOpen] = useState(false);
```

Thay đoạn comment `{/* Nút "Cấp token mới" (IssueTokenDialog) gắn ở Task 12 */}` bằng:

```tsx
<div className="mt-2">
  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIssueOpen(true)}>
    Cấp token mới
  </Button>
</div>

<IssueTokenDialog
  botId={bot.id}
  open={issueOpen}
  onOpenChange={setIssueOpen}
  onIssued={(token) => {
    setIssueOpen(false);
    setRevealToken(token);
  }}
/>
```

- [ ] **Step 6: Chạy lại toàn bộ test `BotTokensPanel`**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots/components/BotTokensPanel.test.tsx src/features/bots/components/IssueTokenDialog.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 7: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 8: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/components/IssueTokenDialog.tsx src/features/bots/components/IssueTokenDialog.test.tsx \
  src/features/bots/components/BotTokensPanel.tsx
git commit -m "feat(bots): thêm IssueTokenDialog — cấp token mới với scope + hạn dùng"
```

---

## Task 13: FE — export public API + wire vào `SettingsModal`

**Files:**
- Create: `vibe-chat-fe/src/features/bots/index.ts`
- Modify: `vibe-chat-fe/src/features/settings/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: `BotsTab` (Task 10).
- Produces: `@/features/bots` export tường minh cho mọi thứ dùng ngoài feature (hiện chỉ cần `BotsTab`, nhưng export thêm `types`/`schemas` để nơi khác tái dùng nếu cần).

- [ ] **Step 1: Tạo `index.ts`**

Tạo `vibe-chat-fe/src/features/bots/index.ts`:

```ts
export { BotsTab } from './components/BotsTab';
export * from './types';
export * from './schemas';
```

- [ ] **Step 2: Sửa `SettingsModal.tsx` — thêm tab "bots"**

Trong `vibe-chat-fe/src/features/settings/components/SettingsModal.tsx`, sửa import icon (thêm `Bot as BotIcon`):

```tsx
import { Bell, Bot as BotIcon, Cloud, MessageSquare, MonitorSmartphone, Palette, ShieldCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
```

Thêm import component:

```tsx
import { BotsTab } from '@/features/bots';
```

Sửa `TabId`:

```ts
type TabId = 'general' | 'appearance' | 'notifications' | 'messages' | 'privacy' | 'devices' | 'backup' | 'bots';
```

Thêm vào mảng `TABS` (ngay sau `devices`, trước `backup`):

```ts
  { id: 'devices', label: 'Thiết bị đăng nhập', icon: MonitorSmartphone, Component: DevicesTab },
  { id: 'bots', label: 'Bot của tôi', icon: BotIcon, Component: BotsTab },
  { id: 'backup', label: 'Backup', icon: Cloud, Component: BackupTab },
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd vibe-chat-fe && npm run typecheck && npm run lint`
Expected: 0 lỗi.

- [ ] **Step 4: Chạy toàn bộ test suite của feature `bots`**

Run: `cd vibe-chat-fe && npm run test -- src/features/bots`
Expected: PASS toàn bộ (tất cả file `.test.ts`/`.test.tsx` trong `src/features/bots`).

- [ ] **Step 5: Commit**

```bash
cd vibe-chat-fe
git add src/features/bots/index.ts src/features/settings/components/SettingsModal.tsx
git commit -m "feat(bots): export public API + gắn tab \"Bot của tôi\" vào SettingsModal"
```

---

## Task 14: Playwright — critical path E2E

**Files:**
- Create: `vibe-chat-fe/e2e/bots.spec.ts`

**Interfaces:**
- Consumes: app thật đang chạy (Next.js prod build port 3003 theo `playwright.config.ts`), backend thật (`bot-service` + `vibe-chat` + `auth-service`), user test có sẵn `ad1`/`111111` (theo `e2e/login-send-message.spec.ts`).

- [ ] **Step 1: Tạo `e2e/bots.spec.ts`**

Tạo `vibe-chat-fe/e2e/bots.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('quản lý bot: tạo → xem token → rotate → revoke', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.locator('#login-username').fill('ad1');
  await page.locator('#login-password').fill('111111');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('/chat');
  await page.waitForLoadState('networkidle');

  // Mở Settings → tab "Bot của tôi"
  await page.getByRole('button', { name: /cài đặt/i }).click();
  await page.getByRole('tab', { name: 'Bot của tôi' }).or(page.getByText('Bot của tôi')).click();

  // Tạo bot mới — username unique bằng timestamp
  const username = `e2e_test_bot_${Date.now()}`;
  await page.getByRole('button', { name: /tạo bot mới/i }).click();
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/tên hiển thị/i).fill('E2E Test Bot');

  const createResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/v1/bots') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^tạo bot$/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBe(true);

  // Thấy token hiện 1 lần
  const tokenCode = page.locator('code');
  await expect(tokenCode).toBeVisible();

  // Tick xác nhận đã lưu rồi đóng
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: /đóng/i }).click();

  // Bot mới xuất hiện trong list
  await expect(page.getByText(username)).toBeVisible();

  // Mở quản lý token
  const botRow = page.locator('li', { hasText: username });
  await botRow.getByRole('button', { name: /quản lý token/i }).click();
  await expect(page.getByText(/token của e2e test bot/i)).toBeVisible();

  // Rotate token đầu tiên
  const rotateResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/rotate') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^rotate$/i }).first().click();
  await page.getByRole('button', { name: /xác nhận rotate/i }).click();
  const rotateResponse = await rotateResponsePromise;
  expect(rotateResponse.ok()).toBe(true);
  await expect(tokenCode).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: /đóng/i }).click();

  // Revoke token
  const revokeResponsePromise = page.waitForResponse(
    (res) => res.request().method() === 'DELETE' && /\/tokens\//.test(res.url()),
  );
  await page.getByRole('button', { name: /^revoke$/i }).first().click();
  await page.getByRole('button', { name: /xác nhận revoke/i }).click();
  const revokeResponse = await revokeResponsePromise;
  expect(revokeResponse.ok()).toBe(true);
  await expect(page.getByText(/đã thu hồi/i)).toBeVisible();
});
```

- [ ] **Step 2: Chạy Playwright, xác nhận PASS**

Đảm bảo `bot-service`, `vibe-chat`, `auth-service` đang chạy và `.env`/`next.config.ts` đã trỏ đúng `BOT_URL`/`NEXT_PUBLIC_BOT_URL` (Task 2).

Run: `cd vibe-chat-fe && npx playwright test e2e/bots.spec.ts`
Expected: PASS (1 test). Nếu selector `getByRole('tab', ...)` không khớp UI thật của `SettingsModal` (tab dùng button thường, không phải role="tab"), đổi selector trong step "Mở Settings" thành `page.getByRole('button', { name: 'Bot của tôi' })` — kiểm tra role thật bằng `npx playwright test e2e/bots.spec.ts --debug` nếu fail ở bước này.

- [ ] **Step 3: Commit**

```bash
cd vibe-chat-fe
git add e2e/bots.spec.ts
git commit -m "test(bots): thêm Playwright e2e critical-path cho quản lý bot"
```

---

## Self-Review Checklist (đã chạy khi viết plan)

1. **Spec coverage:** Task 1 = mục 2 spec (backend endpoint). Task 2 = mục 3 spec (kết nối). Task 3-4 = mục 4 spec (schemas/types/services). Task 5-6 = hooks (ngầm định trong mục 4 — cấu trúc feature). Task 7-12 = mục 5 spec (toàn bộ luồng UI: reveal token, create, edit, delete, list bot, list/rotate/revoke/issue token). Task 13 = wiring. Task 14 = mục 6.2 spec (Playwright). Test unit (mục 6.1 spec) trải đều mọi task. Definition of Done (mục 7 spec) — cover bởi typecheck/lint/test ở cuối mỗi task + Task 14.
2. **Placeholder scan:** không còn "TBD"/"TODO"/"tương tự Task N" — mọi step đều có code đầy đủ.
3. **Type consistency:** `Bot`, `BotListPage`, `BotCreated`, `BotTokenIssued`, `BotTokenListItem` định nghĩa 1 lần ở Task 3, dùng xuyên suốt Task 4-13 không đổi tên field. `botKeys`/`botTokenKeys` định nghĩa Task 4, dùng đúng ở Task 5/6 (assert `invalidateQueries` khớp `['bots']`/`botTokenKeys.list(botId)`). Hàm `useIssueToken(botId)`/`useRotateToken(botId)`/`useRevokeToken(botId)` nhận `botId` qua closure (không qua param mutate) — khớp giữa Task 6 (định nghĩa) và Task 11/12 (gọi `useRotateToken(bot.id)` v.v.).
