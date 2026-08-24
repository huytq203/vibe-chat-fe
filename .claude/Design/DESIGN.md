# Design System — Vibe Charcoal

## 1. Visual Theme & Atmosphere

Vibe Chat sử dụng palette **Charcoal + Cyan** — nền tối trung tính (không tím), accent cyan nổi bật, tương phản cao. Phong cách hiện đại kiểu developer tool / terminal, dễ đọc sau nhiều giờ.

**Key Characteristics:**
- Charcoal (`#111318`) làm nền — neutral, không tím
- Cyan (`#06b6d4`) làm brand accent — tương phản ~4.9:1 trên nền
- Foreground `#e2e8f0` — tương phản ~14:1 trên nền
- 12px radius buttons (rounded, không pill)
- Subtle shadows (`rgba(0,0,0,0.03) 0px 4px 24px`)
- Emerald (`#10b981`) cho success/online

## 2. Color Palette & Roles

### Primary (Default theme — Vibe Charcoal)
- **Cyan** (`#06b6d4`): Primary CTA, brand accent, links, focus ring
- **Charcoal** (`#111318`): Background chính
- **Cool White** (`#e2e8f0`): Foreground / text chính
- **Sidebar Dark** (`#0d1017`): Nền sidebar — sâu nhất

### Surfaces
- **Card / Bubble** (`#1a1d24`): Secondary surface
- **Header / Input** (`#161820`): Muted surface
- **Hover** (`#1d2a33`): Accent hover (gợi ý cyan nhẹ)
- **Border** (`#1e2129`): Divider tinh tế

### Text
- **Primary** (`#e2e8f0`): Heading, body text
- **Muted** (`#64748b`): Placeholder, subdued
- **Secondary** (`#94a3b8`): Label trong card

### Semantic
- **Success** (`#10b981`): Online, ok, emerald
- **Warning** (`#f59e0b`): Cảnh báo, amber
- **Danger** (`#ef4444`): Lỗi, xóa, red
- **Info** (`#38bdf8`): Link rich text, sky

## 3. Typography Rules

### Font Families
- **Display**: `Kraken-Brand`, fallbacks: `IBM Plex Sans, Helvetica, Arial`
- **UI / Body**: `Kraken-Product`, fallbacks: `Helvetica Neue, Helvetica, Arial`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Display Hero | Kraken-Brand | 48px | 700 | 1.17 | -1px |
| Section Heading | Kraken-Brand | 36px | 700 | 1.22 | -0.5px |
| Sub-heading | Kraken-Brand | 28px | 700 | 1.29 | -0.5px |
| Feature Title | Kraken-Product | 22px | 600 | 1.20 | normal |
| Body | Kraken-Product | 16px | 400 | 1.38 | normal |
| Body Medium | Kraken-Product | 16px | 500 | 1.38 | normal |
| Button | Kraken-Product | 16px | 500–600 | 1.38 | normal |
| Caption | Kraken-Product | 14px | 400–700 | 1.43–1.71 | normal |
| Small | Kraken-Product | 12px | 400–500 | 1.33 | normal |
| Micro | Kraken-Product | 7px | 500 | 1.00 | uppercase |

## 4. Component Stylings

### Buttons

**Primary Purple**
- Background: `#7132f5`
- Text: `#ffffff`
- Padding: 13px 16px
- Radius: 12px

**Purple Outlined**
- Background: `#ffffff`
- Text: `#5741d8`
- Border: `1px solid #5741d8`
- Radius: 12px

**Purple Subtle**
- Background: `rgba(133,91,251,0.16)`
- Text: `#7132f5`
- Padding: 8px
- Radius: 12px

**White Button**
- Background: `#ffffff`
- Text: `#101114`
- Radius: 10px
- Shadow: `rgba(0,0,0,0.03) 0px 4px 24px`

**Secondary Gray**
- Background: `rgba(148,151,169,0.08)`
- Text: `#101114`
- Radius: 12px

### Badges
- Success: `rgba(20,158,97,0.16)` bg, `#026b3f` text, 6px radius
- Neutral: `rgba(104,107,130,0.12)` bg, `#484b5e` text, 8px radius

## 5. Layout Principles

### Spacing: 1px, 2px, 3px, 4px, 5px, 6px, 8px, 10px, 12px, 13px, 15px, 16px, 20px, 24px, 25px
### Border Radius: 3px, 6px, 8px, 10px, 12px, 16px, 9999px, 50%

## 6. Depth & Elevation
- Subtle: `rgba(0,0,0,0.03) 0px 4px 24px`
- Micro: `rgba(16,24,40,0.04) 0px 1px 4px`

## 7. Do's and Don'ts

