# My Store Card Layout + Theme Background — Design Spec

## Bối cảnh

`MyStoreLayout` ("Kho của tôi") hiện là 1 khối duy nhất (`<div className="flex h-full w-full bg-background">`) gộp header + nội dung chính + info panel dính liền nhau bằng `border-l`/`border-b`, không có gap. Trong khi đó chat đã có bố cục "card nổi" tách rời bằng gap (`ConversationList` / `ChatHeader` / `ChatPanel` / `ContactInfo`, xem [2026-07-10-chat-rounded-card-layout-design.md](./2026-07-10-chat-rounded-card-layout-design.md)) và nền ảnh theo theme (`background-1.webp` sáng / `background-2.webp` tối) áp cho nhánh chat mặc định trong `ChatLayout`.

Nhánh `activeSection === 'store'` trong `ChatLayout.tsx` trước đây chủ động **không** áp nền ảnh và không sửa nội dung `MyStoreLayout` (spec 07-10 ghi rõ "không nằm trong scope"). Yêu cầu lần này: đưa Store vào cùng pattern — tách khối, tách nhau, và ăn nền ảnh theo theme.

## Phát hiện phụ: bug nền sáng dùng sai ảnh

`getDefaultBackgroundImage()` (`src/lib/theme/themes.ts`) hiện trả về `/asset/banner.png` cho theme sáng, dù comment ngay phía trên ghi rõ "background-1.webp = theme sáng". Quyết định: sửa luôn hàm này cho đúng comment — ảnh hưởng cả nền chat mặc định lẫn nền Store (dùng chung 1 hàm).

## Quyết định phạm vi (đã chốt qua hỏi đáp)

1. **Sửa `getDefaultBackgroundImage`** để theme sáng trả về `background-1.webp` thay vì `banner.png` — áp dụng luôn cho chat, không tách riêng logic cho Store.
2. **Header Store tách thành card riêng** phía trên (giống `ChatHeader`), có khe hở lộ nền xuống nội dung bên dưới — không dính liền đỉnh khung nội dung chính.
3. **FolderSidebar (tab File) tách thành card riêng thứ 3** — không nằm chung 1 card với `FilePanel`. Bố cục tab File: `FolderSidebar` | `FilePanel` | `MyStoreInfoPanel`, 3 card độc lập cách nhau `gap-3`.

## Kiến trúc

### 1. `src/lib/theme/themes.ts`
`getDefaultBackgroundImage(theme)`: `theme.isDark ? '/asset/background-2.webp' : '/asset/background-1.webp'`.

