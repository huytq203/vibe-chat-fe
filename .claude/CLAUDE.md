# CLAUDE.md — Bản đồ điều hướng (vibe-chat frontend)

> **Điểm vào DUY NHẤT cho mọi AI/subagent.** Đọc file này trước, sau đó **chỉ mở đúng file** rule/pattern/template cần cho task — KHÔNG đọc tất cả, để tiết kiệm token.
>
> **Độ ưu tiên khi xung đột:** CLAUDE.md > `project-context/` > `rules/` > `patterns/` > `Workflow/` > `templates/` > `Design/` > training data.
>
> Trả lời **tiếng Việt**, ngắn gọn (giải thích ≤ 5 dòng).

---

## 0. Luật vàng — KHÔNG bao giờ vi phạm

1. Không `any`, không `@ts-ignore`, không `eslint-disable` (trừ khi có comment giải thích lý do).
2. Component **< 200 dòng**, function **< 50 dòng**, file **< 300 dòng**, hook **< 80 dòng** — quá thì tách.
3. Mọi UI hiển thị data từ API phải xử lý đủ **4 trạng thái**: `loading / error / empty / data` → [patterns/four-states.md](./patterns/four-states.md).
4. Mọi fetch client-side đi qua **TanStack Query** (`useQuery`/`useMutation`). CẤM `useEffect + fetch`.
5. API transport ở `src/services/<scope>.api.ts`, query keys ở `src/services/keys.ts`. **CẤM** tạo `features/<x>/api/`.
6. **Wrap** mọi lib bên thứ ba trong `src/lib/` — feature không import trực tiếp `axios`/`next-auth`/`localStorage`/...
7. Default = **Server Component**. `'use client'` đặt ở component **lá nhỏ nhất** cần tương tác.
8. Validate input từ client bằng **Zod** tại server boundary. KHÔNG secret ở client. KHÔNG tin client check.
9. **Đọc trước khi viết.** Không chắc API/path/option → **hỏi user, KHÔNG bịa**. Next.js 16 API: đọc `node_modules/next/dist/docs/`.
10. UI component dùng **Basuicn** (`npx basuicn add <name>`) — KHÔNG tự viết Button/Dialog/Input khi đã có; KHÔNG sửa tay file trong `components/ui/`.

---

## 1. ROUTER — cần gì, đọc file nào

| Bạn đang làm gì                         | Đọc file                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| Hiểu bối cảnh & mục tiêu dự án          | [project-context/CONTEXT.md](./project-context/CONTEXT.md)           |
| Quy tắc cốt lõi (tổng)                  | [rules/RULE.md](./rules/RULE.md)                                     |
| TypeScript & type safety                | [rules/01-typescript.md](./rules/01-typescript.md)                  |
| Viết component (Server/Client, props)   | [rules/02-components.md](./rules/02-components.md)                   |
| Styling, Tailwind v4, Basuicn           | [rules/03-styling.md](./rules/03-styling.md) + [Design/DESIGN.md](./Design/DESIGN.md) |
| State & data fetching (Query/Zustand)   | [rules/04-state-data.md](./rules/04-state-data.md)                  |
| Bảo mật                                 | [rules/05-security.md](./rules/05-security.md)                      |
| Đặt tên & cấu trúc thư mục              | [rules/06-naming-structure.md](./rules/06-naming-structure.md)      |
| Quy trình tổng thể Next.js 16           | [Workflow/WORKFLOW.md](./Workflow/WORKFLOW.md)                      |
| **Bắt đầu một loại task cụ thể**        | `steps/` → xem mục §3                                                |
| Pattern hay dùng (4 states, form, key…) | `patterns/` → xem mục §4                                             |
| Cần mẫu code copy nhanh                 | `templates/` → xem mục §5                                            |
| Giao việc cho subagent chuyên biệt      | `agents/` → xem mục §6                                               |

