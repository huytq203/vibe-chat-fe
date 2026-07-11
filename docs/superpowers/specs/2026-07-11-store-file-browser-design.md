# Store File Browser — gộp FolderSidebar + FilePanel thành 1 card drill-in kiểu Drive

## Bối cảnh

Sau khi tách "Kho của tôi" thành các floating card riêng biệt (xem
`docs/superpowers/specs/2026-07-11-my-store-card-layout-design.md`), tab
"File" hiện có 2 card cạnh nhau: `FolderSidebar` (cây thư mục cố định bên
trái, có thể expand/collapse từng node) và `FilePanel` (danh sách file của
thư mục đang chọn, bên phải). Người dùng muốn gộp 2 card này thành 1, điều
hướng kiểu Google Drive: click vào thư mục → cả view chuyển sang nội dung
thư mục đó, có breadcrumb để quay lại — không còn cây thư mục cố định bên
trái nữa.

## Mục tiêu

- 1 card duy nhất thay cho `FolderSidebar` + `FilePanel`.
- Điều hướng dạng "drill-in": click 1 thư mục → view thay bằng nội dung thư
  mục đó (thư mục con + file), có breadcrumb ở đầu để quay lại các cấp cha.
- Dùng component `Breadcrumb` có sẵn ở `@/components/ui/breadcrumb/Breadcrumb`.

## Ngoài phạm vi

- Không đổi cách `MyStoreInfoPanel` hoạt động (chỉ `onOpenFiles` chuyển tab,
  không chọn sẵn 1 thư mục cụ thể — giữ nguyên).
- Không thêm chức năng đổi tên thư mục thật (nút "Đổi tên" hiện tại chỉ là
  stub không làm gì — sẽ bị xoá, không thay bằng logic rename thật).
- Không đổi API/service layer (`myStoreApi`, `useStoreFolders`,
  `useStoreFiles`, `useCreateFolder`, `useDeleteFolder`, `useDeleteFile`,
  `useUploadStoreFile` giữ nguyên signature).
- Không đổi `QuotaBar`, `ConfirmDialog`, `PromptDialog`, `FilePreviewDialog`.

## Kiến trúc

### State điều hướng

`StoreFileBrowser` giữ 1 state cục bộ:

```ts
const [path, setPath] = useState<string[]>([]); // stack folder id, [] = root
```

- `currentFolderId = path.at(-1) ?? null`.
- Danh sách thư mục con hiển thị = kết quả walk cây `folders` (từ
  `useStoreFolders()`) theo từng id trong `path`, **không** cache object
  folder tại thời điểm click — vì react-query structural sharing có thể
  làm object cha cũ không còn khớp sau khi tạo/xoá thư mục con, nếu cache
  theo object sẽ bị stale. Viết 1 helper thuần `findFolderById(folders,
  id): StoreFolder | null` (đệ quy qua `children`).
- Click vào 1 hàng thư mục → `setPath((p) => [...p, folder.id])`.
- Click vào 1 breadcrumb ở vị trí `i` → `setPath((p) => p.slice(0, i))`
  (crumb gốc "Kho của tôi" → `setPath([])`).
- File chỉ fetch khi `currentFolderId !== null` (dùng
  `useStoreFiles(currentFolderId)` — hook đã tự `enabled: Boolean(folderId)`
  nên tại root component không gọi query file).

### Breadcrumb

Dùng `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`,
`BreadcrumbPage`, `BreadcrumbSeparator` từ
`@/components/ui/breadcrumb/Breadcrumb`. Crumb đầu "Kho của tôi" luôn có,
sau đó 1 crumb / tên thư mục cha (lấy tên qua `findFolderById`). Crumb cuối
cùng (thư mục đang đứng) dùng `BreadcrumbPage` (không click được); các crumb
trước đó dùng `BreadcrumbLink asChild` bọc 1 `<button type="button">` với
`onClick` (component `BreadcrumbLink` không dùng Radix Slot thật — `asChild`
chỉ đổi tag `<a>`→`<span>` rồi vẫn render children bình thường, nên bọc
`<button>` bên trong là cách dùng đúng và có bàn phím a11y).

