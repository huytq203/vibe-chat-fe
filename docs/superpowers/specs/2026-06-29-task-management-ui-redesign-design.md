# Task Management UI Redesign — Design Spec

**Date:** 2026-06-29  
**Reference design:** `TaskFlow.dc.html`  
**Color theme:** Dark charcoal/cyan (DESIGN.md — không dùng light purple của TaskFlow)  
**Scope:** Toàn bộ feature `src/features/tasks/`

---

## 1. Mục tiêu

Thiết kế lại toàn bộ UI của phần Task Management theo layout/structure của TaskFlow.dc.html, phù hợp với:
- Dark theme (charcoal `#111318`, cyan `#06b6d4`) từ DESIGN.md
- Rule code của dự án (TypeScript strict, TanStack Query, Basuicn, Zustand)
- Chuẩn bị sẵn để ghép API thực

---

## 2. Kiến trúc tổng thể

### Layout cây

```
TaskManagementLayout (flex row, h-full, overflow-hidden)
├── AppSidebar         (w-[86px], shrink-0, bg-sidebar)
└── div.flex-col.flex-1.overflow-hidden
    ├── AppHeader      (h-[66px], bg-card, border-b border-border)
    └── main.flex-1.overflow-hidden
        ├── activeView === 'home'     → <Dashboard />
        ├── activeView === 'projects' → <ProjectsPage />
        ├── activeView === 'board'    → <BoardHeader /> + <KanbanBoard|ListView />
        └── activeView === 'reports'  → <ReportsView />
```

### Zustand store thay đổi (`tasks-ui.store.ts`)

Thêm:
```ts
type ActiveView = 'home' | 'projects' | 'board' | 'reports';
activeView: ActiveView;           // default: 'home'
setActiveView: (v: ActiveView) => void;
```

Side-effect: khi `setSelectedProjectId(id)` được gọi → tự động `activeView = 'board'`.  
Khi `setSelectedProjectId(null)` → `activeView = 'home'`.

---

## 3. AppSidebar

**File:** `src/features/tasks/components/AppSidebar.tsx`  
**Dùng:** `<Dock orientation="vertical">` từ `@/components/ui/dock/Dock`

### Cấu trúc

```
div.flex.flex-col.h-full.w-[86px].shrink-0.bg-sidebar.border-r.border-border
├── Logo "TF" (46×46, rounded-xl, gradient cyan, centered, mt-4)
├── DockSeparator (my-3)
├── Dock orientation="vertical" flex-1 — nav items
│   ├── DockIcon label="Trang chủ" → lucide: Home
│   ├── DockIcon label="Dự án"     → lucide: LayoutGrid
│   ├── DockIcon label="Nhiệm vụ"  → lucide: Columns3 (hoặc Kanban)
│   └── DockIcon label="Báo cáo"   → lucide: BarChart3
├── spacer (flex-1)
├── DockSeparator (my-3)
└── Dock orientation="vertical" — bottom items
    ├── DockIcon label="Cài đặt" → lucide: Settings (text-muted-foreground)
    └── DockIcon — Avatar vòng tròn (initials từ `useCurrentUser()` hoặc fallback "U", gradient cyan)
```

### Active item style

- Wrapper `DockIcon` khi active: `bg-cyan-500/15 text-cyan-400`
- Tooltip hiện bên phải (`side="right"`) — Dock tự xử lý khi có `label`

### Props

```ts
interface AppSidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}
```

---

## 4. AppHeader

**File:** `src/features/tasks/components/AppHeader.tsx`

### Cấu trúc

```
header.h-[66px].flex.items-center.gap-4.px-7.bg-card.border-b.border-border.shrink-0
├── div.flex-col (pageTitle + pageSub)
│   ├── pageTitle: text-xl font-bold (dựa vào activeView)
│   └── pageSub:   text-xs text-muted-foreground
├── div.flex-1
├── SearchInput (w-[280px], rounded-xl, placeholder="Tìm nhiệm vụ, dự án…")
│   — decorative only (không có API search), sẵn sàng để hook sau
├── NotificationButton (40×40, rounded-xl, relative)
│   └── unread dot (absolute, 7×7, bg-pink-500, top-2 right-2) — hardcode false ban đầu
└── Button "Tạo mới" (primary, leftIcon: Plus) → mở NewProjectModal
```

### pageTitle/pageSub mapping

| activeView | pageTitle | pageSub |
|---|---|---|
| `home` | Trang chủ | greeting theo giờ: "Chào buổi sáng" (5–11h) / "Chào buổi chiều" (12–17h) / "Chào buổi tối" (18h+) |
| `projects` | Dự án | Tổng quan tất cả dự án |
| `board` | `{project.name}` | `{project.description ?? 'Board dự án'}` |
| `reports` | Báo cáo | Thống kê & phân tích |

### Props

```ts
interface AppHeaderProps {
  activeView: ActiveView;
  selectedProject?: Project;
  onCreateProject: () => void;
}
```

---

## 5. Dashboard (viết lại)

**File:** `src/features/tasks/components/Dashboard.tsx`  
**Xử lý 4 states:** loading / error / empty / data cho cả tasks và activities

### Layout

