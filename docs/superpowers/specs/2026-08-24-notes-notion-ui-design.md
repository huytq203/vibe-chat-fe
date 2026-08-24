# Thiết kế UI: module `/notes` — cấu trúc Notion, da Vibe Charcoal

> **Ngày:** 2026-08-24
> **Kèm kế hoạch:** `/home/huytq/code/my/be/notion-service/docs/superpowers/plans/2026-08-24-fe-notes-ghep-notion-service.md`
> **Thẩm quyền hình ảnh:** [`.claude/Design/DESIGN.md`](../../../.claude/Design/DESIGN.md) — Charcoal + Cyan
> **Tham chiếu cấu trúc:** `app.notion.com` (dark mode), đo thật ngày 2026-08-24, viewport 1408×682, DPR 1.25

---

## 0. Hợp đồng thiết kế — đọc trước khi gõ dòng đầu tiên

**Notion cho ta *bố cục, tỉ lệ và hành vi*. DESIGN.md cho ta *màu, chữ và bo góc*.**
Không trộn ngược lại.

Cụ thể:

- ✅ Lấy từ Notion: bề rộng cột, chiều cao hàng, độ thụt cấp, vị trí máng nút, thứ tự
  thao tác, cái gì hiện khi hover, cái gì ẩn khi không cần.
- ❌ Không lấy từ Notion: `#191919`, `#202020`, `#f0efed`, `#bcbab6`, `#2383e2`, font
  `ui-sans-serif`. Mọi màu đi qua CSS var của Halo.
- ❌ Không thêm token mới ngoài `index.css`. Cần một giá trị chưa có → dùng var gần nhất,
  hoặc dừng và hỏi.

**Chế độ (mode):**

| Bề mặt | Mode | Thành công nghĩa là |
|---|---|---|
| `/notes/**` | **Operate** | Người dùng viết xong việc của họ. Giao diện phải lùi ra sau. |
| `/p/[token]` | **Read** | Người ngoài đọc hiểu. Ưu tiên chất lượng đọc, không có công cụ soạn thảo. |

---

## 1. Bảng đo Notion → Halo

Số cột giữa là **đo thật**, không phải ước lượng. Số cột phải là **giá trị phải code**.

### 1.1. Vỏ và cột

| Thứ | Notion đo được | Halo dùng | Vì sao lệch |
|---|---|---|---|
| Nền ứng dụng | `#191919` | `var(--background)` `#111318` | Palette Halo |
| Nền sidebar cây trang | `#202020` (sáng hơn nền) | `var(--sidebar)` `#0d1017` (**tối hơn** nền) | Nối liền `NavSidebar` sẵn có — rail 56px và rail cây trang phải cùng một mặt phẳng, không có đường nối lộ |
| Bề rộng sidebar | 276px | **260px**, kéo được 220–400px | Halo đã tốn 56px cho rail điều hướng; 56+260 = 316 ≈ 276 + rail |
| Chiều cao topbar | 44px | **44px** | Giữ nguyên |
| Bề rộng cột nội dung | **720px** | **720px** (`45rem`) | Giữ nguyên. *Thay số `46rem` ghi trong plan §4.4.* |
| Canh cột nội dung | giữa vùng còn lại | giữa | Giữ nguyên |
| Khoảng từ đáy topbar tới đỉnh tiêu đề | ~112px | **96px** khi không cover, **0** khi có cover | 96 nằm trên scale spacing |

### 1.2. Hàng trong cây trang

| Thứ | Notion đo được | Halo dùng |
|---|---|---|
| Chiều cao hàng | 30px | **30px** |
| Bước dọc giữa hai hàng | 31px (khe 1px) | **31px** |
| Thụt hai mép sidebar | 8px | **8px** |
| Bo góc hàng | 6px | **6px** = `--radius-sm` ✅ trùng khít |
| Icon trang | 12×12, mép trái 21px | **14×14**, mép trái 20px |
| Chữ | 14px, bắt đầu ở 46px | **14px**, bắt đầu ở **44px** |
| Chữ — hàng thường | `#bcbab6` | `var(--secondary-foreground)` `#94a3b8` |
| Chữ — hàng đang mở | `#f0efed` | `var(--foreground)` `#e2e8f0` |
| Nền hover | `rgba(255,255,255,.055)` | `var(--sidebar-accent)` `#1a1d24` |
| Nền hàng đang mở | nền đặc | `var(--sidebar-accent)` + **thanh 2px cyan** sát mép trái, cao 16px, canh giữa dọc |
| Thụt mỗi cấp | 12px | **12px**, tối đa 10 cấp |

