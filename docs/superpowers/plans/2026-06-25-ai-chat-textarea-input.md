# AI Chat Textarea Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế `<Input>` một dòng trong `AiChatMain` bằng `<Textarea>` tự động co dãn (max 4 dòng), luôn focus, Enter gửi / Shift+Enter xuống dòng, nút gửi không disable khi AI đang phản hồi.

**Architecture:** Tách toàn bộ DOM behavior (auto-resize, focus, keydown) vào hook `useAutoResizeTextarea`. `AiChatMain` chỉ gọi hook và render `<Textarea>` từ Basuicn với các props phù hợp. Guard `if (loading) return` trong `handleSend()` chặn gửi khi AI đang phản hồi mà không disable button.

**Tech Stack:** React 19, TypeScript strict, `<Textarea>` từ `@/components/ui/textarea/Textarea`, Tailwind v4.

## Global Constraints

- Không dùng `any`, không `@ts-ignore`.
- Không tự viết textarea HTML thô — phải dùng `<Textarea>` từ `src/components/ui/textarea/Textarea.tsx`.
- Không sửa file trong `src/components/ui/`.
- Hook < 80 dòng, component < 200 dòng.
- Merge về `main` sau khi hoàn thành.

---

## File Map

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/features/chat/hooks/useAutoResizeTextarea.ts` | **Tạo mới** | Hook quản lý resize, focus, keydown |
| `src/features/chat/components/layout/AiChatMain.tsx` | **Sửa** | Thay Input → Textarea, dùng hook, sửa disabled logic |

---

### Task 1: Hook `useAutoResizeTextarea`

**Files:**
- Create: `src/features/chat/hooks/useAutoResizeTextarea.ts`

**Interfaces:**
- Produces:
  ```ts
  function useAutoResizeTextarea(): {
    ref: React.RefObject<HTMLTextAreaElement>;
    resize: () => void;
    focusInput: () => void;
    handleKeyDown: (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      onSend: () => void,
      isLocked: boolean
    ) => void;
  }
  ```

- [ ] **Step 1: Tạo file hook với nội dung hoàn chỉnh**

Tạo `src/features/chat/hooks/useAutoResizeTextarea.ts`:

```ts
'use client';

import { useCallback, useRef } from 'react';

export function useAutoResizeTextarea() {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const focusInput = useCallback(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      onSend: () => void,
      isLocked: boolean,
    ) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLocked) onSend();
      }
    },
    [],
  );

  return { ref, resize, focusInput, handleKeyDown };
}
```

- [ ] **Step 2: Kiểm tra TypeScript không lỗi**

```bash
npx tsc --noEmit 2>&1 | grep useAutoResizeTextarea
```

Expected: không có output (không lỗi).

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/hooks/useAutoResizeTextarea.ts
git commit -m "feat(ai-chat): hook useAutoResizeTextarea — resize, focus, keydown"
```

---

### Task 2: Cập nhật AiChatMain + AiChatPanel

**Files:**
- Modify: `src/features/chat/components/layout/AiChatMain.tsx`
- Modify: `src/features/chat/components/layout/AiChatPanel.tsx`

**Interfaces:**
- Consumes:
  ```ts
  import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
  import { Textarea } from '@/components/ui/textarea/Textarea';
  // ref, resize, focusInput, handleKeyDown từ useAutoResizeTextarea()
  ```

- [ ] **Step 1: Thêm imports**

Trong `AiChatMain.tsx`, thay dòng import `Input`:
```ts
// Xoá:
import { Input } from '@/components/ui/input/Input';

// Thêm:
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
```

- [ ] **Step 2: Gọi hook trong component**

Trong body `AiChatMain`, thêm sau các `useRef` / `useState` hiện tại:

```ts
const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } = useAutoResizeTextarea();
```

- [ ] **Step 3: Thêm useEffect tự resize khi input thay đổi**

Cần thiết để textarea thu lại về 1 dòng sau khi gửi (`setInput('')` không trigger `onChange`).
Thêm ngay sau các `useEffect` hiện tại:

```ts
useEffect(() => {
  resize();
}, [input, resize]);
```

- [ ] **Step 4: Refocus khi session thay đổi**

Thêm tiếp ngay sau `useEffect` vừa thêm ở Step 3:

```ts
useEffect(() => {
  focusInput();
}, [session?.id, focusInput]);
```

- [ ] **Step 5: Cập nhật handleSend — thêm guard loading + refocus**

Tìm hàm `handleSend` và cập nhật thành:

```ts
async function handleSend() {
  const trimmed = input.trim();
  if (!trimmed || loading || !session) return;
  const userMsg: AiMessage = { role: 'user', content: trimmed };
  onPushMessage(session.id, userMsg);
  setInput('');
  setLoading(true);
  setError(null);
  try {
    const content = await callGemini(settings.model, [...session.messages, userMsg]);
    onPushMessage(session.id, { role: 'assistant', content });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
  } finally {
    setLoading(false);
    focusInput();
  }
}
```

- [ ] **Step 6: Xoá handleKeyDown cũ**

Xoá hàm `handleKeyDown` dành cho `<HTMLInputElement>` (đang dùng cho Input cũ):

```ts
// Xoá toàn bộ hàm này:
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void handleSend();
  }
}
```

- [ ] **Step 7: Thay `<Input>` bằng `<Textarea>`**

Tìm phần render input ở cuối component (trong `<div className="shrink-0 border-t ...`), thay toàn bộ `<Input ... />` bằng:

```tsx
<Textarea
  ref={textareaRef}
  variant="filled"
  rows={1}
  className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
  placeholder="Nhắn tin với AI..."
  value={input}
  onChange={(e) => {
    setInput(e.target.value);
    resize();
  }}
  onKeyDown={(e) => handleTextareaKeyDown(e, () => void handleSend(), loading)}
  disabled={!session}
/>
```

- [ ] **Step 8: Cập nhật Send button — bỏ `disabled={loading}`**

Tìm `<Button ... disabled={...loading...}>` và cập nhật:

```tsx
<Button
  size="icon"
  variant="solid"
  onClick={() => void handleSend()}
  disabled={!input.trim() || !session}
  className="h-9 w-9 shrink-0"
  aria-label="Gửi"
>
  <Send className="h-4 w-4" />
</Button>
```

- [ ] **Step 9: Cập nhật layout wrapper — dùng `items-end` thay `items-center`**

Textarea thay đổi chiều cao nên cần align bottom. Tìm:

```tsx
<div className="flex items-center gap-2">
```

Thay thành:

```tsx
<div className="flex items-end gap-2">
```

- [ ] **Step 10: Kiểm tra TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep AiChatMain
```

Expected: không có output.

- [ ] **Step 11: Cập nhật AiChatPanel — bỏ toàn bộ settings, thay Input → Textarea**

`AiChatPanel` hiện có settings panel (API Key + Provider + Model + Save button). Bỏ toàn bộ, chỉ giữ chat interface.

Xoá khỏi file:
- Type `AiSettings`, constant `DEFAULT_SETTINGS`, `PROVIDER_OPTIONS`, `MODEL_OPTIONS`
- Functions `loadSettings()`, `saveSettings()`
- State: `settingsOpen`, `settings`, `draftSettings`
- Handler `handleSaveSettings()`
- Import: `Settings2`, `ComboBox`
- Trong `handleSend`: bỏ check `if (!settings.apiKey)`, bỏ `apiKey`/`provider`/`model` khỏi request body — chỉ gửi `{ messages: nextMessages }`
- JSX: bỏ Settings button trong header, bỏ toàn bộ `{settingsOpen && ...}` panel

Thay `<Input>` input area bằng Textarea + hook (giống AiChatMain):

```tsx
// Thêm import
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';

// Trong component body, thêm sau các useRef/useState:
const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } = useAutoResizeTextarea();

// useEffect resize khi input thay đổi
useEffect(() => {
  resize();
}, [input, resize]);

// useEffect refocus sau lần mount
useEffect(() => {
  focusInput();
}, [focusInput]);

// Trong handleSend, thêm guard + refocus:
async function handleSend() {
  const trimmed = input.trim();
  if (!trimmed || loading) return;
  const userMessage: ChatMessage = { role: 'user', content: trimmed };
  const nextMessages = [...messages, userMessage];
  setMessages(nextMessages);
  setInput('');
  setLoading(true);
  setError(null);
  try {
    const response = await apiClient.post<{ content: string }>('/ai-chat/message', {
      body: { messages: nextMessages },
    });
    setMessages((prev) => [...prev, { role: 'assistant', content: response.content }]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gửi tin nhắn thất bại';
    setError(message);
  } finally {
    setLoading(false);
    focusInput();
  }
}

// Xoá handleKeyDown cũ (HTMLInputElement), thay bằng handleTextareaKeyDown từ hook

// Thay <Input> trong input area:
<Textarea
  ref={textareaRef}
  variant="filled"
  rows={1}
  className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
  placeholder="Nhắn tin với AI..."
  value={input}
  onChange={(e) => { setInput(e.target.value); resize(); }}
  onKeyDown={(e) => handleTextareaKeyDown(e, () => void handleSend(), loading)}
/>

// Send button: bỏ disabled={loading}
<Button
  size="icon"
  variant="solid"
  onClick={() => void handleSend()}
  disabled={!input.trim()}
  className="h-9 w-9 shrink-0"
  aria-label="Gửi"
>
  <Send className="h-4 w-4" />
</Button>

// Wrapper: items-center → items-end
<div className="flex items-end gap-2">
```

- [ ] **Step 12: Commit cả 2 file**

```bash
git add src/features/chat/components/layout/AiChatMain.tsx src/features/chat/components/layout/AiChatPanel.tsx
git commit -m "feat(ai-chat): textarea tự co dãn, luôn focus, Enter gửi / Shift+Enter xuống dòng; bỏ settings AiChatPanel"
```

---

### Task 3: Merge về main

> Đang làm việc trực tiếp trên `main` — không cần merge, chỉ cần verify và push nếu cần.

- [ ] **Step 1: Kiểm tra toàn bộ TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0, không có lỗi.

- [ ] **Step 2: Kiểm tra build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build thành công, không có lỗi liên quan đến `AiChatMain` hay `useAutoResizeTextarea`.

- [ ] **Step 3: Xác nhận commits**

```bash
git log --oneline -5
```

Expected: thấy 2 commit mới nhất là:
- `feat(ai-chat): textarea tự co dãn, luôn focus, Enter gửi / Shift+Enter xuống dòng`
- `feat(ai-chat): hook useAutoResizeTextarea — resize, focus, keydown`

- [ ] **Step 4: Xác nhận đang ở main**

```bash
git branch --show-current
```

Expected: `main`

> Đang trực tiếp trên `main` — tất cả commits đã ở đúng branch. Không cần thao tác merge thêm.
