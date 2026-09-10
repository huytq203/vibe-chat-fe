# Tab AI trong bảng bên của Ghi chú — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng mở bảng bên của một trang ghi chú, chọn tab "AI", và hỏi trợ lý về chính trang đó — AI đọc được nội dung thật qua công cụ, không phải đoán.

**Architecture:** Khung hội thoại AI hiện chỉ sống trong `features/chat`. Tách phần dùng chung sang `features/ai` (rule dự án: ≥2 feature dùng thì phải promote), **giữ nguyên** `AiSessionActions` làm cổng — `features/chat` vẫn dùng bản lưu `localStorage`, `features/notes` cắm vào một bản trong bộ nhớ theo từng trang. `useAiConversation` được tham số hoá đường truyền để tái dùng cho endpoint `/ai/notion/chat/stream`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict, TanStack Query v5, Zustand, Vitest + Testing Library.

**Spec:** `ai-service/docs/superpowers/specs/2026-09-08-notion-ai-design.md` (đường dẫn tuyệt đối: `/home/huytq/code/my/be/ai-service/docs/superpowers/specs/2026-09-08-notion-ai-design.md`)

**Phụ thuộc:** Backend P1/P1b/P2 đã xong — `POST /api/v1/ai/notion/chat/stream` có thật, phát SSE `delta` / `tool` / `done` / `error`. `src/services/ai.api.ts` đã đọc được sự kiện `tool` qua `onTool`.

## Global Constraints

Trích từ `.claude/CLAUDE.md` — mọi task đều chịu:

- **Cấm** `any`, `@ts-ignore`, `eslint-disable` (trừ khi có comment giải thích lý do).
- Component **< 200 dòng**, function **< 50 dòng**, file **< 300 dòng**, hook **< 80 dòng** — quá thì tách.
- Mọi UI hiển thị dữ liệu từ API phải xử lý đủ **4 trạng thái**: `loading / error / empty / data`.
- Mọi fetch client-side đi qua **TanStack Query**. **Cấm** `useEffect + fetch`.
- API transport ở `src/services/<scope>.api.ts`, query key ở `src/services/keys.ts`. **Cấm** tạo `features/<x>/api/`.
- Default = Server Component; `'use client'` đặt ở component **lá nhỏ nhất** cần tương tác.
- **Named export** bắt buộc (trừ Page/Layout của Next). `interface XxxProps` đặt ngay trên component.
- UI primitive lấy từ `@/components/ui/*` (Basuicn). **Không** tự viết Button/Input/Dialog.
- Feature giao tiếp **chỉ qua `index.ts`**, export tường minh, **cấm** `export *`.
- Import dùng alias `@/...`, không relative dài.
- Comment tiếng Việt, không comment bừa bãi.
- Tên test tiếng Việt theo mẫu `nên <kết quả> khi <điều kiện>`.
- **Không thêm thư viện mới** ngoài bảng tech stack — cần thì dừng và hỏi.
- Lệnh kiểm: `npx tsc --noEmit && npx eslint <đường dẫn> && npx vitest run <đường dẫn>`.
- Không commit; controller review diff.

## Quyết định thiết kế

**Q1 — Giữ `AiSessionActions` làm cổng, không viết lại `useAiConversation`.** Hook đó đã nhận `{ session, actions }` với `actions` là 6 method thuần. Cái cổng đã có sẵn; chỉ cần cắm vào một bản hiện thực thứ hai. Viết lại hook là bỏ đi phần khó nhất đã chạy đúng: xử lý huỷ giữa chừng, giữ phần chữ dở khi đứt mạng, đánh dấu `incomplete`.

**Q2 — Hội thoại của notes KHÔNG lưu `localStorage`.** Chat lưu lịch sử nhiều phiên vì đó là sản phẩm chính; hỏi đáp về một trang là việc dùng xong bỏ. Lưu thêm sẽ đội quota `localStorage` vốn đã phải né base64 đính kèm. Trạng thái sống trong React state, mất khi đóng bảng bên — đúng kỳ vọng.

**Q3 — Tham số hoá đường truyền, không phân nhánh `if (isNotes)` trong hook.** `useAiConversation` nhận thêm `stream` (mặc định `aiApi.chatStream`). Notes truyền `notionAiApi.chatStream` đã bind sẵn `workspaceId`/`pageId`.