Thanh cyan là chỗ Halo **cố ý khác** Notion: DESIGN.md giao cyan vai trò "hàng đang chọn",
và nền `#1a1d24` một mình không đủ tách khỏi hover trên nền `#0d1017`.

### 1.3. Nhãn nhóm ("Ghim", "Riêng tư", "Nhóm")

| Thứ | Notion đo được | Halo dùng |
|---|---|---|
| Cỡ chữ / độ đậm | 12px / 500 | **12px / 500** |
| Line-height | 12px | **12px** |
| Màu | `#bcbab6` | `var(--muted-foreground)` `#64748b` |
| Mép trái | 16px | **16px** |
| Chiều cao hàng chứa | 30px | **30px** |
| Thao tác bên phải | hiện khi hover (`↗` `+` `⋯`) | hiện khi hover (`+` `⋯`), `opacity 0→1`, **không** đẩy layout |

### 1.4. Vùng soạn thảo

| Thứ | Notion đo được | Halo dùng |
|---|---|---|
| Tiêu đề trang | 40px / 700 / lh 48px | **36px / 700 / lh 44px**, `Kraken-Brand`, `-0.5px` — hàng *Section Heading* của DESIGN.md |
| Thân bài | 16px / lh 24px (1.5) | **16px / lh 24px**, `Kraken-Product` |
| Chiều cao hàng khối một dòng | 40px | **40px** |
| Nút kéo `⠿` | 18×24, lệch **−28px** so mép cột | **−28px** |
| Nút chèn `+` | 24×24, lệch **−52px** so mép cột | **−52px** |
| Thứ tự trái→phải | `+` rồi `⠿` | `+` rồi `⠿` |
| Canh dọc nút | +8px so đỉnh khối | **+8px** |
| Placeholder | chữ mờ tại chỗ | `var(--muted-foreground)` — "Nhấn `/` để chèn khối" |

> Plan §4.1 ghi "máng trái −40px" là **sai** — số thật là hai máng riêng: `−28` và `−52`.
> Dùng số trong bảng này.

### 1.5. Topbar

| Thứ | Notion đo được | Halo dùng |
|---|---|---|
| Breadcrumb | 14px / 400 / `#f0efed` | **14px / 400** / `var(--foreground)`, cấp cha `var(--secondary-foreground)` |
| Dải phải | `Share` · `☆` · `⋯` | `Chia sẻ` · `☆` · `⋯` · avatar người đang xem |
| Nền | trong suốt | trong suốt, **không** viền dưới |

---

## 2. Vỏ ba cột

```
┌──────┬──────────────────┬──────────────────────────────┬─────────────┐
│ rail │ cây trang 260px  │  canvas                       │ drawer 360  │
│ 56px │ #0d1017          │  #111318                      │ #161820     │
│      │                  │                               │ (đẩy, không │
│ có   │ resizable        │  cột 720px canh giữa          │  phủ)       │
│ sẵn  │ 220–400px        │                               │             │
└──────┴──────────────────┴───────────────────────────────┴─────────────┘
```