### Do
- Dùng Cyan (`#06b6d4`) cho CTA, link, focus ring
- Apply 12px radius trên mọi button
- Dùng IBM Plex Sans cho heading, Inter cho body

### Don't
- Không dùng pill button — 12px là max radius
- Không hardcode màu tím/indigo cũ (`#8b7cf0`, `#17171f`)
- Không thêm token màu ngoài palette Charcoal + Cyan đã định nghĩa

## 8. Responsive Behavior
Breakpoints: 375px, 425px, 640px, 768px, 1024px, 1280px, 1536px

## 9. Notes — bề mặt đọc dài

Module `/notes` là văn bản đọc liên tục nhiều phút, không phải UI chat. Ba mở rộng **có
chủ đích** dưới đây lệch khỏi các mục trên; lệch ở chỗ khác là lỗi.

Chi tiết đầy đủ (bảng đo Notion→Halo, hành vi từng bề mặt, bảng 4 trạng thái):
`docs/superpowers/specs/2026-08-24-notes-notion-ui-design.md`.

### 9.1. Typography thân trang

| Vai trò | Font | Size | Weight | Line height | Vì sao lệch |
|---------|------|------|--------|-------------|-------------|
| Thân trang note | Kraken-Product | 16px | 400 | **24px (1.5)** | §3 đặt Body ở `1.38` — đó là nhịp bong bóng chat. Văn bản dài cần thoáng hơn, và `24px` nằm sẵn trên scale spacing §5 |
| Tiêu đề trang note | Kraken-Brand | 36px | 700 | 44px, `-0.5px` | Dùng hàng *Section Heading* của §3. **Không** dùng Display Hero 48px — 48px là nhịp trang marketing, đặt vào editor sẽ ồn |

### 9.2. Hình học cột nội dung

| Thứ | Giá trị | Nguồn |
|---|---|---|
| Bề rộng cột nội dung | `720px` (`45rem`), canh giữa | Đo thật trên `app.notion.com` 2026-08-24 |
| Đệm trên khi không có ảnh bìa | `96px` | Trên scale spacing §5 |
| Máng nút chèn `+` | `−52px` so mép trái cột | Đo thật |
| Máng nút kéo `⠿` | `−28px` so mép trái cột | Đo thật |
| Hàng cây trang | cao `30px`, bước `31px`, bo `6px` | Đo thật; `6px` trùng `--radius-sm` sẵn có |

### 9.3. Bảng 8 màu con trỏ cộng tác

Màu suy ra từ hash `userId` → cùng một người ra **cùng màu ở mọi máy**. Dùng cho con trỏ
trong editor, viền avatar 24px trên thanh hiện diện, và nhãn tên.

| # | Hex | Tên | Hue |
|---|---|---|-----|
| 1 | `#f87171` | Đỏ san hô | 0° |
| 2 | `#fb923c` | Cam | 27° |
| 3 | `#facc15` | Vàng | 48° |
| 4 | `#a3e635` | Chanh | 82° |
| 5 | `#4ade80` | Lục | 142° |
| 6 | `#34d399` | Ngọc lục bảo | 160° |
| 7 | `#60a5fa` | Lam | 213° |
| 8 | `#f472b6` | Hồng | 330° |

**Cyan `#06b6d4` bị loại khỏi bảng này.** Cyan là màu con trỏ của *chính mình* và là màu
focus ring toàn app — trùng màu với con trỏ người khác là lỗi nhận thức, không phải lỗi
thẩm mỹ.

Tím / indigo cũng bị loại theo §7. Đó là lý do khoảng `250°–290°` bỏ trống, và vì sao 8
màu phải nén vào phần còn lại của vòng màu.

**Cặp yếu nhất là #5 và #6** — cách nhau 18°. Nếu thực tế 8 con trỏ cùng lúc gây nhầm, bỏ
`#34d399` và `#a3e635` để còn 6 màu. **Đừng** thêm màu mới ngoài bảng.

Cả 8 đều ở mức 400 của thang Tailwind: độ sáng đồng đều, đọc được trên cả `#111318` lẫn
`#0d1017`. Không dùng đúng hex của token semantic (`--success`, `--warning`, `--danger`,
`--info`) để màu con trỏ không bị đọc nhầm thành trạng thái.

---

## 10. Agent Prompt Guide

### Quick Color Reference
- Brand: Cyan (`#06b6d4`)
- Background: Charcoal (`#111318`)
- Foreground: Cool White (`#e2e8f0`)
- Muted text: `#64748b`
- Sidebar: `#0d1017`
- Border: `#1e2129`

### Example Component Prompts
- "Create chat bubble: bg `#1a1d24`, text `#e2e8f0`, border `#1e2129`, radius 12px."
- "Create CTA button: bg `#06b6d4`, text white, radius 12px, padding 13px 16px."
