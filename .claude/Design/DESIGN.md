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

## 9. Agent Prompt Guide

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
