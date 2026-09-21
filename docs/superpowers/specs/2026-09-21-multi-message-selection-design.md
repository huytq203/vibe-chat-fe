# Chọn nhiều tin nhắn để phân tích — thiết kế

> Phần còn thiếu của feature "Phân tích và xử lý" (product-strategy §4.1 bước 1: "Người dùng mở menu
> của một tin nhắn hoặc **chọn một chuỗi tin nhắn**"). `MessageAnalysisDialog` đã nhận
> `messageIds: string[]` từ trước nhưng nơi gọi duy nhất luôn truyền `[message.id]` (1 phần tử) —
> không có UI chọn nhiều. Milestone này chỉ thêm UI chọn nhiều + điểm vào; KHÔNG đổi gì ở
> `MessageAnalysisDialog`/`MessageAnalysisPreview`/luồng xác nhận (đã xong ở milestone trước).

## 1. Bối cảnh

Toàn bộ action tin nhắn hiện tại (`useMessageActions`) hoạt động theo **1 tin nhắn/lần** — không có
store "đang chọn nhiều tin nhắn" nào tồn tại. `MessageBubble` là component dùng chung cho cả chat
chính (`appearance="default"`) và "My Store" (`appearance="store"`) — chỉ bật chọn nhiều ở chat
chính.

Giới hạn kỹ thuật đã có sẵn, không cần đổi backend: `GET /api/v1/conversations/:id/messages/by-ids`
(vibe-chat) cap **50 uuid/lần** (`QueryMessagesByIdsDto`).

## 2. Store mới — `message-selection.store.ts`

`src/features/chat/stores/message-selection.store.ts`, cùng thư mục và pattern với
`message-reply.store.ts`/`message-edit.store.ts` (Zustand, không persist):

```ts
type MessageSelectionState = {
  conversationId: string | null;
  selectedIds: Set<string>;
  enter: (conversationId: string, firstMessageId: string) => void;
  toggle: (messageId: string) => void;
  exit: () => void;
};
```

- `enter(conversationId, firstMessageId)` — bật chế độ chọn, set `conversationId`, `selectedIds =
  new Set([firstMessageId])`. Gọi từ mục "Chọn nhiều tin nhắn" trong `MessageActions`/
  `MessageActionDrawer`.
- `toggle(messageId)` — thêm/bớt 1 id khỏi `selectedIds`. Nếu bỏ chọn hết (set rỗng sau toggle) →
  tự động `exit()` (không giữ chế độ chọn với 0 tin nhắn — trải nghiệm khó hiểu).
- `exit()` — tắt chế độ chọn, `conversationId = null`, `selectedIds = new Set()`.
- Trạng thái "đang chọn" suy ra từ `conversationId !== null` (không cần field `active` riêng —
  tránh 2 nguồn sự thật có thể lệch nhau).
- Cap 50: `toggle` khi thêm mới mà `selectedIds.size >= 50` → không thêm, gọi
  `toast.error('Chỉ chọn tối đa 50 tin nhắn')` (import `sonner`, cùng pattern các hook khác).

## 3. Điểm vào — thêm mục menu

### 3.1 Desktop — `MessageActions.tsx`

Thêm `DropdownMenuItem` mới trong dropdown hiện có (cạnh "Phân tích và xử lý"), CHỈ hiện khi
`canActions` (đã có biến này ở `MessageBubble`, truyền xuống qua điều kiện render `MessageActions`
— tự nhiên đã đúng vì cả cụm `MessageActions` chỉ render khi `canActions`):

```tsx
<DropdownMenuItem onClick={() => selection.enter(message.conversationId, message.id)}>
  <CheckSquare className="h-4 w-4" />
  Chọn nhiều tin nhắn
</DropdownMenuItem>
```

Import `useMessageSelectionStore` trực tiếp trong `MessageActions.tsx` (KHÔNG qua
`useMessageActions` — action này không cần mutation/dialog state, chỉ set store, giữ
`useMessageActions` gọn theo đúng nguyên tắc single-responsibility đã có).

### 3.2 Mobile — `MessageActionDrawer.tsx`

Thêm vào mảng `items` (cùng vị trí tương đối — cạnh `analyze`):

```ts
{
  key: 'select',
  icon: <CheckSquare className="h-5 w-5" />,
  label: 'Chọn nhiều tin nhắn',
  onClick: run(() => selection.enter(message.conversationId, message.id)),
  show: true,
},
```

## 4. UI chọn — checkbox overlay trên bubble

Sửa `MessageList.tsx` (nơi map `messages` → `MessageBubble`, xem code hiện có ở dòng ~283-322):

- Subscribe `const selection = useMessageSelectionStore()`.
- `const selectionActiveHere = selection.conversationId === conversationId;` — chỉ hiệu lực khi đúng
  conversation đang mở (tránh lẫn khi user chuyển hội thoại giữa chừng, xem §5).
- Với mỗi bubble, tính `selected = selectionActiveHere && selection.selectedIds.has(m.id)` và
  `selectableHere = selectionActiveHere && !m.isDeleted && m.metadata?.optimistic !== true &&
  m.metadata?.failed !== true` (đúng điều kiện `canActions` đã dùng ở `MessageBubble`, nhân bản ở
  đây vì `MessageList` không có sẵn biến đó — KHÔNG import lại từ `MessageBubble`, chỉ 3 điều kiện
  đơn giản, chấp nhận lặp nhỏ hơn là export thêm API chỉ cho 1 chỗ dùng).
- Truyền 2 prop mới xuống `MessageBubble`: `selectable={selectableHere}` (chỉ true khi tin nhắn này
  chọn được) và `selected={selected}`.

Sửa `MessageBubble.tsx` — thêm 2 prop optional (`selectable?: boolean; selected?: boolean`,
mặc định `undefined`/không bật), render lớp phủ khi `selectable`:

```tsx
{selectable && (
  <button
    type="button"
    aria-label={selected ? 'Bỏ chọn tin nhắn' : 'Chọn tin nhắn'}
    aria-pressed={selected}
    onClick={(e) => {
      e.stopPropagation();
      useMessageSelectionStore.getState().toggle(message.id);
    }}
    className={cn(
      'absolute inset-0 z-30 rounded-2xl',
      selected ? 'bg-primary/15 ring-2 ring-primary' : 'bg-transparent',
    )}
  >
    <span
      className={cn(
        'absolute top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
        isMe ? 'right-1.5' : 'left-1.5',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background',
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
    </span>
  </button>
)}
```

- Đặt lớp phủ này làm **con đầu tiên** trong `div[data-message-surface]` (cùng cấp `actionsMenu`,
  `likeButton`) — `z-30` cao hơn `actionsMenu`/`likeButton` (`z-20`) để chặn click xuyên qua nội
  dung bên dưới (ảnh, link, bot command...) khi đang chọn, đúng ý định "tap để toggle, không kích
  hoạt hành vi thường của bubble".
- `useMessageSelectionStore.getState().toggle(...)` (không dùng hook selector ở đây vì đã có
  `onClick` — gọi trực tiếp store action, không cần subscribe thêm trong handler).
- Giữ nguyên toàn bộ `actionsMenu`/`likeButton`/nội dung khác — không xoá, chỉ bị lớp phủ che khi
  `selectable=true` (tự động ẩn khỏi thao tác chuột vì phủ `inset-0`).

**Hiệu năng:** `MessageBubble` đã memo hoá (comment sẵn trong file: "Props gần như primitive... so
sánh nông cắt phần lớn re-render thừa"). 2 prop mới (`selectable`, `selected`) là boolean primitive
→ shallow-compare của `memo()` vẫn hoạt động đúng, chỉ bubble có prop đổi mới re-render — không cần
Zustand selector bên trong `MessageBubble` (store chỉ đọc 1 lần lúc toggle qua `getState()`, không
subscribe).

## 5. Toolbar chọn — hiện khi đang chọn

Thêm 1 component mới `src/features/chat/components/messages/MessageSelectionToolbar.tsx`, mount
trong `MessageList.tsx` ngay dưới thẻ `<div className="animate-in fade-in relative isolate ...">`
mở đầu, **trước** `div[ref=scrollRef]` (nằm ngoài vùng scroll, cố định trên cùng — `PinnedBanner`
KHÔNG nằm trong `MessageList.tsx`, nó được mount riêng ở `ChatPanel.tsx` (component cha) nên không
dùng làm ví dụ vị trí được — chèn mới độc lập ngay trong `MessageList.tsx`):

```tsx
type Props = { conversationId: string; onAnalyze: (messageIds: string[]) => void };

export function MessageSelectionToolbar({ conversationId, onAnalyze }: Props) {
  const selection = useMessageSelectionStore();
  if (selection.conversationId !== conversationId) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <span className="text-sm font-medium text-foreground">
        Đã chọn {selection.selectedIds.size} tin nhắn
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={selection.exit}>
          Huỷ
        </Button>
        <Button
          size="sm"
          onClick={() => onAnalyze([...selection.selectedIds])}
        >
          Phân tích đã chọn
        </Button>
      </div>
    </div>
  );
}
```

`MessageList.tsx` giữ state `analysisMessageIds: string[] | null` (mở `MessageAnalysisDialog` với
`messageIds={analysisMessageIds}` khi khác null) — tái dùng `MessageAnalysisDialog` đã có, KHÔNG tạo
dialog mới. Bấm "Phân tích đã chọn" → set state + `selection.exit()` ngay (thoát chế độ chọn trước
khi dialog mở, tránh 2 UI chồng lên nhau).

## 6. Thoát chế độ chọn khi đổi conversation

`MessageList` nhận `conversationId` qua prop — thêm `useEffect`:

```ts
useEffect(() => {
  return () => {
    if (useMessageSelectionStore.getState().conversationId === conversationId) {
      useMessageSelectionStore.getState().exit();
    }
  };
}, [conversationId]);
```

Cleanup effect chạy khi `conversationId` đổi (unmount hoặc key thay đổi) hoặc component unmount hẳn
— chỉ exit nếu store đang giữ ĐÚNG conversation này (tránh trường hợp hiếm: user mở 2 tab/2 instance
`MessageList` — dù thực tế app chỉ mount 1 `MessageList` tại 1 thời điểm, cờ so sánh vẫn là an toàn
rẻ tiền).

## 7. Test

- `message-selection.store.ts`: `enter` set đúng state; `toggle` thêm/bớt đúng; bỏ chọn hết → tự
  `exit`; thêm phần tử thứ 51 → không thêm, không đổi `selectedIds`.
- `MessageActions.test.tsx`/`MessageActionDrawer.test.tsx` — **chưa tồn tại trong repo** (chỉ
  `MessageBubble.test.tsx` có sẵn), tạo mới cả 2, mỗi file chỉ cần 1 test: bấm "Chọn nhiều tin nhắn"
  → gọi `selection.enter` đúng tham số (`conversationId`, `message.id`). Không cần test lại toàn bộ
  action khác của 2 component này (ngoài phạm vi milestone).
- `MessageSelectionToolbar.test.tsx`: không render gì khi `conversationId` khác đang chọn; hiện đúng
  số lượng; bấm "Phân tích đã chọn" → gọi `onAnalyze` với đúng mảng id VÀ gọi `selection.exit`; bấm
  "Huỷ" → gọi `selection.exit`.
- `MessageBubble.test.tsx` (đã có sẵn): thêm case `selectable=true` render overlay + `aria-pressed`
  đúng theo `selected`; bấm overlay → gọi `toggle` với đúng `message.id`, không kích hoạt hành vi
  bubble thường (assert nội dung bên trong KHÔNG nhận click — vd mock `onQuoteClick` không được gọi
  khi bấm overlay).

## 8. Ngoài phạm vi

- Không thêm bulk action nào khác ngoài "Phân tích" (không bulk-delete/bulk-forward — đã có luồng
  riêng, không thuộc milestone này).
- Không giữ trạng thái chọn khi rời trang/reload (store không persist — đúng ý định, chọn nhiều là
  thao tác tạm thời trong 1 phiên).
- Không giới hạn chọn theo loại tin nhắn (TEXT/IMAGE/...) — mọi tin nhắn `canActions` đều chọn được,
  `MessageAnalysisPreview`/backend tự xử lý preview theo type (đã có từ S2).
