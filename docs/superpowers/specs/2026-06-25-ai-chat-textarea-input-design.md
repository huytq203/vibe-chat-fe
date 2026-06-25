# AI Chat Textarea Input — Design Spec

**Date:** 2026-06-25
**Scope:** `src/features/chat/hooks/useAutoResizeTextarea.ts` + `src/features/chat/components/layout/AiChatMain.tsx`

---

## Mục tiêu

Thay thế `<Input>` một dòng hiện tại trong `AiChatMain` bằng `<Textarea>` tự động co dãn, hỗ trợ:
- Auto-resize từ 1 dòng lên tối đa 4 dòng, sau đó scroll bên trong
- Luôn focus vào ô nhập
- Enter gửi tin, Shift+Enter xuống dòng
- Nút gửi không bị disable khi AI đang phản hồi — chỉ block action

---

## 1. Hook `useAutoResizeTextarea`

**File:** `src/features/chat/hooks/useAutoResizeTextarea.ts`

**Trả về:**
```ts
{
  ref: RefObject<HTMLTextAreaElement>;
  resize: () => void;
  focusInput: () => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onSend: () => void,
    isLocked: boolean
  ) => void;
}
```

**Logic:**
- `resize()`: set `style.height = "auto"` rồi `style.height = scrollHeight + "px"`. CSS `max-h-[6rem]` trên textarea chặn ở ~4 dòng; khi vượt quá thì `overflow-y: auto` scroll bên trong.
- `focusInput()`: gọi `ref.current?.focus()`.
- `handleKeyDown(e, onSend, isLocked)`:
  - `Enter` (không có `Shift`) → `e.preventDefault()`; nếu `!isLocked` → `onSend()`
  - `Shift+Enter` → không làm gì, textarea tự xử lý xuống dòng

---

## 2. Thay đổi AiChatMain

**Thay `<Input>` bằng `<Textarea>`:**
```tsx
<Textarea
  ref={ref}
  variant="filled"
  rows={1}
  className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
  placeholder="Nhắn tin với AI..."
  value={input}
  onChange={(e) => { setInput(e.target.value); resize(); }}
  onKeyDown={(e) => handleKeyDown(e, handleSend, loading)}
  disabled={!session}
/>
```

- `disabled` chỉ khi `!session` (chưa chọn/tạo session), không disable khi `loading`

**Send button:**
```tsx
<Button
  size="icon"
  variant="solid"
  onClick={() => void handleSend()}
  disabled={!input.trim() || !session}
  aria-label="Gửi"
>
  <Send className="h-4 w-4" />
</Button>
```

- Bỏ `disabled={loading}` khỏi button
- Button vẫn disabled nếu input rỗng hoặc chưa có session

**handleSend() — thêm guard đầu hàm:**
```ts
async function handleSend() {
  const trimmed = input.trim();
  if (!trimmed || loading || !session) return; // loading: im lặng, không lỗi
  // ... phần còn lại giữ nguyên
}
```

**Refocus sau send và khi đổi session:**
```ts
// Refocus khi session thay đổi
useEffect(() => { focusInput(); }, [session?.id]);

// Trong handleSend(), sau finally:
focusInput();
```

---

## 3. Không thay đổi

- Logic gọi Gemini API giữ nguyên
- `useAiSessions`, `useAiSettings` không thay đổi
- Không tạo component mới — chỉ dùng `<Textarea>` từ `@/components/ui/textarea/Textarea`

---

## Quyết định thiết kế

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Auto-resize | Hook riêng, không inline | Tái sử dụng được; giữ component < 200 dòng |
| Block gửi khi loading | `if (loading) return` trong handler | Button luôn nhìn enabled theo yêu cầu |
| Max lines | 4 dòng (max-h ~6rem) | User chọn |
| Textarea component | `<Textarea>` từ Basuicn | Tuân thủ rule không tự viết UI |