```
ScrollArea.h-full
└── div.mx-auto.max-w-5xl.px-7.py-9
    ├── Greeting section (text-center)
    │   ├── date label (text-xs text-muted-foreground uppercase)
    │   └── "Xin chào, {name}!" (heading-xl)
    │
    ├── Zone 1: grid-cols-[1fr_360px] gap-5
    │   ├── Card "Nhiệm vụ của bạn"
    │   │   header: title + badge "{n} việc"
    │   │   body:   task items (loading/error/empty/data)
    │   │   task item: color dot (4×4) | title + project name | due badge
    │   │
    │   └── Card "Hoạt động" (360px)
    │       body: activity list (loading/error/empty/data)
    │       activity item: avatar | "who action target" | time
    │
    └── Zone 2: Card "Dự án" full-width
        header: title + "Xem tất cả →" link
        table header row: Tên dự án | Tiến độ | Việc mở | Thành viên
        data rows: DashboardProjectRow (lazy-fetch board để tính stats)
        click row → setSelectedProjectId + setActiveView('board')
```

### Data sources

- **My tasks**: hiện tại API chưa có endpoint `/me/tasks` → hiển thị empty state "Tính năng sắp ra mắt"
- **Activities**: dùng `useActivities(projectId?)` với `projectId = undefined` (tất cả) — nếu chưa có endpoint → empty state
- **Projects**: `useProjects()` — đã có

---

## 6. ProjectsPage (mới)

**File:** `src/features/tasks/components/ProjectsPage.tsx`

### Layout

```
div.h-full.overflow-auto
└── div.mx-auto.max-w-5xl.px-7.py-8
    ├── Row: Filter chip "Tất cả dự án ({n})" + spacer + "Dự án mới" Button
    │
    └── Card.rounded-2xl.overflow-hidden (loading/error/empty/data)
        ├── Table header row (grid-cols-[2fr_1.3fr_90px_130px_120px])
        │   Tên dự án | Tiến độ | Việc mở | Thành viên | Trạng thái
        └── ProjectTableRow per project
            click → setSelectedProjectId(p.id) + setActiveView('board')
```

### ProjectTableRow

```ts
// Fetch board trong từng row để tính tiến độ
function ProjectTableRow({ project }: { project: Project })
```

- Avatar stack members: `useMembers(project.id)` → chồng avatar (max 4)
- Status badge: derive từ board (0 done col tasks → "Chưa bắt đầu", có tasks → "Đang làm", tất cả done → "Hoàn thành")

---

## 7. ReportsView (mới — mock data)

**File:** `src/features/tasks/components/ReportsView.tsx`

### Layout

```
ScrollArea
└── div.mx-auto.max-w-5xl.px-7.py-8
    ├── Row 1: grid-cols-4 gap-5
    │   StatCard × 4: Tổng việc | Hoàn thành | Đang làm | Quá hạn
    │   (value lớn Lexend, delta text với màu, icon trong box màu)
    │
    ├── Row 2: grid-cols-[1.5fr_1fr] gap-5
    │   ├── Card "Nhiệm vụ hoàn thành theo ngày"
    │   │   Bar chart 7 ngày — CSS flex bars (không cần chart lib)
    │   │   bar: div với height = pct%, background cyan gradient
    │   │
    │   └── Card "Phân bổ trạng thái"
    │       Donut: div tròn với conic-gradient CSS
    │       Legend: 3 items (Đang làm, Hoàn thành, Chưa bắt đầu)
    │
    └── Row 3: Card "Khối lượng theo thành viên" full-width
        member rows: avatar | name | progress bar | "{n} việc"
```

### Mock data

Tất cả số liệu là static mock ban đầu. Ghi chú `// TODO: replace with useReports()` ở mỗi data point.  
Không tạo hook/API cho reports trong sprint này.

---

## 8. BoardHeader (sửa nhẹ)

**File:** `src/features/tasks/components/BoardHeader.tsx` — giữ nguyên logic, chỉ tweak:
- Đảm bảo màu dark theme nhất quán
- Segmented control (Board / Danh sách): dùng 2 `<button>` trong wrapper `div.bg-muted/60.rounded-xl.p-1`; active button có `bg-card shadow-sm`
- Thêm border radius và shadow nhất quán

---

## 9. Files bị xóa

- `src/features/tasks/components/ProjectList.tsx` — thay bằng AppSidebar + ProjectsPage

---

## 10. Danh sách đầy đủ files cần chạm

| File | Action | Ưu tiên |
|---|---|---|
| `stores/tasks-ui.store.ts` | Thêm `activeView` | P0 |
| `components/TaskManagementLayout.tsx` | Restructure | P0 |
| `components/AppSidebar.tsx` | Tạo mới | P0 |
| `components/AppHeader.tsx` | Tạo mới | P0 |
| `components/Dashboard.tsx` | Viết lại | P1 |
| `components/ProjectsPage.tsx` | Tạo mới | P1 |
| `components/ReportsView.tsx` | Tạo mới (mock) | P2 |
| `components/BoardHeader.tsx` | Sửa nhẹ | P2 |
| `components/ProjectList.tsx` | Xóa | P0 |
| `index.ts` | Cập nhật exports | P0 |

---

## 11. Ràng buộc kỹ thuật

- Mọi component < 200 dòng; tách sub-component hoặc hook nếu vượt
- 4 states bắt buộc cho mọi UI render data từ API
- Không import `ProjectList` sau khi xóa — kiểm tra `index.ts`
- Dock import từ `@/components/ui/dock/Dock` (không sửa file gốc)
- Chart không dùng lib mới — CSS thuần (`conic-gradient`, flex bars)
- `motion/react` đã có qua Dock — không cần import riêng

---

## 12. Không nằm trong scope

- API endpoint `/me/tasks` và `/reports/*` — UI chỉ cần empty/mock state
- Drag-and-drop trong Kanban — giữ nguyên logic hiện có
- Dark/light theme toggle — Task Management luôn dùng dark theme
- Mobile responsive — desktop-first, breakpoint 768px+ là đủ