### 2. `src/features/chat/components/layout/ChatLayout.tsx`
Nhánh `activeSection === 'store'`: áp `style` nền ảnh theo theme lên wrapper `<div className="flex h-full w-full gap-3 overflow-hidden p-3">`, cùng công thức overlay tối 35% dùng cho nền chat mặc định:
```ts
backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${getDefaultBackgroundImage(currentTheme)})`,
backgroundSize: 'cover',
backgroundPosition: 'center',
```
Không dùng `wallpaperStyle`/`selectedConversationId` (không áp dụng cho Store — không có wallpaper theo hội thoại ở đây). Tính riêng biến `storeBackgroundStyle`, độc lập với `backgroundStyle` hiện có của nhánh chat mặc định.

### 3. `src/features/my-store/components/MyStoreHeader.tsx` (mới)
Tách nguyên khối header hiện tại trong `MyStoreLayout` (icon Archive + tiêu đề "Kho của tôi" + tab switcher Ghi chú/File) thành component riêng. Props: `activeTab`, `onTabChange`. Root: `rounded-2xl border bg-sidebar/75 backdrop-blur-md shadow-subtle` (bỏ `border-b`, thêm bo góc đều — theo đúng pattern `ChatHeader`).

### 4. `src/features/my-store/components/MyStoreLayout.tsx`
Viết lại bố cục: `flex flex-col gap-3 h-full w-full` (bỏ `bg-background` phẳng — nền giờ đến từ `ChatLayout`).
- `<MyStoreHeader activeTab={activeTab} onTabChange={setActiveTab} />` trên cùng.
- Bên dưới: `flex flex-1 gap-3 min-h-0`:
  - Tab **notes**: 1 div card bọc `MyStoreFeed` + `MyStoreComposer` (`flex-1 min-w-0 flex flex-col rounded-2xl border bg-background/75 backdrop-blur-md shadow-subtle overflow-hidden`) + `MyStoreInfoPanel` (nếu có `selfConv?.id`).
  - Tab **files**: `FolderSidebar` (card riêng) + div card bọc `FilePanel` (cùng style card nội dung như trên) + `MyStoreInfoPanel`.

### 5. `src/features/my-store/components/MyStoreInfoPanel.tsx`
`<aside>` root: bỏ `border-l border-border bg-sidebar` (dính liền, đục) → `rounded-2xl border bg-sidebar/75 backdrop-blur-md shadow-subtle shrink-0` (card nổi, giống `ContactInfo`). Nội dung bên trong không đổi.

### 6. `src/features/my-store/components/FolderSidebar.tsx`
Root `<div>` (dòng ~130): bỏ `border-r border-border` (dính liền) → `rounded-2xl border bg-sidebar/75 backdrop-blur-md shadow-subtle shrink-0` (card nổi độc lập, giữ `w-56`). Nội dung/logic cây thư mục không đổi.

### 7. `src/features/my-store/components/MyStoreComposer.tsx`
Dòng 50: `bg-background` (đục, sẽ che mất hiệu ứng blur của card cha) → bỏ, dùng nền trong suốt (kế thừa từ card cha ở `MyStoreLayout`). Giữ `border-t border-border` để phân tách trực quan Feed/Composer trong cùng 1 card (không phải case dùng gap).

## Không đổi / ngoài phạm vi

- Store vẫn desktop-only: `isMobile` branch trong `ChatLayout` return sớm trước khi chạm nhánh `store` — không sửa, không phải yêu cầu lần này.
- Không thêm wallpaper picker riêng cho Store (khác chat, dùng cố định ảnh theo theme).
- `FilePanel`, `MyStoreFeed`, các dialog con (`BookmarkDialog`, `ChecklistDialog`, `ReminderDialog`, `FilePreviewDialog`, `ConfirmDialog`, `PromptDialog`) — không đổi nội dung/logic, chỉ hưởng gap + nền trong suốt từ card cha bọc ngoài.
- Màu sắc, spacing nội bộ từng component, mọi logic nghiệp vụ (query/mutation/realtime) không đổi.

## Rủi ro / lưu ý khi implement

- `MyStoreInfoPanel` và `FolderSidebar` trước đây dùng `bg-sidebar` đục — đổi sang `/75 backdrop-blur-md` cần test cả theme sáng lẫn tối để đảm bảo độ tương phản chữ vẫn đủ rõ trên nền ảnh.
- Tab File có 3 card cùng lúc (FolderSidebar + FilePanel + InfoPanel) — cần test ở viewport hẹp hơn (~1280–1366px, đây là màn desktop nên không cần lo mobile) xem có bị chật/tràn ngang không; nếu chật, ưu tiên giữ đúng scope, ghi nhận lại thay vì tự ý đổi kiến trúc.
- `getDefaultBackgroundImage` đổi ảnh nền sáng ảnh hưởng luôn UI chat hiện có (không chỉ Store) — cần xem lại chat ở theme sáng sau khi đổi để chắc chắn không vỡ tương phản.
- Xác nhận lại bằng cách chạy dev server, đăng nhập, mở Kho của tôi ở cả 2 tab (Ghi chú/File) và cả 2 theme (sáng/tối) trước khi báo hoàn thành.
