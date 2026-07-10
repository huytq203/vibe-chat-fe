# Chat Rounded Card Layout — Design Spec

## Nguồn gốc

Import từ claude.ai/design project "Tái thiết kế giao diện bo tròn" (`d6269611-0176-45f1-a16e-4772064717bc`), file `HaloChat Rounded.dc.html`: giao diện chat với nền gradient ấm, các panel là card trắng bo góc lớn (22–26px) nổi trên nền với gap, avatar/dock tròn, bubble tin nhắn bo đều.

## Quyết định phạm vi

- **Màu sắc:** giữ nguyên 100% palette hiện tại — Charcoal + Cyan (`Design/DESIGN.md`). Không đổi background gradient, không đổi màu bubble.
- **Mượn:** hình khối — bo góc lớn cho card khung, bố cục "card nổi" cách nhau bằng gap thay vì border liền kề, bubble tin nhắn bo đều 4 góc.
- **Phạm vi component:** chỉ khung layout chính — `NavSidebar`, `MobileTabBar` (dock), `ConversationList`, `ChatHeader`, `MessageInput`, `MessageBubble`, `ContactInfo`. KHÔNG đụng vào dialog/popover con (AddMembersDialog, PollBubble, WallpaperPickerDialog, v.v.) — các thành phần đó tự kế thừa qua token/component chung nên không cần sửa tay.

## 1. Token mới

Trong `src/styles/index.css`, khối `@theme`, thêm 1 token radius mới cạnh scale hiện có:

```css
--radius-2xl: 1.25rem;  /* 20px — card khung: sidebar/list/header/input/panel */
```

Lý do tách khỏi `--radius-xl` (16px, đang dùng cho modal): card khung cần bo lớn hơn modal để tạo cảm giác "nổi" như design gốc, nhưng không được đụng tới radius button (luật vàng: button tối đa 12px — không đổi).

## 2. Bố cục desktop — `ChatLayout.tsx`

Hiện tại các nhánh `return` desktop (chat / ai-full / tasks / store) render `NavSidebar` + panel liền kề nhau, dính bằng `border-r`/`border-l`, không có gap.

Đổi thành: root container thêm `gap-3 p-3` (giữ track `h-full w-full overflow-hidden`), mỗi child (`NavSidebar`, `ConversationList`/`AiChatPanel`, `ChatPanel`, `ContactInfo`) tự chịu trách nhiệm bo `rounded-2xl` + `shadow-subtle` ở component riêng (mục 3), layout chỉ lo spacing.

Áp dụng cho cả 4 nhánh return (`chat`, `ai-full`, `tasks`, `store`) để nhất quán — `TaskManagementLayout`/`MyStoreLayout` không nằm trong scope sửa nội dung, chỉ nhận đúng gap từ layout cha (không cần sửa file của chúng).

Nhánh mobile (`isMobile`) không đổi cấu trúc — chỉ áp `MobileTabBar` mới ở mục 3.

## 3. Thay đổi từng component

### NavSidebar
- Bỏ `border-r border-border`.
- Thêm `rounded-2xl shadow-subtle`.
- Giữ nguyên `bg-sidebar`, width `w-14`, toàn bộ logic active/badge.

### ConversationList
- `<aside>` root: bỏ `border-r border-border`, thêm `rounded-2xl shadow-subtle`.
- Giữ nguyên toàn bộ nội dung (search, tabs, list, footer).

### ChatPanel + ChatHeader + MessageInput
- `ChatPanel` (`<main>`) đổi từ khối liền sang `flex flex-col gap-3`: `ChatHeader` là card riêng, vùng giữa (`CallBanner`/`PinnedBanner`/`MessageList`) **không có card riêng** — trong suốt, để nền `bg-background` của `<main>` xuyên qua giống vùng chat trong design gốc, `MessageInput` là card riêng ở dưới.
- `ChatHeader`: bỏ `border-b border-border`, thêm `rounded-2xl shadow-subtle` (cả biến thể `wallpaperActive`).
- `MessageInput`: bỏ `border-t border-border`, thêm `rounded-2xl shadow-subtle` (cả biến thể `wallpaperActive`). Ô nhập bên trong (`rounded-2xl border border-border bg-muted`) giữ nguyên — đã đúng scale.
- Trạng thái "chỉ quản trị viên được nhắn" (div thay MessageInput trong `ChatPanel.tsx`) cũng đổi `border-t` → `rounded-2xl shadow-subtle` để nhất quán.

### MessageBubble
- Bỏ `rounded-br-md` (mine) / `rounded-bl-md` (other) — bubble hiện tại có góc "đuôi" vuông ở cạnh gần avatar.
- Dùng `rounded-2xl` đều 4 góc cho mọi bubble (mine/other/theme tuỳ biến), giống bubble uniform trong design gốc.
- Không đổi màu, padding, nội dung, logic reactions/actions/reply.

### ContactInfo
- `<aside>` root: bỏ `border-l border-border`, thêm `rounded-2xl shadow-subtle`.
- Header con (`border-b border-border`) giữ nguyên — chỉ đổi khung ngoài.

### MobileTabBar
- Root `<nav>`: bỏ `border-t border-border`, thêm `rounded-t-2xl shadow-subtle` — dock nổi lên trên nội dung thay vì thanh dính liền cạnh dưới màn hình.
- Giữ `pb-safe`, toàn bộ tab/logic không đổi.

## 4. Không đổi

- Màu sắc (charcoal/cyan), spacing nội bộ từng component, mọi logic nghiệp vụ (auth, realtime, mutation…).
- Mọi dialog/popover/panel con trong `contact/`, `polls/`, `messages/attachment/`.
- `AiChatPanel`, `AiChatPage`, `TaskManagementLayout`, `MyStoreLayout` — không sửa nội dung, chỉ hưởng gap từ `ChatLayout`.
- `NavSidebar` icon set, `MobileTabBar` tab set.

## 5. Rủi ro / lưu ý khi implement

- `shadow-subtle` hiện định nghĩa nhẹ (`rgba(0,0,0,0.03) 0px 4px 24px`) — trên nền tối `#111318` có thể gần như không thấy. Cần kiểm tra bằng mắt sau khi áp; nếu quá mờ, có thể cần bóng đậm hơn cho theme tối (không nằm trong token hiện có — nếu cần thêm token mới phải hỏi lại, không tự bịa).
- Bỏ border giữa các panel dựa hoàn toàn vào gap để phân tách — cần test ở các viewport hẹp hơn (1024px) xem gap 3 (12px) có làm ConversationList/ContactInfo bị chật không.
- `wallpaperActive` biến thể của `ChatHeader`/`MessageInput` dùng `bg-sidebar/75 backdrop-blur-md` — giữ nguyên, chỉ đổi phần bo góc/shadow.
- Test hiện có (`RichText.test.tsx`, `useReactions.test.ts`, …) không phụ thuộc class Tailwind cụ thể — không kỳ vọng phải sửa test nào cho thay đổi thuần CSS này; xác nhận lại khi chạy `vitest` sau khi implement.
