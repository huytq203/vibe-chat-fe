# AI Chat Popup Window — Design Spec

**Date:** 2026-07-11
**Scope:** `src/features/chat/components/layout/AiChatPanel.tsx` → `AiChatWindow.tsx`, `src/features/chat/stores/`, `ChatLayout.tsx`, `NavSidebar.tsx`, `useSectionNav.ts`, `chat-ui.store.ts`, `MessageInput.tsx`

---

## Mục tiêu

Hiện tại bấm nút AI trong ô nhập tin nhắn (`MessageInput` → `onAiClick`) gọi `setActiveSection('ai')`, khiến `AiChatPanel` **thay thế** `ConversationList` trong cột sidebar trái (docked, 300px). Điều này che mất danh sách hội thoại.

Đổi sang: bấm nút AI mở một **cửa sổ popup nổi, kéo thả được** (giống `CallWindow` của tính năng gọi điện) — `ConversationList` luôn hiển thị, popup AI nổi đè lên trên.

**Không đổi:** trang `/ai` riêng (`AiChatPage`, có `AiSessionList` + `AiChatMain`) — vẫn giữ nguyên hành vi cũ.

---

## 1. Store mới: `ai-window.store.ts`

**File:** `src/features/chat/stores/ai-window.store.ts`

State tối giản — không cần `mode` (mini/fullscreen) vì popup có **1 kích thước cố định**, chỉ kéo thả + đóng:

```ts
type AiWindowState = {
  isOpen: boolean;
  x: number;
  y: number;
  open: () => void;
  close: () => void;
  setPosition: (x: number, y: number) => void;
};
```

Mặc định `isOpen: false`, `x: 0, y: 0` (vị trí `(0,0)` là offset tương đối so với neo mặc định `bottom-6 right-6`, giống cơ chế `CallWindow`/`call.store.ts`).

Không persist vào localStorage (giống `call.store` — reset khi reload, chấp nhận được).

---

## 2. Component `AiChatWindow.tsx` (thay `AiChatPanel.tsx`)

**File:** `src/features/chat/components/layout/AiChatWindow.tsx` (xoá `AiChatPanel.tsx`)

Giữ nguyên **toàn bộ logic nghiệp vụ** hiện có trong `AiChatPanel`:
- `useAiSessions()` (không routed — local sessions, giống hiện tại)
- `useAiAttachments()`, `useAutoResizeTextarea()`
- `handleSend`, `handleNewChat`, toggle `AiHistoryPanel` ↔ `AiMessageList`/`AiChatInput`

**Đổi phần khung bọc ngoài:**
- `<aside>` docked (`w-[300px]`, `border-r`) → card nổi `fixed`, kích thước cố định (~`w-[360px] h-[520px]`), bo góc + shadow giống `CallWindow` (`rounded-2xl border shadow-2xl bg-popover`).
- Bọc bằng `<Draggable>` (react-draggable, đã là dependency dùng trong `CallWindow`) với `handle=".ai-drag-handle"` trên vùng header, `cancel=".no-drag"` cho vùng nút bấm, `bounds="body"`, `position={{x, y}}` đọc từ store, `onStop` → `setPosition`.
- Render qua `createPortal(..., document.body)`, `return null` khi `!isOpen`.

**Header:** bỏ nút "quay lại" (ArrowLeft/`setActiveSection('chat')`) vì không còn khái niệm thay sidebar. Giữ:
- Icon Bot + tiêu đề "Halo AI" (vùng kéo thả — `ai-drag-handle`)
- Nút "Tạo hội thoại mới" (Plus)
- Nút toggle lịch sử (Clock)
- Nút đóng popup (X) → gọi `close()` từ `ai-window.store` (thay vì ẩn hẳn — đóng đơn giản reset `isOpen: false`; sessions vẫn còn trong `useAiSessions`, mở lại popup vẫn thấy lịch sử)

Body/footer giữ nguyên: `AiHistoryPanel` khi `showHistory`, ngược lại `AiMessageList` + `AiChatInput`.

---

## 3. `ChatLayout.tsx`

- Bỏ nhánh rẽ nhánh `leftPanel = activeSection === 'ai' ? <AiChatPanel/> : <ConversationList/>` → `leftPanel` luôn là `<ConversationList />`.
- Thêm `<AiChatWindow />` cạnh `<CallContainer />` ở các nhánh render: mobile, nhánh mặc định (chat), `tasks`, `store`.
- **Không** thêm vào nhánh `activeSection === 'ai-full'` (trang `/ai` riêng) — tránh 2 UI AI hiển thị cùng lúc.

---

## 4. Dọn `NavSection` — bỏ giá trị `'ai'`

`'ai'` trong `NavSection` (`chat-ui.store.ts`) trước đây đại diện cho panel docked; nay không còn dùng nữa (popup không cần đổi section).

- `chat-ui.store.ts`: `NavSection = 'chat' | 'ai-full' | 'tasks' | 'store'` (bỏ `'ai'`).
- `useSectionNav.ts`: bỏ nhánh `if (section === 'ai') { setActiveSection('ai'); router.push('/chat'); return; }` và điều kiện `storeSection === 'ai' ? 'ai' : 'chat'` trong tính `activeSection` (rút gọn về `'chat'`).
- `NavSidebar.tsx`: bỏ so sánh `activeSection === 'ai'` trong `isActive` của mục "Chat" (chỉ còn `activeSection === 'chat'`).

---

## 5. `MessageInput.tsx`

Đổi:
```ts
onAiClick={() => setActiveSection('ai')}
```
thành mở popup qua store mới:
```ts
onAiClick={() => useAiWindowStore.getState().open()}
```

(Dùng `getState().open()` trực tiếp — tránh subscribe lại toàn component chỉ để gọi 1 action, theo đúng pattern `CallButtons`/`useCallStore.getState()` đã dùng trong codebase.)

---

## Không thay đổi

- `AiChatPage.tsx`, `AiChatMain.tsx`, `AiSessionList.tsx` (trang `/ai` riêng) — giữ nguyên 100%.
- `AiHistoryPanel.tsx`, `AiMessageList.tsx`, `AiChatInput.tsx`, `AiAttachmentTray.tsx` — tái sử dụng nguyên trạng, không sửa nội dung bên trong.
- `useAiSessions`, `useAiAttachments`, `useAutoResizeTextarea`, `callGemini` — không đổi logic.

---

## Quyết định thiết kế

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Docked panel vs popup | Popup nổi, kéo thả (react-draggable) | User yêu cầu — giống cửa sổ gọi điện, không che sidebar |
| Chế độ cửa sổ | 1 kích thước cố định, không mini/fullscreen | User chọn phương án đơn giản nhất |
| Persist khi đổi section | Portal toàn cục như `CallContainer`, giữ trạng thái | User chọn — nổi xuyên suốt mọi section |
| Trang `/ai` riêng | Giữ nguyên, không đổi | User xác nhận ngoài phạm vi |
| Store vị trí popup | Store riêng `ai-window.store.ts`, không gộp vào `chat-ui.store` | Tách bounded context, theo đúng pattern `call.store.ts` tách riêng khỏi state UI chat chung |
| `NavSection['ai']` | Xoá bỏ | Không còn nơi nào dùng sau khi bỏ docked panel |