**Không có viền dọc giữa các cột.** Phân tách bằng chênh lệch nền: `#0d1017` → `#111318`
→ `#161820`. Đây là cách Notion làm, và cũng là cách `DESIGN.md` §7 muốn ("phân tách bằng
khoảng trắng, không bằng border").

Drawer **đẩy** canvas, không phủ lên: bình luận neo vào khối — phủ lên đúng khối đang bàn
là hỏng công năng. Canvas co lại, cột 720px vẫn canh giữa vùng còn lại; dưới 1180px thì
drawer chuyển sang phủ toàn màn (mobile behaviour).

---

## 3. Từng bề mặt

### 3.1. Sidebar cây trang

Thứ tự dọc, trên xuống — **đúng thứ tự Notion**, nhãn tiếng Việt:

1. **Workspace switcher** — hàng 40px, avatar 20px + tên + `⌄`. Bấm mở dropdown: danh sách
   workspace, dấu ✓ ở cái đang mở, phân cách, "Tạo workspace mới".
2. **Tìm kiếm** — hàng 30px, icon kính lúp + "Tìm kiếm" + phím tắt `⌘K` mờ bên phải.
3. **Trang mới** — hàng 30px, icon `+`.
4. **Ghim** *(ẩn hẳn nếu rỗng — không hiện nhãn nhóm trống)*.
5. **Riêng tư** — cây trang chính.
6. **Thùng rác** — ghim đáy sidebar, tách bằng 16px khoảng trắng.

**Cây trang — hành vi:**

| Tình huống | Xử lý |
|---|---|
| Node chưa mở lần nào | Tam giác `▸` hiện, **chưa** gọi API con |
| Bấm tam giác lần đầu | Gọi `?parentId=`, tam giác quay 90° trong 120ms, con trượt xuống |
| Node đang tải con | Ba hàng skeleton 30px thay chỗ, **giữ nguyên** chiều cao để không giật |
| Node không có con | Tam giác biến mất sau lần mở đầu, thụt cấp giữ nguyên |
| Hover hàng | Nền `--sidebar-accent`; `+` và `⋯` hiện ở mép phải, `opacity 0→1` trong 80ms |
| Bấm `+` trên hàng | Tạo trang con, tự mở node cha, điều hướng sang trang mới, con trỏ nhảy vào ô tiêu đề |
| Bấm `⋯` | Menu: **Sao chép liên kết · Xoá**. Xem ghi chú bên dưới trước khi thêm mục nào khác |
| Kéo-thả | Ghost là chính hàng đó ở `opacity .5`; chỉ báo thả là **đường 2px cyan** giữa hai hàng, hoặc viền cyan quanh hàng khi thả *vào trong* |
| Thả không hợp lệ | Đường chỉ báo chuyển `--danger`, con trỏ `not-allowed`. Chặn: thả vào con cháu của chính nó, vượt 10 cấp |
| Cây rỗng | CTA giữa vùng: icon 32px mờ, "Chưa có trang nào", nút "Tạo trang đầu tiên" |
| Lỗi tải cây | `ErrorState` gọn trong sidebar, nút "Thử lại", **không** đổ stack |

> **Vì sao menu `⋯` không có "Đổi tên"** *(xác minh 2026-08-24)*
>
> `UpdatePageDto` của BE **cố ý loại `title`**, có comment giải thích ngay trong file:
> từ M2 trở đi `Y.Text` trong `Y.Doc` là nguồn sự thật, còn `Page.title` chỉ là bản sao
> phi chuẩn hoá do `DocumentStore` ghi mỗi lần `onStoreDocument` chạy. Mở lại đường ghi
> thẳng sẽ tạo hai nguồn cạnh tranh mà không có cách nào biết bản nào mới hơn.
>
> Nên **đổi tên trang chỉ làm được từ trong editor** (ô tiêu đề nối `Y.Text`, M3-T5).
> Từ M3 trở đi, mục "Đổi tên" ở đây nên **mở trang rồi đặt con trỏ vào ô tiêu đề**, chứ
> không gọi `PATCH /pages/:id`. Trước M3 thì không có mục này.
>
> "Nhân bản" cũng không có — Phase 1 không có endpoint tương ứng. "Chuyển vào…" là
> kéo-thả, thuộc M2-T7.
>
> Nguyên tắc chung: **không dựng mục menu xám vô hiệu.** Không làm được thì không hiện.

**Trạng thái gập** lưu trong `notes-ui.store`, khoá theo `workspaceId`, sống qua F5.

### 3.2. Canvas trang

Thứ tự dọc:

```
[cover 30vh — nếu có]         hover hiện "Đổi ảnh" · "Đổi vị trí" · "Xoá"
[icon 78px, đè lên cover −40px hoặc đứng riêng]
[tiêu đề 36/700]              ← nối Y.Text 'title', KHÔNG phải input form
[thân bài — BlockNote]
```

| Tình huống | Xử lý |
|---|---|
| Trang chưa có cover/icon | Hover vùng trên tiêu đề hiện hai nút mờ: "Thêm icon" · "Thêm ảnh bìa". Không chiếm chỗ khi không hover |
| Đang gõ tiêu đề | Enter → nhảy xuống khối đầu tiên của thân bài (tạo mới nếu chưa có). Tab cũng vậy |
| Trang rỗng | Một khối đoạn văn rỗng, placeholder "Nhấn `/` để chèn khối" |
| Gõ `/` | Slash menu — nhóm mục tiếng Việt: Cơ bản · Danh sách · Nâng cao · Nhúng. Lọc theo cả tên tiếng Việt lẫn tiếng Anh (`/h1`, `/tiêu đề`) |
| Quyền `VIEW`/`COMMENT` | Editor read-only. Banner mảnh trên topbar: "Bạn đang xem trang này ở chế độ chỉ đọc". **Không** dựa vào cờ client — server đã đặt `connectionConfig.readOnly` |
| Đang tải trang | Skeleton đúng nhịp: dải 36px cho tiêu đề, ba dải 24px cho thân bài, cùng bề rộng 720px. Không spinner giữa màn |
| Trang không tồn tại / mất quyền | Trang trống có icon 40px mờ + "Không tìm thấy trang này hoặc bạn không còn quyền truy cập" + nút về workspace |

### 3.3. Hiện diện và con trỏ cộng tác

- **Avatar** người đang xem: 24px, chồng `-8px`, tối đa 5 cái rồi `+N`. Viền 2px **đúng
  màu con trỏ của người đó**.
- **Bảng 8 màu** con trỏ: sinh từ hash `userId` → cùng một người ra cùng màu ở mọi máy.
  Độ sáng và bão hoà đồng nhất để đọc được trên `#111318`.
  **Cyan bị loại khỏi bảng** — cyan là màu con trỏ của *chính mình* và là màu focus ring;
  trùng màu là lỗi nhận thức chứ không phải lỗi thẩm mỹ.
- **Nhãn tên** cạnh con trỏ: hiện 2s khi con trỏ vừa di chuyển rồi mờ đi. Gõ liên tục thì
  không hiện lại — nhãn nhấp nháy theo từng phím là nhiễu.

**Chỉ báo kết nối** — góc phải topbar, chữ 12px, không chặn thao tác:

| Trạng thái | Hiện |
|---|---|
| Đang kết nối | Chấm `--warning` nhấp nháy + "Đang kết nối" |
| Đã đồng bộ | Không hiện gì. *Trạng thái tốt là trạng thái im lặng.* |
| Mất mạng | Chấm `--muted-foreground` + "Đang lưu cục bộ" |
| Bị từ chối quyền | Chấm `--danger` + lý do server trả về |
| Trang đủ 50 người | Toast một lần, lý do đúng như server nói |

### 3.4. Drawer phải — 360px

Ba tab, nhãn chữ 14px, gạch chân 2px cyan cho tab đang mở:

**Bình luận** — thread neo khối. Khối có bình luận: nền `rgba(6,182,212,.06)` mảnh và chấm
cyan 6px ở máng phải. Bấm chấm → drawer mở đúng thread, thread cuộn vào giữa. Trả lời lồng
**một cấp**, không sâu hơn. `COMMENT` trở lên mới gửi được; chỉ tác giả sửa được nội dung
của mình.

**Lịch sử** — nhóm theo ngày bằng `date-fns`, nhãn `AUTO` / `THỦ CÔNG` / `TRƯỚC KHI KHÔI
PHỤC`. Chọn một mốc → xem HTML chỉ-đọc trong drawer. Khôi phục: dialog xác nhận nói rõ
"phiên bản hiện tại sẽ được lưu lại trước khi khôi phục".

**Chia sẻ** — hai phần tách bằng đường `--border`:
- *Nội bộ:* ô chọn người (dùng `usersApi.search` của Halo), 4 vai trò. Quyền thừa kế từ
  trang cha hiện chữ mờ "kế thừa từ «Tên trang cha»" và **không** cho xoá tại đây.
- *Công khai:* toggle bật link. Bật rồi mới hiện: ô link + nút chép, mật khẩu, hạn dùng,
  `includeSubpages`, `allowIndexing`, `showAuthors`. Thu hồi link có xác nhận.

### 3.5. Tìm nhanh `⌘K` / `Ctrl+K`

- Dialog 640px, đỉnh cách mép trên 15vh — **không** canh giữa dọc. Notion làm vậy vì mắt
  đi tìm ở phần ba trên.
- Ô nhập 16px, không viền, icon kính lúp trái.
- Rỗng → "Gần đây" (10 mục, lưu client).
- Đang gõ → debounce 250ms, kết quả hiện `snippet` BE trả về với từ khoá **in đậm**, không
  đổi màu.
- Phím: `↑` `↓` di chuyển, `Enter` mở, `Esc` đóng. Hàng đang chọn nền `--sidebar-accent`.
- Không kết quả → "Không tìm thấy «...»" + gợi ý tạo trang mới cùng tên.

### 3.6. `/notes/trash`

Danh sách phẳng, mỗi hàng: icon · tên trang · đường dẫn cha mờ · "còn N ngày" · `Khôi phục`
· `Xoá vĩnh viễn`. Xoá vĩnh viễn yêu cầu **gõ đúng tên trang** — thao tác không hoàn tác
được thì phải tốn công đúng mức. Rỗng → "Thùng rác trống".

### 3.7. `/p/[token]` — trang công khai (mode Read)

Không sidebar, không rail, không editor, **không nạp chunk BlockNote**.

- Cột nội dung 720px, canh giữa, đệm trên 96px.
- Header mảnh: icon + tiêu đề + (nếu `showAuthors`) avatar tác giả.
- Footer: "Được tạo bằng Halo" — link về trang chủ.
- `allowIndexing=false` → `robots: noindex, nofollow`.
- **Cổng mật khẩu:** card 400px canh giữa, ô mật khẩu, nút "Mở khoá". Sai / hết hạn / bị
  thu hồi → **cùng một** thông báo "Liên kết không hợp lệ hoặc đã hết hạn". Không phân
  biệt — BE cố ý làm vậy để không lộ token từng tồn tại; FE không được phá vỡ điều đó.

---

## 4. Bốn trạng thái — bảng bắt buộc

Mọi component đọc data API phải khai đủ. Đây là bảng để review đối chiếu, không phải gợi ý.

| Component | Loading | Error | Empty | Data |
|---|---|---|---|---|
| `WorkspaceSwitcher` | skeleton 40px | inline + thử lại | "Tạo workspace đầu tiên" | danh sách + ✓ |
| `PageTree` | 5 skeleton 30px | inline + thử lại | CTA tạo trang | cây |
| `PageTreeRow` (mở con) | 3 skeleton thụt cấp | icon ⚠ trên hàng | tam giác biến mất | con |
| `FavoriteList` | 2 skeleton | inline | **ẩn cả nhóm** | danh sách |
| `NoteEditor` | skeleton tiêu đề + 3 dòng | trang lỗi cả màn | khối rỗng + placeholder | doc |
| `CommentThread` | 2 skeleton bubble | inline + thử lại | "Chưa có bình luận" + ô nhập | thread |
| `VersionList` | 4 skeleton hàng | inline + thử lại | "Chưa có phiên bản nào" | nhóm theo ngày |
| `ShareTab` | skeleton form | inline | — (luôn có data) | form |
| `QuickSearchDialog` | 3 skeleton hàng | inline | "Gần đây" hoặc "Không tìm thấy" | kết quả |
| `TrashList` | 4 skeleton hàng | inline + thử lại | "Thùng rác trống" | danh sách |
| `PublicPageView` | SSR — không có | trang 404 riêng | trang trống có tiêu đề | HTML |

---

## 5. Chuyển động

Ít, nhanh, có lý do. `motion` đã có sẵn trong stack.

| Chỗ | Thời lượng | Easing | Lý do |
|---|---|---|---|
| Tam giác gập/mở | 120ms | `ease-out` | Xác nhận thao tác |
| Con trượt cây trang | 160ms | `ease-out` | Cho mắt bám cấp mới |
| Nút gutter `+` `⠿` | 80ms opacity | `linear` | Phải gần như tức thì, chậm hơn là thấy trễ |
| Drawer mở/đóng | 200ms width | `cubic-bezier(.32,.72,0,1)` | Đẩy layout — cần mượt |
| Slash menu | 100ms fade + 4px trượt lên | `ease-out` | Xuất hiện tại chỗ gõ |
| Toast | dùng `sonner` sẵn có | — | Nhất quán với phần còn lại |

**`prefers-reduced-motion: reduce` → tắt hết trượt, chỉ giữ opacity.**

---

## 6. Bàn phím và trợ năng

| Phím | Việc |
|---|---|
| `⌘K` / `Ctrl+K` | Tìm nhanh |
| `⌘\` / `Ctrl+\` | Gập/mở sidebar cây trang |
| `/` trong khối rỗng | Slash menu |
| `Esc` | Đóng dialog / drawer / slash menu (theo thứ tự lớp trên cùng) |
| `↑` `↓` `Enter` | Điều hướng mọi danh sách có thể chọn |

- Cây trang là `role="tree"`, hàng là `role="treeitem"` có `aria-expanded`, `aria-level`.
- Focus ring: 2px cyan, offset 2px — **mọi** phần tử tương tác, kể cả hàng cây.
- Tương phản: chữ thường `#94a3b8` trên `#0d1017` ≈ 6.4:1 ✅. Nhãn nhóm `#64748b` trên
  `#0d1017` ≈ 3.6:1 — chỉ dùng cho nhãn 12px **không mang thông tin thiết yếu**, đúng chỗ.
- Con trỏ cộng tác **không** là kênh thông tin duy nhất: tên người luôn có ở avatar bar.

---

## 7. Phản-mục tiêu — không làm, kể cả khi Notion có

- ❌ Nền sáng, viền xám nhạt, bo góc > 12px.
- ❌ Tím / indigo ở bất kỳ đâu, kể cả con trỏ cộng tác.
- ❌ Database view, kanban, calendar, formula — **không thuộc Phase 1**. Không dựng vỏ rỗng
  cho chúng.
- ❌ AI panel của Notion.
- ❌ Sidebar có thể kéo ra thành cửa sổ nổi (peek).
- ❌ Spinner toàn màn. Skeleton đúng hình dạng nội dung, hoặc không gì cả.
- ❌ Tự viết lại `Button` / `Dialog` / `Input` — Basuicn trong `src/components/ui/` đã có.

---

## 8. Việc phải ghi vào `DESIGN.md` (task M1-T5)

Ba mở rộng có chủ đích, phải ghi lại chứ không im lặng lệch:

1. **Thân bài đọc dài:** `16px / lh 24px (1.5)`. DESIGN.md §3 đặt Body ở `16px / 1.38` —
   đó là nhịp cho bong bóng chat. Văn bản đọc liên tục nhiều phút cần 1.5, và `24px` nằm
   đúng trên scale spacing §5. *(Số này thay `1.6` ghi trong plan §4.4.)*
2. **Tiêu đề trang note** dùng hàng *Section Heading* (`Kraken-Brand 36/700/-0.5px`),
   **không** dùng *Display Hero* 48px — 48px là nhịp trang marketing, đặt vào editor sẽ ồn.
3. **Bảng 8 màu con trỏ cộng tác** — liệt kê đủ 8 hex, ghi rõ cyan bị loại và vì sao.
   Kèm cột nội dung `720px` và bộ lệch máng `−28 / −52`.