**Q5 — Tab AI của ghi chú KHÔNG có đính kèm tệp (v1).** *(Bổ sung 2026-09-09 khi bắt đầu Task 5.)* `notionAiApi.chatStream` chỉ nhận `(messages, context, options)` — không có đường cho attachment. Nếu vẫn hiện nút kẹp giấy thì người dùng chọn tệp xong tệp rơi vào hư không: một affordance hỏng, tệ hơn là không có. Vì vậy 4 prop đính kèm của `AiChatInput` (`attachments`, `attachmentError`, `onAddFiles`, `onRemoveAttachment`) đổi thành **tuỳ chọn**; thiếu chúng thì component ẩn luôn nút kẹp. `features/chat` vẫn truyền đủ nên hành vi ở đó không đổi. Cách này cũng tránh phải kéo `useAiAttachments` từ `features/chat` sang — đúng chiều phụ thuộc vừa dọn ở Task 2b.

**Q4 — Trạng thái công cụ là ephemeral, không vào lịch sử tin nhắn.** Sự kiện `tool` chỉ đổi dòng chữ đang hiện ("Đang đọc trang…"), không tạo message. Nó là tiến trình, không phải nội dung; lưu vào lịch sử sẽ làm nhiễu lượt gửi sau.

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `src/features/ai/hooks/useAiConversation.ts` | *(chuyển từ chat)* một lượt hỏi–đáp, đã tham số hoá đường truyền |
| `src/features/ai/components/*` | *(chuyển từ chat)* AiMessageList / Row / Content / Input / AttachmentTray |
| `src/features/ai/types.ts` | `AiMessage`, `AiSession`, `AiSessionActions`, `AiStreamFn` |
| `src/features/ai/index.ts` | barrel export tường minh |
| `src/services/notion-ai.api.ts` | transport `/api/v1/ai/notion/chat/stream` |
| `src/features/notes/hooks/useNoteAiSession.ts` | `AiSessionActions` trong bộ nhớ, theo từng trang |
| `src/features/notes/components/panel/AiTab.tsx` | ráp khung hội thoại vào bảng bên |
| `src/features/notes/stores/notes-ui.store.ts` | thêm `'ai'` vào `SidePanelTab` |
| `src/features/notes/components/panel/SidePanel.tsx` | thêm tab thứ tư |

---

### Task 1: Tách `features/ai`

**Files:**
- Create: `src/features/ai/types.ts`
- Create: `src/features/ai/index.ts`
- Move: `src/features/chat/hooks/useAiConversation.ts` → `src/features/ai/hooks/useAiConversation.ts`
- Move: `src/features/chat/components/layout/{AiMessageList,AiMessageRow,AiMessageContent,AiChatInput,AiAttachmentTray}.tsx` → `src/features/ai/components/`
- Modify: mọi file trong `features/chat` đang import các thứ trên
- Test: các file test đi kèm chuyển theo

**Interfaces:**
- Produces: `features/ai/index.ts` export tường minh `useAiConversation`, `AiMessageList`, `AiChatInput`, và các type `AiMessage`, `AiSession`, `AiSessionActions`. Task 3–6 nhập từ đây.

**Không chuyển** (thuần chat, notes không dùng): `useAiSessions`, `useAiSessionGroups`, `AiSessionList`, `AiSessionItem`, `AiHistoryPanel`, `AiChatHeader`, `AiChatWindow`, `AiChatPage`, `AiChatMain`, `AiWelcome`. `AiMessageActions` cũng ở lại chat — resend/regenerate/recall gắn với lịch sử phiên.

`AiSession`/`AiSessionActions`/`AiMessage` đang khai trong `useAiSessions.ts`; chuyển **định nghĩa type** sang `features/ai/types.ts` rồi cho `useAiSessions.ts` nhập lại và re-export, để `features/chat` không phải sửa lan man.

- [ ] **Step 1: Chạy test hiện có, ghi lại mốc**

Run: `npx vitest run src/features/chat`
Expected: PASS. Ghi số test — cuối task phải bằng đúng số này.

- [ ] **Step 2: Dựng `features/ai/types.ts`**

```ts
export type AiMessageStatus = 'failed' | 'incomplete';

export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  data?: string;
};

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
  status?: AiMessageStatus;
  errorMessage?: string;
};

export type AiSession = { id: string; title: string; messages: AiMessage[]; updatedAt: number };

/** Thao tác ghi lên một phiên — truyền nguyên cụm xuống khung hội thoại. */
export type AiSessionActions = {
  createSession: () => string;
  pushMessage: (sessionId: string, message: AiMessage) => void;
  dropLastAssistant: (sessionId: string) => AiMessage[];
  markLastUserFailed: (sessionId: string, reason: string) => void;
  prepareResend: (sessionId: string, index: number) => AiMessage[];
  removeMessage: (sessionId: string, index: number) => AiMessage | null;
};
```