> **Quy tắc đọc tiết kiệm token:** xác định task → đọc 1 file `steps/` tương ứng → file đó sẽ trỏ tiếp các `rules/`, `patterns/`, `templates/` cần thiết. Không đọc lan man.

---

## 2. Tech stack (bắt buộc — chi tiết trong `rules/`)

| Domain        | Lib                              | Domain       | Lib                                |
| ------------- | -------------------------------- | ------------ | ---------------------------------- |
| Framework     | Next.js 16 App Router            | Server state | TanStack Query v5                  |
| Runtime       | React 19 + TS 5 strict           | Client state | Zustand (slice)                    |
| UI components | Basuicn (`@basuicn/*`)           | Forms        | React Hook Form + Zod              |
| Primitives    | `@base-ui/react`                 | Tables       | TanStack Table v8                  |
| Styling       | Tailwind v4 + tailwind-variants  | Date         | date-fns                           |
| Icons         | lucide-react                     | HTTP         | `fetch` wrap trong `lib/http`      |
| Test          | Vitest + Testing Library + Playwright | Auth/DB | NextAuth v5 / Prisma (wrap `lib/`) |

**Cấm:** moment, lodash full bundle, axios mặc định, styled-components, emotion, redux/redux-toolkit, react-query v4-.
**Thêm lib mới ngoài bảng này → DỪNG, hỏi user.**

---

## 3. `steps/` — checklist theo loại task

- [steps/new-feature.md](./steps/new-feature.md) — tạo feature module mới (chat, billing…).
- [steps/new-component.md](./steps/new-component.md) — thêm 1 component UI/business.
- [steps/add-api-query.md](./steps/add-api-query.md) — thêm endpoint + hook query/mutation.
- [steps/bugfix.md](./steps/bugfix.md) — quy trình sửa bug an toàn.
- [steps/refactor.md](./steps/refactor.md) — refactor không đổi hành vi.

## 4. `patterns/` — công thức tái sử dụng

- [patterns/four-states.md](./patterns/four-states.md) — loading/error/empty/data.
- [patterns/data-fetching.md](./patterns/data-fetching.md) — Server vs Client, Hydration.
- [patterns/forms-zod.md](./patterns/forms-zod.md) — RHF + Zod + Server Action.
- [patterns/query-keys.md](./patterns/query-keys.md) — key factory tập trung.
- [patterns/server-action.md](./patterns/server-action.md) — Result Object, revalidate.

## 5. `templates/` — mẫu code

- [templates/component.md](./templates/component.md) — Server & Client component.
- [templates/hook-query.md](./templates/hook-query.md) — `use-query.ts`.
- [templates/hook-mutation.md](./templates/hook-mutation.md) — `use-mutations.ts`.
- [templates/server-action.md](./templates/server-action.md) — server action chuẩn.
- [templates/zustand-store.md](./templates/zustand-store.md) — slice store.
- [templates/service-api.md](./templates/service-api.md) — `services/<scope>.api.ts`.
- [templates/test.md](./templates/test.md) — Vitest + Testing Library + MSW.

## 6. `agents/` — subagent chuyên biệt

- [agents/frontend-builder.md](./agents/frontend-builder.md) — build feature/component theo rule.
- [agents/ui-implementer.md](./agents/ui-implementer.md) — dựng UI theo DESIGN.md + Basuicn.
- [agents/code-reviewer.md](./agents/code-reviewer.md) — review theo checklist §13 RULE.

---

## 7. Khi nào DỪNG và hỏi user

Thêm lib chưa có trong §2 · yêu cầu mâu thuẫn rule · đụng `app/api/` hoặc DB schema · đọc/sửa file ngoài `src/`,`public/`,`.claude/` · đổi config bảo mật/CSP/env · refactor > 5 file hoặc rename module · cài/xoá package.

> **Ghi nhớ:** Code được đọc bởi đồng nghiệp 6 tháng sau **và bởi AI Agent**. Tối ưu cho việc thay đổi, không cho việc viết một lần.
