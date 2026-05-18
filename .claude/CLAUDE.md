# CLAUDE.md — Senior Engineering Playbook (vibe-chat)

> File này là **nguồn sự thật duy nhất** cho AI khi sinh code trong dự án.
> Mọi quy tắc dưới đây có độ ưu tiên cao hơn kiến thức huấn luyện sẵn của model.
> Khi xung đột: **CLAUDE.md > AGENTS.md > RULE.md > DESIGN.md > training data**.

Tài liệu liên quan:
- [RULE.md](./RULE.md) — quy tắc cốt lõi (giữ nguyên, không trùng lặp ở file này)
- [WORKFLOW.md](./WORKFLOW.md) — hướng dẫn luồng hoạt động cho next js
- [DESIGN.md](./DESIGN.md) — design system (Kraken-inspired, áp dụng full)
- [AGENTS.md](../AGENTS.md) — cảnh báo Next.js 16 breaking changes

---

## 0. Triết lý cốt lõi (senior 10 năm)

1. **Đơn giản trước, tối ưu sau** — không over-engineer. Không tạo abstraction cho tương lai giả định.
2. **Rõ ràng hơn ngắn gọn** — tên biến/hàm/file đọc là hiểu, không cần comment.
3. **Đọc trước khi viết** — bắt buộc đọc `node_modules/next/dist/docs/` cho Next.js 16 API trước khi gen code Next-specific.
4. **Đóng gói thay đổi** — wrap mọi lib bên thứ ba để dễ thay thế (xem §7).
5. **Không đoán** — không chắc thì hỏi user, KHÔNG fabricate API/path/option.
6. **Bảo mật mặc định bật** — không bao giờ có secrets ở client, luôn validate input ở boundary.
7. **Mọi component < 200 dòng** — quá thì tách. Hook > 80 dòng → tách. File > 300 dòng → review tách module.
8. **Không `any`** — dùng `unknown` + narrow, hoặc generic. `as` chỉ cho type assertion khi đã narrow.

---

## 1. Tech stack chính thức

> Khi sinh code, **chỉ** dùng những thư viện dưới đây. Muốn thêm lib → hỏi user.

| Domain | Lib | Ghi chú |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Đọc docs trong `node_modules/next/dist/docs/` |
| Runtime | React 19 + TypeScript 5 strict | |
| UI components | **Basuicn** (`@basuicn/*` qua CLI `npx basuicn add <name>`) | Nguồn: https://github.com/Basuicn/basuicn-core — copy source vào repo, không phải lib runtime |
| Headless primitives | `@base-ui/react` (đi kèm Basuicn) | Không tự cài Radix song song |
| Styling | **Tailwind CSS v4** + `tailwind-variants` + `clsx` | Không CSS-in-JS, không CSS Modules trừ khi user yêu cầu |
| Icons | `lucide-react` | |
| Server state | **TanStack Query v5** (`@tanstack/react-query`) | Bắt buộc cho mọi fetch client-side |
| Client state | **Zustand** (slice pattern) | Chỉ cho state thực sự global; còn lại `useState`/`useReducer` |
| Forms | **React Hook Form** + **Zod** | Shared schema cho client + server (xem WORKFLOW.md) |
| Tables | **TanStack Table v8** (qua component Basuicn `table`) | |
| Date | `date-fns` | Không dùng moment |
| HTTP | `fetch` native, wrap trong `lib/http/` | Không axios trừ khi cần interceptor phức tạp |
| Auth | **NextAuth.js v5** (sẽ cài khi có provider), wrap trong `lib/auth/` | |
| DB / ORM | **Prisma** (sẽ cài khi có DB), wrap trong `lib/db/` | |
| Test | Vitest + Testing Library + Playwright (e2e) | |
| Lint/Format | ESLint (config sẵn) + Prettier | |