Đọc `useAiSessions.ts` để chép **đúng** hình dạng thật của `AiMessage`/`AiAttachmentMeta` đang dùng, đừng dựa vào đoạn trên nếu nó lệch.

- [ ] **Step 3: Di chuyển file bằng `git mv`, giữ lịch sử**

```bash
mkdir -p src/features/ai/hooks src/features/ai/components
git mv src/features/chat/hooks/useAiConversation.ts src/features/ai/hooks/
git mv src/features/chat/components/layout/AiMessageList.tsx src/features/ai/components/
git mv src/features/chat/components/layout/AiMessageRow.tsx src/features/ai/components/
git mv src/features/chat/components/layout/AiMessageContent.tsx src/features/ai/components/
git mv src/features/chat/components/layout/AiChatInput.tsx src/features/ai/components/
git mv src/features/chat/components/layout/AiAttachmentTray.tsx src/features/ai/components/
```

Test đi kèm (nếu có) chuyển theo cùng lượt.

- [ ] **Step 4: `features/ai/index.ts` — export tường minh, cấm `export *`**

```ts
export { useAiConversation } from './hooks/useAiConversation';
export { AiMessageList } from './components/AiMessageList';
export { AiChatInput } from './components/AiChatInput';
export type { AiMessage, AiSession, AiSessionActions, AiAttachmentMeta } from './types';
```

- [ ] **Step 5: Sửa import trong `features/chat`**

Tìm hết chỗ gãy rồi sửa sang `@/features/ai`:

```bash
npx tsc --noEmit 2>&1 | grep "features/chat" | head -30
```

`useAiSessions.ts` nhập type từ `@/features/ai` và re-export để phần còn lại của chat không phải đổi.

- [ ] **Step 6: Chạy lại test**

Run: `npx tsc --noEmit && npx eslint src/features/ai src/features/chat && npx vitest run src/features/chat src/features/ai`
Expected: PASS, **đúng bằng số test ở Step 1**. Task này không đổi hành vi — số test đổi nghĩa là đã làm rơi mất thứ gì đó.

---

### Task 2: Tham số hoá đường truyền của `useAiConversation`

**Files:**
- Modify: `src/features/ai/hooks/useAiConversation.ts`
- Modify: `src/features/ai/types.ts`
- Test: `src/features/ai/hooks/useAiConversation.test.tsx`

**Interfaces:**
- Consumes: `AiMessage` từ Task 1.
- Produces:
  ```ts
  export type AiStreamFn = (
    messages: AiMessage[],
    attachments: readonly AiAttachmentMeta[] | undefined,
    options: { onDelta: (text: string) => void; onTool?: (name: string) => void; signal?: AbortSignal },
  ) => Promise<string>;
  ```
  `UseAiConversationOptions` thêm `stream?: AiStreamFn` và `onTool?: (name: string) => void`. Task 5 truyền vào.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên dùng hàm stream được truyền vào thay vì aiApi mặc định khi có tham số stream', async () => {
  const stream = vi.fn().mockResolvedValue('Xong');
  // … render hook với { stream } rồi gọi send …
  expect(stream).toHaveBeenCalled();
});

