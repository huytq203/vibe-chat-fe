# Group Settings + Secret Chat + Conversation Separator — Design Spec

**Ngày:** 2026-06-04
**Feature:** chat
**Phạm vi:** FE-only skeleton (BE chưa có endpoint PATCH encryptionType — UI chuẩn bị sẵn)

## Mục tiêu

1. **GroupSettingsPanel** — OWNER/ADMIN/MODERATOR quản lý cài đặt nhóm qua panel riêng.
2. **Secret toggle (Direct)** — cả 2 user trong DIRECT có thể xem / bật chế độ bí mật.
3. **Conversation separator** — phân tách visual giữa chat thường (SERVER) và secret (E2E) trong danh sách.

## Bối cảnh & nền tảng có sẵn

- `Conversation.encryptionType: 'SERVER' | 'E2E'` đã có trong type và đã render ở `ConversationItem`.
- `ContactInfo.tsx` dùng pattern `view` state để switch panel (GroupMembersPanel, JoinRequestsPanel).
- **Không có** endpoint PATCH để đổi `encryptionType` trên conv hiện có → tất cả toggle render
  `disabled` + badge "Sắp có", sẵn sàng wire mutation khi BE bổ sung.
- `MemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'` — gate hiện panel Settings.

## Quyết định thiết kế (đã chốt với user)

1. GroupSettingsPanel điều hướng giống GroupMembersPanel: `view === 'settings'` trong ContactInfo.
2. Settings group gồm: Secret toggle + 3 permission toggles (chat/pin/approval) + block list — tất cả disabled + "Sắp có".
3. Secret toggle trong Direct: hiện cho cả 2 user, disabled + "Sắp có".
4. ConversationList: tách 2 nhóm (SERVER trên / E2E dưới) với `SecretDivider` có nhãn + icon khoá.
5. Mỗi `ConversationItem` E2E thêm icon Lock nhỏ bên cạnh tên.

## Các đơn vị (units)

### a) `components/common/ToggleRow.tsx` (mới)

Row cài đặt có switch toggle, dùng chung cho GroupSettingsPanel + ContactInfo direct.

```ts
type ToggleRowProps = {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;   // hiện badge "Sắp có" + tooltip
};
```

Layout: icon + label/subtitle bên trái, Switch (Basuicn) + badge "Sắp có" bên phải.
Khi `disabled=true`: opacity giảm, cursor not-allowed, Switch không toggle.

### b) `components/contact/GroupSettingsPanel.tsx` (mới)

Pattern: header ← / title / ✕ → body scroll → sections.
Quyền render: user có role OWNER | ADMIN | MODERATOR trong conversation.

**Sections:**

```
Section "Bảo mật"
  ToggleRow: 🔒 Chế độ bí mật (Secret Chat)
    subtitle tuỳ encryptionType:
      E2E  → "Đang bật — tin nhắn mã hoá đầu cuối"
      SERVER → "Mã hoá đầu cuối — tin nhắn không lưu trên server"
    [disabled, comingSoon]

Section "Quyền thành viên"
  ToggleRow: 💬 Cho phép thành viên gửi tin [disabled, comingSoon]
  ToggleRow: 📌 Cho phép thành viên ghim tin [disabled, comingSoon]
  ToggleRow: ✅ Chế độ phê duyệt thành viên mới [disabled, comingSoon]

Section "Kiểm duyệt"
  OptionRow: 🚫 Quản lý danh sách chặn [disabled, trailing badge "Sắp có"]
```

Props: `conversation: Conversation`, `meId: string | null`,
`onBack: () => void`, `onClose: () => void`.

### c) `ContactInfo.tsx` (sửa)

- Thêm `view === 'settings'` path → render `<GroupSettingsPanel>`.
- Thêm `OptionRow` "Cài đặt nhóm" (Settings icon) trong section Tuỳ chọn, chỉ hiện khi
  `!isDirect && meRole ∈ ['OWNER','ADMIN','MODERATOR']`.
  (`meRole` lấy từ `conversation.members.find(m => m.userId === meId)?.role`).
- Thêm `ToggleRow` "Chế độ bí mật" trong section Tuỳ chọn cho DIRECT, hiện sau icon ghim,
  `checked={conversation.encryptionType === 'E2E'}`, `disabled`, `comingSoon`.

### d) `ConversationItem.tsx` (sửa nhỏ)

Thêm icon `Lock` nhỏ (`h-3 w-3 text-muted-foreground`) bên cạnh icon `Pin` khi
`conversation.encryptionType === 'E2E'`. Import thêm `Lock` từ `lucide-react`.

### e) `components/conversations/SecretDivider.tsx` (mới — component nhỏ)

Divider visual phân tách 2 nhóm conv trong danh sách.

```tsx
// Layout: ──── 🔒 Secret ────
// Style: dashed border-t, text-[11px] muted-foreground, flex items-center gap-2
```

### f) `ConversationList.tsx` (sửa)

Tách `filtered` thành 2 mảng trước khi render:

```ts
const normal  = filtered.filter(c => c.encryptionType !== 'E2E');
const secrets = filtered.filter(c => c.encryptionType === 'E2E');
```

Render:
```
{normal.map(c => <ConversationItem ... />)}
{secrets.length > 0 && <SecretDivider />}
{secrets.map(c => <ConversationItem ... />)}
```

Sort mỗi nhóm độc lập (pinned trước, rồi lastMessageAt giảm dần — giữ logic sort hiện có,
áp dụng cho từng nhóm). Hoạt động đúng với tất cả tab (All / Chưa đọc / Nhóm).

## Luồng dữ liệu

Tất cả toggle disabled → không có mutation/API call. State hiển thị lấy trực tiếp từ
`conversation.encryptionType` (đã có trong cache TanStack Query).
Khi BE bổ sung endpoint PATCH encryptionType → thay `disabled` thành `useMutation` trong
`GroupSettingsPanel` / ContactInfo và bỏ `comingSoon`.

## Lỗi & edge cases

- User là MEMBER (không phải admin) → không thấy OptionRow "Cài đặt nhóm" trong ContactInfo.
- `conversation.members` chưa load (chỉ có ở endpoint detail) → fallback an toàn: ẩn
  "Cài đặt nhóm" nếu không xác định được role (không lỗi crash).
- Tab "Nhóm" filter bỏ DIRECT → nhóm secrets chỉ hiện E2E group, không có DIRECT E2E.
- Không có E2E conv → `SecretDivider` không render (không dư khoảng trắng).

## Ngoài phạm vi (YAGNI)

- Gọi API thực tế thay đổi encryptionType (chờ BE).
- Lưu permission toggles (chờ BE).
- Màn hình chi tiết "danh sách chặn".
- Tạo mới conv E2E từ UI (đã có qua createDirect với encryptionType='E2E' nhưng không expose).