### Header

1 hàng: `Breadcrumb` (trái) — nút "Tạo thư mục" (luôn hiện, tạo
`parentId: currentFolderId ?? undefined`) — nút "Tải lên" (chỉ enable khi
`currentFolderId !== null`; disable + `title="Chọn thư mục trước"` khi ở
root).

### Danh sách nội dung

1 list cuộn duy nhất:
1. Thư mục con của `currentFolderId` (hoặc top-level `folders` nếu root) —
   render bằng `FolderRow` mới (tách từ `FolderNode` cũ nhưng **bỏ** logic
   expand/collapse + thụt lề theo `level`, vì giờ điều hướng bằng drill-in
   chứ không phải cây lồng nhau). Mỗi hàng: icon thư mục + tên + `›` (biểu
   thị "vào trong") + menu "..." chỉ còn "Xoá" (bỏ "Đổi tên" — stub không
   chức năng, theo quyết định của user).
2. File của `currentFolderId` (nếu có, tức không phải root) — tái dùng
   `FileRow` y nguyên logic hiện tại (preview, tải về, gỡ file, progress
   bar), tách sang file riêng `FileRow.tsx` để giữ file/component dưới giới
   hạn dòng.

Trạng thái rỗng: root không có thư mục nào → "Chưa có thư mục nào". Trong 1
thư mục không có thư mục con lẫn file → "Thư mục trống".

### File tách nhỏ

- `StoreFileBrowser.tsx` — component chính: header (breadcrumb + actions) +
  orchestrate list, quản lý `path` state, upload input, context menu.
- `FolderRow.tsx` — 1 hàng thư mục trong list (không còn cây lồng nhau).
- `FileRow.tsx` — tách nguyên logic `FileRow` hiện có trong `FilePanel.tsx`
  sang file riêng, không đổi hành vi.
- `src/features/my-store/utils.ts` (file mới, chưa tồn tại — cùng quy ước
  với `src/features/chat/utils.ts`) — helper thuần `findFolderById`.

Xoá: `FolderSidebar.tsx`, `FolderSidebar.test.tsx`, `FilePanel.tsx`,
`FilePanel.test.tsx` (thay bằng test mới cho `StoreFileBrowser` +
`FolderRow` nếu cần).

### `MyStoreLayout.tsx`

Nhánh tab `files` rút gọn — bỏ `selectedFolderId`/`selectedFolder` state và
import `useStoreFolders` (chỉ dùng để tra `selectedFolder.name` cho
`FilePanel`, giờ không cần nữa vì `StoreFileBrowser` tự quản lý):

```tsx
{activeTab === 'notes' ? (
  ...
) : (
  <StoreFileBrowser />
)}
```

vẫn nằm cạnh `MyStoreInfoPanel` với `gap-3` như hiện tại (không đổi phần
info panel).

## Quyết định đã chốt với user

- Nút "Đổi tên" (stub không chức năng) → **xoá luôn**, không giữ làm placeholder.
- Nút "Tải lên" ở root → **hiện nhưng disable**, gắn với `currentFolderId`
  hiện đứng; enable khi đã vào 1 thư mục cụ thể.
- Điều hướng: drill-in + breadcrumb (không phải sidebar thu gọn dạng
  Drive-left-nav).

## Testing

- `StoreFileBrowser.test.tsx`: mock `useStoreFolders`/`useStoreFiles`/mutation
  hooks. Test tối thiểu: root hiển thị top-level folders (không gọi file
  query); click 1 folder → breadcrumb có thêm 1 crumb + list đổi sang
  children/files của folder đó; click crumb gốc → quay về root.
- `FolderRow.test.tsx` (nếu tách đủ lớn để test riêng) hoặc gộp test hành vi
  row vào `StoreFileBrowser.test.tsx`.