it('nên chuyển tiếp tên công cụ qua onTool khi đường truyền phát sự kiện tool', async () => {
  const stream: AiStreamFn = async (_m, _a, { onDelta, onTool }) => {
    onTool?.('read_page');
    onDelta('xong');
    return 'xong';
  };
  const onTool = vi.fn();
  // … render hook với { stream, onTool } rồi gọi send …
  expect(onTool).toHaveBeenCalledWith('read_page');
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npx vitest run src/features/ai/hooks/useAiConversation.test.tsx`
Expected: FAIL — hook chưa nhận `stream`.

- [ ] **Step 3: Thêm tham số, mặc định giữ nguyên hành vi cũ**

```ts
interface UseAiConversationOptions {
  session: AiSession | null;
  actions: AiSessionActions;
  onSettled: () => void;
  /** Mặc định là endpoint chat chung; notes truyền bản đã bind workspace/page. */
  stream?: AiStreamFn;
  /** Model đang chạy công cụ — dùng để đổi dòng trạng thái, không vào lịch sử. */
  onTool?: (name: string) => void;
}
```

Trong `run()`, thay lời gọi cứng bằng tham số:

```ts
const send = stream ?? aiApi.chatStream;
const content = await send(
  history,
  history[history.length - 1]?.attachments,
  {
    signal: controller.signal,
    onDelta: (text) => { draftRef.current += text; scheduleFlush(); },
    onTool,
  },
);
```

**Không** đổi phần xử lý lỗi/huỷ phía dưới — đó là phần đã chạy đúng, chạm vào là rủi ro thuần.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/features/ai src/features/chat`
Expected: PASS. `features/chat` không truyền `stream` nên phải chạy y như cũ.

---

### Task 2b: Đảo chiều phụ thuộc `ai` → `chat`

*(Bổ sung 2026-09-09 sau review Task 1. Task 1 chuyển file nhưng không chuyển thứ chúng phụ thuộc, để lại vòng `chat → ai → chat`.)*

**Files:**
- Modify: `src/features/ai/types.ts`, `src/features/ai/index.ts`
- Move: `chat/types/ai-attachment.ts` → định nghĩa `AiAttachment` sang `features/ai/types.ts`
- Move: `chat/components/common/TypingDots.tsx` → `components/common/`
- Move: `AiCopyButton`, `AiAssistantActions`, `AiFailedActions`, `AiIncompleteActions` → xem bảng dưới
- Modify: `src/features/ai/components/AiMessageContent.tsx` — nhận `renderText?`
- Modify: `src/features/chat/index.ts` và mọi chỗ import bị ảnh hưởng

**Vấn đề:** `features/ai` — module *dùng chung* — đang import 6 chỗ từ `@/features/chat` là *một consumer cụ thể*. Hệ quả: vòng lặp module ở tầng barrel (dễ ra `undefined` lúc khởi tạo, chỉ nổ khi chạy), và Task 5 sẽ khiến `features/notes` kéo theo cả `features/chat` dù tab AI trong ghi chú không liên quan gì tới chat.

Test không bắt được: import qua barrel hợp lệ về kiểu nên `tsc` sạch và test vẫn xanh.

| Thứ | Đi đâu | Lý do |
|---|---|---|
| `AiAttachment` (type) | `features/ai/types.ts`; `chat` nhập lại + re-export | Là hình dạng đính kèm của AI |
| `TypingDots` | `components/common/` | UI thuần, không thuộc domain nào |
| `AiCopyButton` | `components/common/` | Nút copy generic |
| `AiAssistantActions`, `AiFailedActions`, `AiIncompleteActions` | `features/ai/components/` | Hành động trên tin nhắn **AI** |
| `linkifyBotCommands` | **giữ nguyên ở `chat`** | Lệnh bot là khái niệm của chat; ghi chú không có |

Chỗ cuối là điểm cần suy nghĩ: ba dòng trên chỉ là chuyển vị trí, còn đây là **đảo chiều phụ thuộc**. `AiMessageContent` nhận thêm prop tuỳ chọn; `chat` truyền hàm vào, `notes` không truyền:

```ts
interface AiMessageContentProps {
  // …các prop hiện có…
  /** Cho phép consumer bọc thêm cách hiển thị chữ. Chat truyền `linkifyBotCommands`;
   *  ghi chú không có khái niệm lệnh bot nên bỏ trống. */
  renderText?: (text: string) => ReactNode;
}
```

- [ ] **Step 1: Liệt kê chính xác các phụ thuộc còn lại**

```bash
grep -rn "@/features/chat" src/features/ai/
```

Sau task này lệnh trên phải **không ra kết quả nào**. Đó là tiêu chí nghiệm thu chính.

- [ ] **Step 2: Ghi mốc test trước khi sửa**

Run: `npx vitest run` — ghi lại số test. Đây là refactor thuần, cuối task phải **bằng đúng** con số đó.

- [ ] **Step 3: Chuyển từng thứ theo bảng, dùng `git mv`**

`chat` nhập lại và re-export những gì nó vẫn export ra ngoài, để phần còn lại của `chat` và các feature khác không phải sửa lan man.

- [ ] **Step 4: `AiMessageContent` nhận `renderText?`**

Mặc định (không truyền) là hiển thị chữ nguyên bản. `chat` truyền `linkifyBotCommands` để giữ nguyên hành vi hiện tại — kiểm bằng test sẵn có của `AiMessageContent`.

- [ ] **Step 5: Kiểm lại**

```bash
grep -rn "@/features/chat" src/features/ai/    # phải rỗng
npx tsc --noEmit && npx eslint src/features/ai src/features/chat src/components/common
npx vitest run                                  # bằng đúng mốc Step 2
```

---

### Task 3: Transport `notion-ai.api.ts`

**Files:**
- Create: `src/services/notion-ai.api.ts`
- Test: `src/services/notion-ai.api.test.ts`

**Interfaces:**
- Consumes: `apiClient.postStream`, `readSseEvents` — xem `src/services/ai.api.ts` làm mẫu.
- Produces:
  ```ts
  export const notionAiApi = {
    chatStream: (
      messages: AiChatMessage[],
      context: { workspaceId: string; pageId?: string },
      options: { onDelta: (t: string) => void; onTool?: (n: string) => void; signal?: AbortSignal },
    ) => Promise<string>,
  };
  ```
  Task 5 dùng.

- [ ] **Step 1: Viết test đỏ**

```ts
it('nên gửi workspaceId và pageId trong body khi gọi hội thoại notion', async () => { /* … */ });
it('nên gọi onTool khi luồng SSE có event tool', async () => { /* … */ });
it('nên ném lỗi khi luồng đứt giữa chừng mà chưa có done', async () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npx vitest run src/services/notion-ai.api.test.ts` — Expected: FAIL, không tìm thấy module.

- [ ] **Step 3: Hiện thực**

Gọi `POST /api/v1/ai/chat/stream` → **không**, đường đúng là `/api/v1/ai/notion/chat/stream`. Body gồm `messages`, `workspaceId`, `pageId?`.

Backend bật `forbidNonWhitelisted`, nên **phải lược** field thừa của `AiMessage` (`attachments` dạng meta của UI, `status`, `errorMessage`) — chép đúng cách `buildBody` trong `ai.api.ts` đang làm, gửi dư field sẽ bị 400.

Đọc SSE giống `consume()` trong `ai.api.ts`: `delta` → `onDelta`, `tool` → `onTool`, `done` → trả nội dung, `error` → ném `ApiError`, đóng mà không có `done`/`error` → ném `AI_STREAM_INTERRUPTED`.

**Không** có nhánh lùi về endpoint JSON: `/ai/notion/chat` không stream thì cũng không có tool activity để hiện, mà endpoint stream chắc chắn tồn tại ở backend đã xong.

- [ ] **Step 4: Chạy test**

Run: `npx tsc --noEmit && npx vitest run src/services` — Expected: PASS.

---

### Task 4: `useNoteAiSession` — phiên trong bộ nhớ

**Files:**
- Create: `src/features/notes/hooks/useNoteAiSession.ts`
- Test: `src/features/notes/hooks/useNoteAiSession.test.tsx`

**Interfaces:**
- Consumes: `AiSession`, `AiSessionActions`, `AiMessage` từ `@/features/ai`.
- Produces: `useNoteAiSession(pageId: string): { session: AiSession; actions: AiSessionActions; reset: () => void }`. Task 5 dùng.

Hiện thực đúng 6 method của `AiSessionActions` trên React state (quyết định Q2 — không `localStorage`). Đọc `useAiSessions.ts` để chép **đúng ngữ nghĩa** từng method, nhất là `dropLastAssistant` và `prepareResend` trả về mảng message đã cắt.

Đổi `pageId` phải reset về phiên rỗng: hỏi đáp của trang này không được rớt sang trang khác.

Hook phải **< 80 dòng** — quá thì tách phần thao tác mảng ra `features/notes/lib/ai-session.ts` và test riêng.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên bắt đầu bằng phiên rỗng khi mở một trang', () => { /* … */ });
it('nên thêm tin nhắn vào phiên khi gọi pushMessage', () => { /* … */ });
it('nên xoá tin trợ lý cuối và trả về lịch sử còn lại khi gọi dropLastAssistant', () => { /* … */ });
it('nên đánh dấu tin người dùng cuối là thất bại khi gọi markLastUserFailed', () => { /* … */ });
it('nên reset phiên về rỗng khi đổi sang pageId khác', () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npx vitest run src/features/notes/hooks/useNoteAiSession.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Hiện thực + chạy lại**

Run: `npx tsc --noEmit && npx vitest run src/features/notes/hooks` — Expected: PASS.

---

### Task 5: `AiTab` — ráp khung hội thoại

**Files:**
- Create: `src/features/notes/components/panel/AiTab.tsx`
- Test: `src/features/notes/components/panel/test/AiTab.test.tsx`

**Interfaces:**
- Consumes: `useAiConversation`, `AiMessageList`, `AiChatInput` từ `@/features/ai`; `useNoteAiSession` (Task 4); `notionAiApi` (Task 3).
- Produces: `<AiTab pageId workspaceId />`. Task 6 gắn vào `SidePanel`.

**4 trạng thái bắt buộc:**

| Trạng thái | Hiển thị |
|---|---|
| empty | chưa có tin nhắn → gợi ý mở đầu ("Tóm tắt trang này", "Chuẩn hoá định dạng") |
| loading | đang chờ trả lời → dòng trạng thái; có `onTool` thì đổi thành nhãn công cụ |
| error | lượt thất bại → thông báo trong chính tin nhắn, kèm nút gửi lại có sẵn của khung |
| data | danh sách tin nhắn |

Nhãn công cụ (quyết định Q4 — ephemeral, không vào lịch sử):

```ts
const TOOL_LABELS: Record<string, string> = {
  search_pages: 'Đang tìm trang…',
  read_page: 'Đang đọc trang…',
  create_page: 'Đang tạo trang…',
  write_page_content: 'Đang ghi vào trang…',
};
```

Tên lạ thì lùi về "Đang xử lý…" — đừng hiện tên tool thô cho người dùng.

Bind đường truyền:

```ts
const stream = useCallback<AiStreamFn>(
  (messages, attachments, options) =>
    notionAiApi.chatStream(messages, { workspaceId, pageId }, options),
  [workspaceId, pageId],
);
```

Component phải **< 200 dòng**; quá thì tách phần dòng trạng thái ra component con.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên hiện gợi ý mở đầu khi chưa có tin nhắn nào', () => { /* … */ });
it('nên hiện "Đang đọc trang…" khi luồng phát công cụ read_page', async () => { /* … */ });
it('nên gửi pageId của trang đang mở khi người dùng đặt câu hỏi', async () => { /* … */ });
it('nên hiện thông báo lỗi khi lượt trả lời thất bại', async () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail → hiện thực → chạy lại**

Run: `npx tsc --noEmit && npx eslint src/features/notes && npx vitest run src/features/notes` — Expected: PASS.

---

### Task 6: Gắn tab thứ tư vào `SidePanel`

**Files:**
- Modify: `src/features/notes/stores/notes-ui.store.ts`
- Modify: `src/features/notes/components/panel/SidePanel.tsx`
- Test: `src/features/notes/components/panel/test/SidePanel.test.tsx`

**Interfaces:**
- Consumes: `<AiTab />` từ Task 5.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên hiện tab AI trong danh sách tab của bảng bên', () => { /* … */ });
it('nên hiện khung hội thoại AI khi chọn tab AI', () => { /* … */ });
it('nên hiện lời nhắc chọn trang khi mở tab AI mà chưa chọn trang nào', () => { /* … */ });
```

- [ ] **Step 2: Mở rộng store**

```ts
export type SidePanelTab = 'comments' | 'versions' | 'share' | 'ai';
```

**Cạm bẫy:** store dùng `persist` với key `halo-notes-ui`. Người dùng cũ đã có `sidePanelTab` lưu sẵn nên không bị ảnh hưởng, nhưng nếu sau này xoá một tab thì giá trị cũ trong `localStorage` sẽ thành không hợp lệ. `isSidePanelTab()` trong `SidePanel.tsx` là chốt chặn — phải cập nhật nó cùng lúc, đừng chỉ sửa type.

- [ ] **Step 3: Thêm tab vào `SidePanel`**

Cập nhật **đủ bốn** chỗ, thiếu một là vỡ:

1. mảng `tabs` — nhãn `'AI'`
2. `isSidePanelTab()` — thêm `value === 'ai'`
3. `emptyTitleByTab` — `ai: 'Chọn một trang để hỏi AI'`
4. `emptyIconByTab` — icon từ `lucide-react` (`Sparkles`), cùng bộ nét với 3 icon hiện có
5. `PanelContent` — nhánh `if (tab === 'ai')`; cần cả `pageId` lẫn `workspaceId`, thiếu `workspaceId` thì trả `EmptyState` như nhánh `share` đang làm

- [ ] **Step 4: Chạy toàn bộ**

Run: `npx tsc --noEmit && npx eslint src/features/notes src/features/ai src/services && npx vitest run`
Expected: PASS toàn bộ suite của repo.
