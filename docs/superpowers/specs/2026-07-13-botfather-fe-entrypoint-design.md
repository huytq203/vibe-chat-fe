# BotFather — Entry point vào chat từ Settings

**Date:** 2026-07-13
**Status:** Chờ user review
**Scope:** FE only (`vibe-chat-fe`)
**Bối cảnh:** `bot-service` vừa hoàn tất tính năng BotFather — bot hệ thống (`username: 'botfather'`) nhận slash-command (`/newbot`, `/mybots`, `/token`, `/revoke`, `/deletebot`) qua chat thật, thay cho việc tạo bot qua form trong Settings. Spec này amend spec cũ [`2026-07-12-botfather-integration-design.md`](./2026-07-12-botfather-integration-design.md): **chỉ thay đổi luồng tạo bot**, mọi phần khác của spec cũ (list bot, sửa, quản lý token, xoá bot) giữ nguyên không đổi.

---

## 1. Quyết định (đã chốt qua brainstorming)

| Câu hỏi | Quyết định |
|---|---|
| Quan hệ với luồng tạo bot cũ | Bỏ nút "Tạo bot mới" + `CreateBotDialog` khỏi Settings. Danh sách/sửa/quản lý token/xoá bot giữ nguyên — không liên quan tới việc TẠO bot. |
| Entry point thay thế | Nút "Chat với BotFather" tại đúng vị trí nút cũ — đóng Settings, mở/tạo DIRECT conversation với BotFather, chuyển sang màn hình chat. |
| Prefill nội dung soạn tin | Không điền gì — chỉ mở conversation, để trống ô nhập liệu. User tự gõ lệnh muốn dùng. |
| Backend mới cần thêm | Không — tái dùng nguyên `usersApi.search` + `chatApi.createDirect` đã có. |

---

## 2. Data flow

Hook mới `useOpenBotFatherChat()` (đặt cạnh các hook bot-demo hiện có trong `src/features/bots/hooks/use-mutations.ts`):

1. `usersApi.search({ q: '@botfather', limit: 5 })` — prefix `@` buộc backend match CHÍNH XÁC theo username (đã có comment ở `users.api.ts`), không phải prefix-search mờ.
2. Lọc phòng thủ `items.find((u) => u.username === 'botfather')` trước khi tin — không lấy đại `items[0]`.
3. Không tìm thấy → throw lỗi curated → `onError` toast `"Không tìm thấy BotFather, thử lại sau"`. Settings **không đóng**, không điều hướng.
4. Tìm thấy → `chatApi.createDirect(id)` (đúng call `ConversationDock`/`useOpenDirectConversation` đang dùng) → invalidate `chatKeys.conversationLists()`, `setSelected(conv.id)`, `setMobilePanel('chat')` (khớp hành vi `ConversationDock.handleMessageUser`), rồi gọi `onClose` (đóng Settings).

Không endpoint mới, không `services/<scope>/api` mới (rule 5) — chỉ tái dùng `usersApi`, `chatApi` đã có.

## 3. Components affected

- **`SettingsModal.tsx`**: `TabDef.Component` đổi type thành `ComponentType<{ onClose?: () => void }>`; render `<ActiveTab onClose={() => onOpenChange(false)} />`. Các tab khác (0 prop) vẫn assignable — TS cho phép component nhận ít param hơn type yêu cầu.
- **`BotsTab.tsx`**: bỏ state `createOpen`, bỏ `<CreateBotDialog />`, bỏ 2 nút "Tạo bot mới" (empty-state + list-footer) → thay bằng 1 nút "Chat với BotFather" (icon `MessageCircle`) gọi `useOpenBotFatherChat()`; nhận prop `{ onClose }`; sửa dòng mô tả section (bỏ "giống BotFather bên Telegram" — giờ dẫn thẳng tới BotFather thật).

## 4. Cleanup — xoá code chết

Sau khi bỏ call site trong `BotsTab`, các phần sau không còn ai dùng (đã grep xác nhận, chỉ có test riêng của chúng tham chiếu):
- `CreateBotDialog.tsx` + `CreateBotDialog.test.tsx` — xoá.
- `useCreateBot()` trong `use-mutations.ts` + test coverage tương ứng trong `use-mutations.test.ts` — xoá.

`createBotSchema` **giữ nguyên** — `updateBotSchema = createBotSchema.partial()` còn phụ thuộc cấu trúc của nó cho `EditBotDialog`.

## 5. Error handling

- Không tìm thấy BotFather (race lúc bot-service chưa provision xong, hoặc chưa seed): toast lỗi, không đổi trạng thái Settings/conversation.
- Lỗi `chatApi.createDirect` (network, 5xx...): tái dùng pattern `onError` sẵn có của `useOpenDirectConversation` — toast `e.message || 'Không mở được cuộc trò chuyện'`.
- Không có input người dùng gõ tay ở luồng này (chỉ 1 click) → không có bề mặt injection/validate input mới.

## 6. Testing

- `use-mutations.test.ts`: 2 test mới cho `useOpenBotFatherChat` — happy path (search → createDirect → setSelected → onClose được gọi), not-found (toast, không điều hướng, `onClose` không được gọi).
- `BotsTab.test.tsx`: cập nhật để assert nút mới thay vì mở `CreateBotDialog`; xoá assertion cũ về luồng tạo bot qua form.
- Xoá `CreateBotDialog.test.tsx`.

## 7. Ngoài phạm vi

- Không đổi UI/luồng list/sửa/quản lý token/xoá bot (đã có, giữ nguyên).
- Không prefill nội dung soạn tin (đã quyết định ở mục 1).
- Không thêm entry point khác (vd nút nổi trên ConversationDock) — chỉ 1 chỗ trong Settings theo yêu cầu.

## 8. Definition of Done

- [ ] `tsc --noEmit` + `npm run lint` pass.
- [ ] Vitest: `use-mutations.test.ts`, `BotsTab.test.tsx` cập nhật, pass 100%.
- [ ] `CreateBotDialog.tsx` + test bị xoá, không còn tham chiếu nào (`grep -r CreateBotDialog` rỗng ngoài spec cũ).
- [ ] Đủ 4 trạng thái UI không đổi hành vi cho phần list/sửa/token/xoá (không được regress khi refactor `BotsTab`).
- [ ] Không log token/PII gì mới ở luồng này (không có secret nào đi qua flow này).