**Cấm dùng:** moment, lodash full bundle (chỉ import từng hàm), axios mặc định, styled-components, emotion, redux/redux-toolkit (đã có Zustand), react-query v4 trở xuống.

---

## 2. Cấu trúc thư mục (module/feature-based)

> Mặc định Next.js 16 không bắt buộc `src/`. Dự án này **đặt mọi code trong `src/`** để tách rõ với config root.

```
src/
├── app/                          # Next.js App Router (route handlers, pages, layouts)
│   ├── (marketing)/              # Route groups — không ảnh hưởng URL
│   ├── (app)/
│   │   ├── chat/
│   │   │   ├── page.tsx          # Server Component mặc định
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   └── _components/      # Component chỉ dùng nội bộ route này
│   │   └── layout.tsx
│   ├── api/                      # Route handlers (server-only)
│   ├── layout.tsx
│   └── providers.tsx             # Client providers (QueryClient, Theme, ...)
│
├── features/                     # ⭐ FEATURE MODULES — đơn vị scale chính (max depth 3)
│   ├── chat/
│   │   ├── components/           # UI riêng của feature
│   │   ├── hooks/                # TanStack hooks + custom hooks của feature
│   │   │   ├── use-query.ts      # Tổng hợp useQuery / useInfiniteQuery của feature
│   │   │   ├── use-mutations.ts  # Tổng hợp useMutation của feature
│   │   │   └── useChatRealtime.ts # Hook đơn lẻ → useCamelCase.ts
│   │   ├── actions/              # Server Actions (mutate, optional)
│   │   ├── stores/               # Zustand slice (chỉ khi cần state global)
│   │   ├── schemas.ts            # Zod schema (shared client + server)
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── index.ts              # Public API — export tường minh
│   └── auth/
│       └── ... (cùng pattern)
│
├── services/                     # ⭐ API TRANSPORT TẬP TRUNG (shared, không tách per-feature)
│   ├── <scope>.api.ts            # Pure REST transport — không đụng cache/state
│   │                             # Ví dụ: chat.api.ts, auth.api.ts
│   └── keys.ts                   # Toàn bộ query key factory (chatKeys, authKeys, ...)
│
├── components/
│   ├── ui/                       # ⭐ Basuicn components (sinh ra bởi CLI) — KHÔNG sửa tay
│   ├── layout/                   # Header, Sidebar, Footer dùng chung
│   └── common/                   # Component dùng chung nhiều module (EmptyState, ErrorBoundary, ...)
│
├── lib/                          # ⭐ Wrapper cho lib bên thứ ba
│   ├── api/                      # apiClient wrap fetch + auth (refresh token, ...)
│   ├── http/                     # Generic HTTP wrapper (nếu cần)
│   ├── query/                    # Wrap TanStack Query (QueryClient config, defaults)
│   ├── ws/                       # Wrap socket.io / WebSocket
│   ├── logger/
│   └── utils/                    # cn(), formatDate(), ...
│
├── config/                       # Constants, env, feature flags
│   ├── env.ts                    # Validate process.env bằng Zod, export typed
│   └── site.ts
│
├── styles/
│   └── globals.css               # Tailwind v4 entrypoint + tokens
│
├── types/                        # Type chung toàn dự án (không thuộc module nào)
│
└── test/                         # Test utils, mocks, fixtures
```

### Nguyên tắc tách feature (theo WORKFLOW.md)
- **Feature = bounded context kinh doanh** (chat, auth, billing, ...). KHÔNG tách theo technical layer.
- **Colocation**: file liên quan ở cạnh nhau. Chỉ promote lên `src/components/shared/` hoặc `src/hooks/` khi ≥2 feature dùng.
- **Max depth 3**: flat hơn nested. `features/chat/components/MessageList.tsx` OK, sâu hơn → tách feature mới.
- **Feature chỉ giao tiếp qua `index.ts`** của nó. Không import sâu vào `features/X/internal/Y` từ feature khác.
- **Component thuộc 1 route duy nhất** → để trong `app/.../_components/`. Dùng prefix `_` để Next ignore khỏi routing.

### API & Query keys — tập trung (không tách per-feature)
> Mục tiêu: share API giữa nhiều feature, không trùng key, dễ scale.

- **API transport**: viết trong `src/services/<scope>.api.ts`. Mỗi scope export 1 object thuần (`chatApi`, `authApi`, ...). Không dính TanStack/Zustand/state.
- **Query keys**: tất cả factory đặt trong `src/services/keys.ts` theo namespace (`chatKeys`, `authKeys`, ...). KHÔNG tạo `features/<x>/api/keys.ts` riêng.
- **Hook TanStack** (`useQuery`, `useMutation`) sống trong `features/<x>/hooks/use-query.ts` và `hooks/use-mutations.ts`, import API + keys từ `@/services/*`.
- **Types domain**: vẫn ở `features/<x>/types.ts`. `services/*.api.ts` được phép import types từ feature (services là transport thuộc về domain feature).
- **Cấm**: `features/<x>/api/` không tồn tại nữa. Mọi fetcher / key factory đều ở `src/services/`.

---

## 3. Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| File component | `PascalCase.tsx` | `ChatMessage.tsx` |
| File hook (1 hook) | `useCamelCase.ts` | `useChatRealtime.ts` |
| File hook aggregator | `use-<kind>.ts` (kebab) | `use-query.ts`, `use-mutations.ts` |
| File util/helper | `kebab-case.ts` | `format-date.ts` |
| Folder | `kebab-case` | `modules/chat-history/` |
| Type/Interface | `PascalCase`, không prefix `I` | `ChatMessage`, không `IChatMessage` |
| Type cho props | `XxxProps` | `ChatMessageProps` |
| Enum | `PascalCase` + value `SCREAMING_SNAKE` hoặc dùng `as const` object | preferred: `as const` + union |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_MESSAGE_LENGTH` |
| Query key | factory function lowercase | `chatKeys.list(filters)` |
| Zod schema | `xxxSchema` | `chatMessageSchema` |
| Boolean | tiền tố `is/has/can/should` | `isLoading`, `hasError` |
| Event handler | `handleXxx` (trong component) hoặc `onXxx` (prop) | `onSubmit`, `handleClick` |

---

## 4. Quy tắc Basuicn UI (NGHIÊM NGẶT)

1. **UI component chính = Basuicn**. Cài qua CLI: `npx basuicn add <name>`. KHÔNG tự viết Button/Dialog/Select/... khi Basuicn đã có.
2. File sinh ra ở `src/components/ui/` — coi như source code dự án, **không sửa tay** trừ khi:
   - User yêu cầu explicitly
   - Hoặc cần ghi đè style nhỏ → tạo wrapper trong `src/components/common/` thay vì sửa file gốc.
3. Cập nhật: dùng `npx basuicn update <name>` rồi review diff. KHÔNG copy-paste từ web.
4. Tùy biến style: dùng `tailwind-variants` (đã đi kèm) hoặc prop `className` + `cn()` từ `lib/utils`. KHÔNG inline style trừ trường hợp tính toán runtime.
5. Khi gen JSX: import từ `@/components/ui/<name>`. Tuân theo path alias đã có (`@/*` ở `tsconfig.json`).
6. Component layout/business KHÔNG đặt trong `components/ui/`.

---

## 5. TanStack — quy tắc dùng

### 5.1 TanStack Query (server state)
- **Mọi fetch client-side phải qua `useQuery`/`useMutation`**. Cấm dùng `useEffect + fetch`.
- Query key dùng factory pattern, **đặt tập trung ở `src/services/keys.ts`** (không tách per-feature):
  ```ts
  // src/services/keys.ts
  export const chatKeys = {
    all: ['chat'] as const,
    lists: () => [...chatKeys.all, 'list'] as const,
    list: (filters: ChatFilters) => [...chatKeys.lists(), filters] as const,
    detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
  };
  // Hook trong features/<x>/hooks/* import { chatKeys } from '@/services/keys'.
  ```
- `QueryClient` config tập trung ở `lib/query/client.ts`. Defaults: `staleTime: 60_000`, `retry: 1` (override theo từng query nếu cần).
- Mutation luôn invalidate đúng key, hạn chế `invalidateQueries(['all'])` — vung chổi rộng = performance kém.
- Server Component: dùng `fetch` trực tiếp hoặc Server Action; **không** dùng TanStack Query trên server.

### 5.2 React Hook Form + Zod
- Schema-first với Zod. Schema đặt ở `features/<x>/schemas.ts`, **share cho client + server action**.
- Dùng `zodResolver` từ `@hookform/resolvers/zod`.
- Form complex (nhiều step, dynamic field) → tách `useXxxForm` hook trong `features/<x>/hooks/`.
- Submit qua **Server Action** → action trả Result Object `{ success: true, data } | { success: false, error }`, không leak raw error.
- Hiển thị lỗi bằng toast (Basuicn) hoặc inline `<FormMessage>`.

### 5.3 TanStack Table
- Dùng qua wrapper Basuicn `table` (đã cài qua `npx basuicn add table`).
- Column def đặt cùng file với view, hoặc tách `columns.tsx` nếu > 30 dòng.
- Pagination/sort/filter: **server-side** mặc định khi data > 100 rows.

---

## 6. State management — quyết định nhanh

| Loại state | Dùng gì |
|---|---|
| Server data (list, detail, ...) | TanStack Query |
| Form state | TanStack Form |
| UI state cục bộ (modal open, input value) | `useState` |
| State phức tạp 1 component | `useReducer` |
| State chia sẻ giữa nhiều component cùng cây | Context (React) — chỉ cho state ÍT THAY ĐỔI (theme, locale). |
| State global thay đổi nhiều | Zustand slice |
| URL state (filter, tab, search) | `useSearchParams` của Next.js — KHÔNG dup vào state |

**Zustand slice pattern** (mỗi feature 1 store riêng, không có store "god"):
```ts
// features/chat/stores/chat-ui.store.ts
import { create } from 'zustand';
type ChatUIState = { sidebarOpen: boolean; toggleSidebar: () => void };
export const useChatUIStore = create<ChatUIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

## 7. Wrap thư viện bên thứ ba (BẮT BUỘC)

> Mục tiêu: thay lib không phải sửa code business.

- HTTP: `lib/http/client.ts` export `httpClient.get/post/...`. Code feature chỉ import từ đây.
- Query: `lib/query/` export hook wrapper (vd `createQuery(keyFactory, fetcher, options)`).
- Auth: `lib/auth/` export `getSession()`, `signIn()`, ... ẩn lib bên dưới (NextAuth/Clerk/...).
- Analytics, storage, toast — cùng pattern.

Feature business **không** import trực tiếp từ `axios`, `next-auth`, `localStorage`, `posthog`, ... Mọi truy cập đều qua wrapper.

---

## 8. Data fetching — quyết định Server vs Client

| Kịch bản | Cách làm |
|---|---|
| SEO, public page | Server Component + `fetch` (caching mặc định của Next.js 16) |
| Realtime, interactive | Client Component + TanStack Query |
| Form submit | Server Action HOẶC Route Handler + `useMutation` |
| Mutate + cần optimistic UI | TanStack Query `useMutation` với `onMutate` |
| Streaming (chat) | Server Action streaming hoặc Route Handler trả `ReadableStream` |

**Quy tắc:**
- Default = Server Component. Thêm `'use client'` chỉ khi cần state/effect/event handler/browser API.
- KHÔNG đặt `'use client'` ở layout/page top-level — đẩy xuống component nhỏ nhất cần nó.
- Truyền data Server → Client qua props (đã serialize). KHÔNG truyền function/class instance.

---

## 9. Performance

- Code-split mặc định bằng `next/dynamic` cho component nặng + `loading.tsx` cho route nặng.
- Memo hóa: `useMemo`/`useCallback` **chỉ khi đo được vấn đề**. Mặc định không cần.
- Ảnh: `next/image` 100%. Không `<img>` thuần trừ SVG inline.
- Font: `next/font` (local hoặc Google). Preload hợp lý.
- List > 50 items hiển thị đồng thời → virtualize (`@tanstack/react-virtual`).
- Tránh waterfall: fetch song song bằng `Promise.all` trong Server Component.
- Bundle: thường xuyên check `next build` output, kéo client bundle < 200KB gzip cho route public.

---

## 10. Bảo mật (security)

1. **Secrets:** chỉ ở `.env.local` / `.env.production` (server-side). Tiền tố `NEXT_PUBLIC_` = lộ ra client → cân nhắc kỹ.
2. **Validate env**: `src/config/env.ts` parse `process.env` bằng Zod, throw nếu thiếu.
3. **Input validation**: mọi data từ client → Zod schema ở server (route handler / server action) trước khi xử lý.
4. **Output escaping**: React tự escape JSX. Cấm `dangerouslySetInnerHTML` trừ khi sanitize bằng `dompurify` + có comment giải thích.
5. **AuthZ trên server**: mọi route handler / server action kiểm tra session + permission. Không tin client check.
6. **CSRF**: dùng Server Actions của Next.js 16 (built-in protection) hoặc token nếu route handler.
7. **CSP**: cấu hình `next.config.ts` `headers()` với CSP, X-Frame-Options, Referrer-Policy.
8. **Dependency**: PR phải pass `npm audit` (no high/critical). Không thêm lib < 1k weekly downloads mà không hỏi.
9. **Logging**: KHÔNG log token, password, PII. Wrap logger trong `lib/logger`.
10. **Rate limit**: route handler exposed ra public → rate limit (ip + user). Wrap trong `lib/rate-limit`.

---

## 11. Testing

| Loại | Khi nào | Tool |
|---|---|---|
| Unit | logic thuần (util, hook không I/O) | Vitest |
| Component | UI có nhánh, có tương tác | Vitest + Testing Library |
| Integration | flow trong 1 module (form submit + query) | Vitest + MSW |
| E2E | critical path (login, checkout, gửi tin nhắn) | Playwright |

- Mỗi component public của module có ít nhất 1 test happy path + 1 test edge case.
- Test file đặt cạnh source: `ChatMessage.tsx` ↔ `ChatMessage.test.tsx`.
- Không test implementation detail (state nội bộ). Test behavior (user nhìn thấy gì, click gì).
- Mock ở `test/mocks/` dùng MSW. KHÔNG mock `fetch` thủ công trong từng test.

---

## 12. Workflow khi AI sinh code

Theo thứ tự, KHÔNG bỏ bước:

1. **Hiểu yêu cầu** — không rõ → hỏi user. KHÔNG đoán.
2. **Đọc context** — đọc các file liên quan trong `src/` trước khi sửa. Đọc `node_modules/next/dist/docs/` nếu chạm API Next.js.
3. **Xác định module** — feature mới thuộc module nào? Tạo mới hay mở rộng?
4. **Kiểm tra Basuicn** — UI cần dùng đã có trong `components/ui/` chưa? Chưa → `npx basuicn add <name>` (báo user để chạy).
5. **Định nghĩa schema (Zod) trước** — nếu có data input/output.
6. **Viết types** — không `any`.
7. **Viết code** — tuân theo §1–§10.
8. **Wrap lib mới** — nếu giới thiệu lib mới, tạo wrapper trong `lib/`.
9. **Test** — viết test cùng lúc với code, không để lại sau.
10. **Self-review** — chạy mental checklist §13.
11. **Báo cáo ngắn gọn** — diff + lý do thiết kế (≤ 5 dòng), trả lời tiếng Việt.

---

## 13. Checklist trước khi báo "xong"

- [ ] Không có `any`, không `@ts-ignore`, không `eslint-disable` (trừ trường hợp comment lý do).
- [ ] Mọi component < 200 dòng, mọi function < 50 dòng.
- [ ] Đã wrap lib bên thứ ba mới (nếu có).
- [ ] Server/Client component phân định đúng (`'use client'` ở mức thấp nhất cần thiết).
- [ ] Query key có factory, không hard-code string.
- [ ] Input từ client đã Zod-validate ở server.
- [ ] Không log/leak secret hay PII.
- [ ] Đã `npm run lint` pass.
- [ ] Đã `tsc --noEmit` pass (hoặc `next build` cho thay đổi lớn).
- [ ] Test cho code mới có pass.
- [ ] Import dùng path alias `@/...`, không relative dài (`../../../`).
- [ ] Không có file > 300 dòng chưa tách module.
- [ ] DESIGN.md được tôn trọng (màu, font, radius, spacing).

---

## 14. Anti-patterns — tuyệt đối KHÔNG

- ❌ `useEffect` + `fetch` thay cho TanStack Query.
- ❌ Sửa file trong `components/ui/` (Basuicn) thay vì tạo wrapper.
- ❌ Export `*` từ barrel file (`index.ts export *`) — chỉ export tường minh.
- ❌ Import sâu vào internal của feature khác (`features/chat/components/X` từ `features/auth/`).
- ❌ Truyền function qua props nhiều cấp (prop drilling > 2) thay vì lift state hoặc context.
- ❌ State global cho thứ chỉ dùng 1 nhánh component.
- ❌ Inline arrow function trong render khi component được memo (phá memo).
- ❌ Tự custom `Button`, `Input`, `Dialog`... khi Basuicn đã có.
- ❌ Tự cấu hình Tailwind tokens không đồng bộ với DESIGN.md.
- ❌ Đọc/ghi file ngoài `src/` và `public/` — phải hỏi user (theo RULE.md §quy tắc).
- ❌ Bịa API, prop, option khi không chắc — luôn đọc docs hoặc hỏi.
- ❌ Tạo `features/<x>/api/` (queries / mutations / keys riêng) — API + keys phải ở `src/services/`.
- ❌ Định nghĩa fetch logic trong feature (component, hook) — phải gọi qua `src/services/<scope>.api.ts`.
- ❌ Giữ "dead code" / `_VarKeepAlive` / `<span hidden>{x}</span>` "phòng tương lai" — xoá hẳn, cần thì git revert.

---

## 15. Khi nào dừng lại và hỏi user

- Cần thêm lib chưa có trong §1.
- Yêu cầu mâu thuẫn với rule trong file này.
- Cần đụng vào `app/api/` hoặc thay đổi schema DB (nếu có sau này).
- Cần đọc/sửa file ngoài `src/`, `public/`, `.claude/`.
- Thay đổi config bảo mật, CSP, env.
- Refactor > 5 file hoặc rename module.
- Cài/xóa package, sửa `package.json`.

---

## 16. Tài liệu tham khảo

- Next.js 16 docs: `node_modules/next/dist/docs/` (đọc local, không tra mạng — version-pinned)
- Basuicn: https://github.com/Basuicn/basuicn-core
- Basetech: https://basetech.io.vn/
- TanStack: https://tanstack.com/
- Zod: https://zod.dev/
- Tailwind v4: https://tailwindcss.com/

---

**Ghi nhớ:** Code này sẽ được đọc bởi đồng nghiệp 6 tháng sau, không phải bởi compiler. Viết cho con người. Tối ưu cho việc thay đổi, không cho việc viết một lần.
