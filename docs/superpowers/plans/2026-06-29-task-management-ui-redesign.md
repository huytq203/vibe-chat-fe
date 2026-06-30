# Task Management UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết kế lại toàn bộ UI phần Task Management theo layout TaskFlow (sidebar dock kiểu macOS + global header + 4 views: Trang chủ/Dự án/Nhiệm vụ/Báo cáo), dùng dark charcoal/cyan theme.

**Architecture:** Một `TaskManagementLayout` điều phối qua state `activeView` trong Zustand store. Sidebar dùng component `Dock` (vertical, magnification kiểu macOS). Header toàn cục đổi tiêu đề theo view. 4 view con: Dashboard, ProjectsPage, Board (giữ logic cũ), ReportsView. Các component board hiện đang hardcode màu tím sáng → convert sang semantic dark tokens.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zustand, TanStack Query v5, Basuicn (`@/components/ui/*`), Tailwind v4 semantic tokens, lucide-react, motion/react (qua Dock), Vitest + Testing Library.

## Global Constraints

- **TypeScript:** strict, KHÔNG `any` / `@ts-ignore` / `as` tùy tiện. Props type `XxxProps` ngay trên component.
- **Kích thước:** component < 200 dòng, function < 50 dòng, file < 300 dòng, hook < 80 dòng. Vượt → tách.
- **4 trạng thái:** mọi UI render data từ API phải xử lý loading / error / empty / data.
- **Data fetching:** chỉ qua TanStack Query hooks có sẵn (`useProjects`, `useBoard`, `useMembers`). CẤM `useEffect + fetch`.
- **Basuicn:** dùng `@/components/ui/*` (Button, Card, Input, Badge, Avatar, ScrollArea, Progress, Tooltip, Dock). KHÔNG tự viết primitive, KHÔNG sửa file trong `components/ui/`.
- **Named export** bắt buộc (trừ Page/Layout của Next).
- **Color tokens (BẮT BUỘC — không hardcode hex):**
  | Vai trò | Class |
  |---|---|
  | Nền chính | `bg-background` (#111318) |
  | Card / surface nổi | `bg-secondary` (#1a1d24) |
  | Header / input surface | `bg-muted` (#161820) |
  | Hover surface | `bg-accent` / `hover:bg-accent` (#1d2a33) |
  | Text chính | `text-foreground` |
  | Text phụ / placeholder | `text-muted-foreground` |
  | Text label | `text-secondary-foreground` |
  | Border | `border-border` (#1e2129) |
  | Brand accent (cyan) | `bg-primary` / `text-primary` (#06b6d4) |
  | Accent subtle | `bg-primary/10`, `bg-primary/15` |
  | Sidebar | `bg-sidebar` (#0d1017) |
  | Success / Warning / Danger / Info | `text-success` / `text-warning` / `text-danger` / `text-info` |
  | Chart series | `bg-chart-1` … `bg-chart-5` |
- **Test:** `npm run test` (vitest run). Dùng `renderWithProviders` từ `@/test/test-utils`. Typecheck: `npm run typecheck`.
- **KHÔNG auto-commit** — user commit thủ công (memory: feedback_no_commit). Các "Commit" step ghi rõ command để user chạy, KHÔNG tự `git commit`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `stores/tasks-ui.store.ts` | + `activeView` state & `setActiveView`; `setSelectedProjectId` side-effect đổi view |
| `components/AppSidebar.tsx` | Sidebar 86px dùng Dock vertical, nav 4 view + avatar |
| `components/AppHeader.tsx` | Header toàn cục: tiêu đề theo view + search + chuông + nút Tạo mới |
| `components/Dashboard.tsx` | View "Trang chủ" — viết lại layout 3 panel |
| `components/ProjectsPage.tsx` | View "Dự án" — bảng danh sách project |
| `components/ReportsView.tsx` | View "Báo cáo" — stat cards + charts (mock data) |
| `components/TaskManagementLayout.tsx` | Khung điều phối sidebar + header + view |
| `components/BoardHeader.tsx` | Convert màu → dark token |
| `components/KanbanBoard.tsx`, `Column.tsx`, `TaskCard.tsx` | Convert màu → dark token |
| `components/ProjectList.tsx` | **XÓA** (thay bằng AppSidebar + ProjectsPage) |
| `index.ts` | Cập nhật exports nếu cần |

---

## Task 1: Store — thêm `activeView`

**Files:**
- Modify: `src/features/tasks/stores/tasks-ui.store.ts`
- Test: `src/features/tasks/stores/tasks-ui.store.test.ts` (create)

**Interfaces:**
- Produces:
  - `type ActiveView = 'home' | 'projects' | 'board' | 'reports'`
  - state `activeView: ActiveView` (default `'home'`)
  - `setActiveView: (v: ActiveView) => void`
  - `setSelectedProjectId(id)`: khi `id` truthy → `activeView = 'board'`; khi `null` → `activeView = 'home'`

- [ ] **Step 1: Viết test thất bại**

Create `src/features/tasks/stores/tasks-ui.store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTasksUIStore } from './tasks-ui.store';

describe('tasks-ui.store activeView', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null });
  });

  it('mặc định activeView là home', () => {
    expect(useTasksUIStore.getState().activeView).toBe('home');
  });

  it('setActiveView đổi view', () => {
    useTasksUIStore.getState().setActiveView('reports');
    expect(useTasksUIStore.getState().activeView).toBe('reports');
  });

  it('chọn project sẽ chuyển sang board', () => {
    useTasksUIStore.getState().setSelectedProjectId('p1');
    expect(useTasksUIStore.getState().selectedProjectId).toBe('p1');
    expect(useTasksUIStore.getState().activeView).toBe('board');
  });

  it('bỏ chọn project (null) quay về home', () => {
    useTasksUIStore.getState().setSelectedProjectId('p1');
    useTasksUIStore.getState().setSelectedProjectId(null);
    expect(useTasksUIStore.getState().activeView).toBe('home');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- tasks-ui.store`
Expected: FAIL — `activeView` / `setActiveView` chưa tồn tại.

- [ ] **Step 3: Cập nhật store**

Sửa `src/features/tasks/stores/tasks-ui.store.ts`:

```ts
'use client';

import { create } from 'zustand';

export type ActiveView = 'home' | 'projects' | 'board' | 'reports';

type SettingsModalState = { open: true; tab: 'info' | 'share' | 'labels' } | { open: false };

type TasksUIState = {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  boardView: 'board' | 'list';
  setBoardView: (v: 'board' | 'list') => void;
  settingsModal: SettingsModalState;
  openSettings: (tab?: 'info' | 'share' | 'labels') => void;
  closeSettings: () => void;
};

export const useTasksUIStore = create<TasksUIState>((set) => ({
  activeView: 'home',
  setActiveView: (v) => set({ activeView: v }),
  selectedProjectId: null,
  setSelectedProjectId: (id) =>
    set({ selectedProjectId: id, activeView: id ? 'board' : 'home' }),
  selectedTaskId: null,
  openTask: (id) => set({ selectedTaskId: id }),
  closeTask: () => set({ selectedTaskId: null }),
  boardView: 'board',
  setBoardView: (v) => set({ boardView: v }),
  settingsModal: { open: false },
  openSettings: (tab = 'info') => set({ settingsModal: { open: true, tab } }),
  closeSettings: () => set({ settingsModal: { open: false } }),
}));
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- tasks-ui.store`
Expected: PASS (4 test).

- [ ] **Step 5: Commit (user chạy)**

```bash
git add src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/stores/tasks-ui.store.test.ts
git commit -m "feat(tasks): add activeView state to UI store"
```

---

## Task 2: AppSidebar — Dock dọc kiểu macOS

**Files:**
- Create: `src/features/tasks/components/AppSidebar.tsx`
- Test: `src/features/tasks/components/AppSidebar.test.tsx` (create)

**Interfaces:**
- Consumes: `ActiveView` (Task 1); `Dock`, `DockIcon`, `DockSeparator` từ `@/components/ui/dock/Dock`; `getCurrentUser` từ `../lib/current-user`.
- Produces: `AppSidebar` component, props:
  ```ts
  interface AppSidebarProps {
    activeView: ActiveView;
    onNavigate: (view: ActiveView) => void;
  }
  ```

- [ ] **Step 1: Viết test thất bại**

Create `src/features/tasks/components/AppSidebar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
  it('render đủ 4 mục điều hướng', () => {
    renderWithProviders(<AppSidebar activeView="home" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dự án' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhiệm vụ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Báo cáo' })).toBeInTheDocument();
  });

  it('bấm mục gọi onNavigate đúng view', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<AppSidebar activeView="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(onNavigate).toHaveBeenCalledWith('reports');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- AppSidebar`
Expected: FAIL — `AppSidebar` chưa tồn tại.

- [ ] **Step 3: Tạo AppSidebar**

Create `src/features/tasks/components/AppSidebar.tsx`:

```tsx
'use client';

import { Home, LayoutGrid, Columns3, BarChart3, Settings } from 'lucide-react';
import { Dock, DockIcon, DockSeparator } from '@/components/ui/dock/Dock';
import { cn } from '@/lib/utils/cn';
import { getCurrentUser } from '../lib/current-user';
import type { ActiveView } from '../stores/tasks-ui.store';

interface AppSidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

const NAV_ITEMS: { view: ActiveView; label: string; Icon: typeof Home }[] = [
  { view: 'home', label: 'Trang chủ', Icon: Home },
  { view: 'projects', label: 'Dự án', Icon: LayoutGrid },
  { view: 'board', label: 'Nhiệm vụ', Icon: Columns3 },
  { view: 'reports', label: 'Báo cáo', Icon: BarChart3 },
];

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const user = getCurrentUser();
  const initial = (user?.displayName ?? 'U').charAt(0).toUpperCase();

  return (
    <aside className="flex h-full w-[86px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-4">
      <span className="grid h-[46px] w-[46px] place-items-center rounded-xl bg-gradient-to-br from-primary to-cyan-600 text-lg font-extrabold text-white shadow-lg">
        TF
      </span>

      <DockSeparator className="my-4" />

      <Dock orientation="vertical" iconSize={44} iconMagnification={58} className="flex-1 border-0 bg-transparent p-0">
        {NAV_ITEMS.map(({ view, label, Icon }) => (
          <DockIcon
            key={view}
            label={label}
            aria-label={label}
            onClick={() => onNavigate(view)}
            className={cn(
              'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
              activeView === view && 'bg-primary/15 text-primary',
            )}
          >
            <Icon className="h-5 w-5" />
          </DockIcon>
        ))}
      </Dock>

      <DockSeparator className="my-3" />

      <Dock orientation="vertical" iconSize={40} iconMagnification={52} className="border-0 bg-transparent p-0">
        <DockIcon label="Cài đặt" aria-label="Cài đặt" className="bg-transparent text-muted-foreground hover:bg-accent">
          <Settings className="h-5 w-5" />
        </DockIcon>
        <DockIcon
          label={user?.displayName ?? 'Tài khoản'}
          aria-label={user?.displayName ?? 'Tài khoản'}
          className="bg-gradient-to-br from-primary to-cyan-600 text-sm font-bold text-white"
        >
          {initial}
        </DockIcon>
      </Dock>
    </aside>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- AppSidebar`
Expected: PASS (2 test).

> Lưu ý: `DockIcon` render `<button aria-label>`; test query theo accessible name. Nếu Tooltip bọc gây nhiều button, vẫn ok vì label nằm trên button thật.

- [ ] **Step 5: Commit (user chạy)**

```bash
git add src/features/tasks/components/AppSidebar.tsx src/features/tasks/components/AppSidebar.test.tsx
git commit -m "feat(tasks): add AppSidebar with macOS-style vertical dock"
```

---

## Task 3: AppHeader — header toàn cục

**Files:**
- Create: `src/features/tasks/components/AppHeader.tsx`
- Test: `src/features/tasks/components/AppHeader.test.tsx` (create)

**Interfaces:**
- Consumes: `ActiveView` (Task 1); `Project` từ `../types`; Basuicn `Button`, `Input`; `Bell`, `Plus`, `Search` từ lucide.
- Produces: `AppHeader`, props:
  ```ts
  interface AppHeaderProps {
    activeView: ActiveView;
    selectedProject?: Project;
    onCreateProject: () => void;
  }
  ```
  + helper `headerTitle(activeView, project?): { title: string; sub: string }` (export để test).

- [ ] **Step 1: Viết test thất bại**

Create `src/features/tasks/components/AppHeader.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { AppHeader, headerTitle } from './AppHeader';

describe('headerTitle', () => {
  it('home → Trang chủ', () => {
    expect(headerTitle('home').title).toBe('Trang chủ');
  });
  it('reports → Báo cáo', () => {
    expect(headerTitle('reports').title).toBe('Báo cáo');
  });
  it('board lấy tên project', () => {
    const p = { id: 'p1', name: 'Dự án A' } as never;
    expect(headerTitle('board', p).title).toBe('Dự án A');
  });
});

describe('AppHeader', () => {
  it('nút Tạo mới gọi onCreateProject', () => {
    const onCreate = vi.fn();
    renderWithProviders(<AppHeader activeView="home" onCreateProject={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /tạo mới/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- AppHeader`
Expected: FAIL — `AppHeader` chưa tồn tại.

- [ ] **Step 3: Tạo AppHeader**

Create `src/features/tasks/components/AppHeader.tsx`:

```tsx
'use client';

import { Bell, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import type { ActiveView } from '../stores/tasks-ui.store';
import type { Project } from '../types';

interface AppHeaderProps {
  activeView: ActiveView;
  selectedProject?: Project;
  onCreateProject: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function headerTitle(
  activeView: ActiveView,
  project?: Project,
): { title: string; sub: string } {
  switch (activeView) {
    case 'home':
      return { title: 'Trang chủ', sub: greeting() };
    case 'projects':
      return { title: 'Dự án', sub: 'Tổng quan tất cả dự án' };
    case 'reports':
      return { title: 'Báo cáo', sub: 'Thống kê & phân tích' };
    case 'board':
      return {
        title: project?.name ?? 'Nhiệm vụ',
        sub: project?.description ?? 'Board dự án',
      };
  }
}

export function AppHeader({ activeView, selectedProject, onCreateProject }: AppHeaderProps) {
  const { title, sub } = headerTitle(activeView, selectedProject);

  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-border bg-background px-7">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-xl font-bold leading-tight text-foreground">{title}</h1>
        <span className="truncate text-xs text-muted-foreground">{sub}</span>
      </div>

      <div className="flex-1" />

      <Input
        icon={<Search className="h-4 w-4" />}
        placeholder="Tìm nhiệm vụ, dự án…"
        className="hidden h-10 w-[280px] rounded-xl md:flex"
        aria-label="Tìm kiếm"
      />

      <button
        type="button"
        aria-label="Thông báo"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:bg-accent"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateProject}>
        Tạo mới
      </Button>
    </header>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- AppHeader`
Expected: PASS (4 test).

- [ ] **Step 5: Commit (user chạy)**

```bash
git add src/features/tasks/components/AppHeader.tsx src/features/tasks/components/AppHeader.test.tsx
git commit -m "feat(tasks): add global AppHeader with per-view titles"
```

---

## Task 4: TaskManagementLayout — khung điều phối + xóa ProjectList

**Files:**
- Modify: `src/test/setup.ts` (thêm 2 env var task-service còn thiếu — xem Step 0)
- Modify: `src/features/tasks/components/TaskManagementLayout.tsx`
- Delete: `src/features/tasks/components/ProjectList.tsx`
- Create: `src/features/tasks/components/ProjectsPage.tsx` (bản tối thiểu để build pass; hoàn thiện ở Task 6)
- Create: `src/features/tasks/components/ReportsView.tsx` (bản tối thiểu; hoàn thiện ở Task 7)
- Test: `src/features/tasks/components/TaskManagementLayout.test.tsx` (create)

**Step 0 (BẮT BUỘC trước test): vá test env**

`src/test/setup.ts` đang thiếu `NEXT_PUBLIC_TASK_URL` và `NEXT_PUBLIC_TASK_WS_URL` mà `src/config/env.ts` yêu cầu (`.url()`, không optional). Thiếu → mọi test render component import `tasksApi`/`current-user` sẽ throw "Invalid environment variables". Thêm 2 dòng vào object `TEST_ENV` trong `setup.ts`:

```ts
const TEST_ENV: Record<string, string> = {
  NEXT_PUBLIC_AUTH_URL: 'http://localhost:3006',
  NEXT_PUBLIC_VIBE_URL: 'http://localhost:3005',
  NEXT_PUBLIC_WS_URL: 'http://localhost:3005/chat',
  NEXT_PUBLIC_CALL_WS_URL: 'http://localhost:3005/call',
  NEXT_PUBLIC_TASK_URL: 'http://localhost:3007',
  NEXT_PUBLIC_TASK_WS_URL: 'http://localhost:3007/tasks',
};
```

Sau vá này, layout test render được toàn bộ cây mà KHÔNG cần mock `current-user`/hooks (react-query `retry:false` trong test-utils → query fail mạng êm, component vẫn render).

**Interfaces:**
- Consumes: `AppSidebar` (Task 2), `AppHeader` (Task 3), `Dashboard`, `BoardHeader`, `KanbanBoard`, `ListView`, `TaskDetailModal`, `ProjectSettingsModal`, `NewProjectModal`; store `activeView`, `setActiveView`, `selectedProjectId`.
- Produces: layout render đúng view theo `activeView`.

- [ ] **Step 1: Tạo bản tối thiểu ProjectsPage & ReportsView (placeholder build-pass)**

Create `src/features/tasks/components/ProjectsPage.tsx`:

```tsx
'use client';

export function ProjectsPage() {
  return <div className="p-7 text-muted-foreground">Đang tải dự án…</div>;
}
```

Create `src/features/tasks/components/ReportsView.tsx`:

```tsx
'use client';

export function ReportsView() {
  return <div className="p-7 text-muted-foreground">Báo cáo đang được xây dựng…</div>;
}
```

- [ ] **Step 2: Viết test thất bại cho layout**

Create `src/features/tasks/components/TaskManagementLayout.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { TaskManagementLayout } from './TaskManagementLayout';
import { useTasksUIStore } from '../stores/tasks-ui.store';

describe('TaskManagementLayout', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null });
  });

  it('mặc định hiển thị Trang chủ và sidebar', () => {
    renderWithProviders(<TaskManagementLayout />);
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toBeInTheDocument();
  });

  it('bấm Báo cáo chuyển sang ReportsView', () => {
    renderWithProviders(<TaskManagementLayout />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(useTasksUIStore.getState().activeView).toBe('reports');
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `npm run test -- TaskManagementLayout`
Expected: FAIL — layout cũ chưa có AppSidebar/AppHeader.

- [ ] **Step 4: Viết lại TaskManagementLayout**

Replace `src/features/tasks/components/TaskManagementLayout.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Dashboard } from './Dashboard';
import { ProjectsPage } from './ProjectsPage';
import { ReportsView } from './ReportsView';
import { BoardHeader } from './BoardHeader';
import { KanbanBoard } from './KanbanBoard';
import { ListView } from './ListView';
import { TaskDetailModal } from './TaskDetailModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { NewProjectModal } from './NewProjectModal';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import { useProjects } from '../hooks/useProjects';

export function TaskManagementLayout() {
  const activeView = useTasksUIStore((s) => s.activeView);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const { data: projects = [] } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedId);

  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          activeView={activeView}
          selectedProject={selectedProject}
          onCreateProject={() => setNewProjectOpen(true)}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {activeView === 'home' && <Dashboard />}
          {activeView === 'projects' && <ProjectsPage />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'board' &&
            (selectedId && selectedProject ? (
              <div className="flex h-full flex-col">
                <BoardHeader projectId={selectedId} />
                {boardView === 'board' ? (
                  <KanbanBoard key={selectedId} projectId={selectedId} />
                ) : (
                  <ListView projectId={selectedId} />
                )}
                <TaskDetailModal projectId={selectedId} />
                <ProjectSettingsModal project={selectedProject} />
              </div>
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                Chọn một dự án để xem bảng nhiệm vụ.
              </div>
            ))}
        </main>
      </div>

      <NewProjectModal open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Xóa ProjectList và cập nhật import**

```bash
rm src/features/tasks/components/ProjectList.tsx
grep -rn "ProjectList" src/features/tasks || echo "Không còn tham chiếu ProjectList"
```

Nếu `grep` còn ra dòng nào (ngoài kết quả rỗng), xóa import đó. `index.ts` hiện không export ProjectList → không cần sửa.

- [ ] **Step 6: Chạy test + typecheck để xác nhận PASS**

Run: `npm run test -- TaskManagementLayout` → Expected: PASS (2 test).
Run: `npm run typecheck` → Expected: không lỗi liên quan tasks.

- [ ] **Step 7: Commit (user chạy)**

```bash
git add src/test/setup.ts \
        src/features/tasks/components/TaskManagementLayout.tsx \
        src/features/tasks/components/TaskManagementLayout.test.tsx \
        src/features/tasks/components/ProjectsPage.tsx \
        src/features/tasks/components/ReportsView.tsx
git rm src/features/tasks/components/ProjectList.tsx
git commit -m "feat(tasks): restructure layout with sidebar+header, remove ProjectList"
```

---

## Task 5: Dashboard — viết lại view Trang chủ

**Files:**
- Create: `src/features/tasks/lib/board-progress.ts` (helper dùng chung với Task 6)
- Modify: `src/features/tasks/components/Dashboard.tsx` (viết lại)
- Create: `src/features/tasks/components/dashboard/DashboardProjectRow.tsx`
- Test: `src/features/tasks/lib/board-progress.test.ts` (create)
- Test: `src/features/tasks/components/Dashboard.test.tsx` (create)

**Interfaces:**
- Consumes: `useProjects()` → `{ data?: Project[], isLoading, isError }`; `useBoard(projectId)` (trong row); store `setSelectedProjectId`.
- Produces:
  - `computeBoardProgress(board: Board | undefined): { total: number; done: number; open: number; pct: number }` — **Task 6 cũng dùng hàm này** (không lặp logic).
  - `Dashboard` (no props); `DashboardProjectRow` props `{ project: Project }`.

> Ghi chú dữ liệu: KHÔNG có endpoint "task của tôi" hay "activity toàn cục" → 2 panel đó hiển thị **empty state "sắp ra mắt"**, KHÔNG gọi API. Chỉ panel "Dự án" có data thật.

- [ ] **Step 1: Viết test thất bại cho helper board-progress**

Create `src/features/tasks/lib/board-progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBoardProgress } from './board-progress';
import type { Board } from '../types';

function board(cols: { isDoneCol: boolean; n: number }[]): Board {
  return {
    project: {} as never,
    columns: cols.map((c, i) => ({
      id: `c${i}`,
      name: 'c',
      color: null,
      position: i,
      isDoneCol: c.isDoneCol,
      tasks: Array.from({ length: c.n }, (_, j) => ({ id: `t${i}-${j}` })) as never,
    })),
  };
}

describe('computeBoardProgress', () => {
  it('board undefined → 0', () => {
    expect(computeBoardProgress(undefined)).toEqual({ total: 0, done: 0, open: 0, pct: 0 });
  });
  it('tính done/open/pct', () => {
    const r = computeBoardProgress(board([{ isDoneCol: false, n: 3 }, { isDoneCol: true, n: 1 }]));
    expect(r).toEqual({ total: 4, done: 1, open: 3, pct: 25 });
  });
  it('board rỗng → pct 0', () => {
    expect(computeBoardProgress(board([])).pct).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- board-progress`
Expected: FAIL — `computeBoardProgress` chưa tồn tại.

- [ ] **Step 3: Tạo helper board-progress**

Create `src/features/tasks/lib/board-progress.ts`:

```ts
import type { Board } from '../types';

export interface BoardProgress {
  total: number;
  done: number;
  open: number;
  pct: number;
}

export function computeBoardProgress(board: Board | undefined): BoardProgress {
  if (!board) return { total: 0, done: 0, open: 0, pct: 0 };
  let total = 0;
  let done = 0;
  for (const col of board.columns) {
    total += col.tasks.length;
    if (col.isDoneCol) done += col.tasks.length;
  }
  return { total, done, open: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- board-progress`
Expected: PASS (3 test).

- [ ] **Step 5: Tạo DashboardProjectRow**

Create `src/features/tasks/components/dashboard/DashboardProjectRow.tsx`:

```tsx
'use client';

import { ListTodo } from 'lucide-react';
import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
import { useBoard } from '../../hooks/useBoard';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { computeBoardProgress } from '../../lib/board-progress';
import type { Project } from '../../types';

export function DashboardProjectRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data: board, isLoading } = useBoard(project.id);
  const stats = computeBoardProgress(board);

  return (
    <button
      type="button"
      onClick={() => setSelected(project.id)}
      className="grid grid-cols-[1.6fr_1fr_90px] items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ListTodo className="h-4 w-4" />
        </span>
        <Text size="sm" weight="medium" truncate>
          {project.name}
        </Text>
      </span>
      <span className="flex items-center gap-2">
        <Progress value={stats.pct} size="sm" variant="gradient" className="max-w-[140px]" />
        <Text size="xs" color="muted" numeric>
          {isLoading ? '…' : `${stats.pct}%`}
        </Text>
      </span>
      <Badge variant="outline" size="sm" className="w-fit">
        {isLoading ? '…' : `${stats.open} mở`}
      </Badge>
    </button>
  );
}
```

- [ ] **Step 6: Viết test thất bại cho Dashboard**

Create `src/features/tasks/components/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsMock = vi.fn();
vi.mock('../hooks/useProjects', () => ({ useProjects: () => useProjectsMock() }));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));

import { Dashboard } from './Dashboard';

describe('Dashboard — 4 states panel Dự án', () => {
  beforeEach(() => useProjectsMock.mockReset());

  it('loading', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Đang tải dự án…')).toBeInTheDocument();
  });

  it('error', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsMock.mockReturnValue({
      data: [{ id: 'p1', name: 'Dự án A' }],
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dự án A')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Chạy test để xác nhận FAIL**

Run: `npm run test -- Dashboard`
Expected: FAIL — text chưa khớp / Dashboard cũ.

- [ ] **Step 8: Viết lại Dashboard**

Replace `src/features/tasks/components/Dashboard.tsx`:

```tsx
'use client';

import { CheckCircle2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useProjects } from '../hooks/useProjects';
import { DashboardProjectRow } from './dashboard/DashboardProjectRow';

function ComingSoonPanel({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <Text weight="medium">{title}</Text>
      <Text size="sm" color="muted">{desc}</Text>
    </div>
  );
}

export function Dashboard() {
  const { data: projects, isLoading, isError } = useProjects();

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nhiệm vụ của bạn</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoonPanel
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Chưa có nhiệm vụ được giao"
                desc="Danh sách việc của bạn sẽ xuất hiện ở đây."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoonPanel
                icon={<Bell className="h-6 w-6" />}
                title="Yên bình quá…"
                desc="Chưa có hoạt động nào."
              />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Dự án</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading && <Text size="sm" color="muted">Đang tải dự án…</Text>}
            {isError && <Text size="sm" color="muted">Không tải được danh sách dự án.</Text>}
            {!isLoading && !isError && (projects?.length ?? 0) === 0 && (
              <Text size="sm" color="muted">Chưa có dự án. Bấm “Tạo mới” để bắt đầu.</Text>
            )}
            <div className="flex flex-col">
              {(projects ?? []).map((p) => (
                <DashboardProjectRow key={p.id} project={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 9: Chạy test để xác nhận PASS**

Run: `npm run test -- Dashboard`
Expected: PASS (4 test).

- [ ] **Step 10: Commit (user chạy)**

```bash
git add src/features/tasks/lib/board-progress.ts \
        src/features/tasks/lib/board-progress.test.ts \
        src/features/tasks/components/Dashboard.tsx \
        src/features/tasks/components/dashboard/DashboardProjectRow.tsx \
        src/features/tasks/components/Dashboard.test.tsx
git commit -m "feat(tasks): rewrite Dashboard with 3-panel dark layout"
```

---

## Task 6: ProjectsPage — bảng danh sách dự án

**Files:**
- Modify: `src/features/tasks/components/ProjectsPage.tsx` (viết đầy đủ thay placeholder Task 4)
- Create: `src/features/tasks/components/projects/ProjectTableRow.tsx`
- Test: `src/features/tasks/components/ProjectsPage.test.tsx` (create)

**Interfaces:**
- Consumes: `useProjects()`, `useBoard(projectId)`, `useMembers(projectId)`, store `setSelectedProjectId`; `computeBoardProgress` từ `../../lib/board-progress` (tạo ở Task 5); Basuicn `Card`, `Button`, `Badge`, `Avatar`, `Progress`, `Text`.
- Produces: `ProjectsPage` (no props); `ProjectTableRow` props `{ project: Project }`.

- [ ] **Step 1: Tạo ProjectTableRow**

Create `src/features/tasks/components/projects/ProjectTableRow.tsx`:

```tsx
'use client';

import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Text } from '@/components/ui/typography/Typography';
import { useBoard } from '../../hooks/useBoard';
import { useMembers } from '../../hooks/useMembers';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { computeBoardProgress } from '../../lib/board-progress';
import type { Project } from '../../types';

function statusOf(open: number, total: number): { label: string; variant: 'soft-primary' | 'soft-success' | 'outline' } {
  if (total === 0) return { label: 'Chưa bắt đầu', variant: 'outline' };
  if (open === 0) return { label: 'Hoàn thành', variant: 'soft-success' };
  return { label: 'Đang làm', variant: 'soft-primary' };
}

export function ProjectTableRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data: board, isLoading } = useBoard(project.id);
  const { data: members = [] } = useMembers(project.id);

  const stats = computeBoardProgress(board);
  const status = statusOf(stats.open, stats.total);
  const visible = members.slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => setSelected(project.id)}
      className="grid grid-cols-[2fr_1.3fr_90px_130px_120px] items-center gap-4 border-b border-border px-6 py-4 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <Text weight="medium" truncate>{project.name}</Text>
      </span>
      <span className="flex items-center gap-2">
        <Progress value={stats.pct} size="sm" variant="gradient" className="max-w-[160px]" />
        <Text size="xs" color="muted" numeric>{isLoading ? '…' : `${stats.pct}%`}</Text>
      </span>
      <Text size="sm" weight="medium">{isLoading ? '…' : stats.open}</Text>
      <span className="flex -space-x-2">
        {visible.map((m) => (
          <Avatar key={m.userId} src={m.avatarUrl ?? undefined} fallback={m.displayName.charAt(0).toUpperCase()} size="sm" className="border-2 border-background" />
        ))}
      </span>
      <Badge variant={status.variant} size="sm" className="w-fit">{status.label}</Badge>
    </button>
  );
}
```

> Kiểm tra biến thể `Badge`: `soft-primary`, `soft-success`, `outline` phải tồn tại. Nếu repo dùng tên khác, đọc `src/components/ui/badge/Badge.tsx` và thay cho đúng.

- [ ] **Step 2: Viết test thất bại cho ProjectsPage**

Create `src/features/tasks/components/ProjectsPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsMock = vi.fn();
vi.mock('../hooks/useProjects', () => ({ useProjects: () => useProjectsMock() }));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

import { ProjectsPage } from './ProjectsPage';

describe('ProjectsPage — 4 states', () => {
  beforeEach(() => useProjectsMock.mockReset());

  it('loading', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/đang tải/i)).toBeInTheDocument();
  });

  it('error', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsMock.mockReturnValue({ data: [{ id: 'p1', name: 'Alpha' }], isLoading: false, isError: false });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `npm run test -- ProjectsPage`
Expected: FAIL — ProjectsPage còn là placeholder.

- [ ] **Step 4: Viết đầy đủ ProjectsPage**

Replace `src/features/tasks/components/ProjectsPage.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useProjects } from '../hooks/useProjects';
import { ProjectTableRow } from './projects/ProjectTableRow';
import { NewProjectModal } from './NewProjectModal';

const HEADERS = ['Tên dự án', 'Tiến độ', 'Việc mở', 'Thành viên', 'Trạng thái'];

export function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const count = projects?.length ?? 0;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <div className="mb-5 flex items-center gap-3">
          <Badge variant="soft-primary" size="md">Tất cả dự án · {count}</Badge>
          <div className="flex-1" />
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
            Dự án mới
          </Button>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="grid grid-cols-[2fr_1.3fr_90px_130px_120px] gap-4 border-b border-border bg-muted px-6 py-4">
            {HEADERS.map((h) => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</span>
            ))}
          </div>

          {isLoading && <div className="px-6 py-8"><Text size="sm" color="muted">Đang tải dự án…</Text></div>}
          {isError && <div className="px-6 py-8"><Text size="sm" color="muted">Không tải được danh sách dự án.</Text></div>}
          {!isLoading && !isError && count === 0 && (
            <div className="px-6 py-8"><Text size="sm" color="muted">Chưa có dự án. Bấm “Dự án mới” để tạo.</Text></div>
          )}
          {(projects ?? []).map((p) => (
            <ProjectTableRow key={p.id} project={p} />
          ))}
        </Card>
      </div>

      <NewProjectModal open={newOpen} onOpenChange={setNewOpen} />
    </ScrollArea>
  );
}
```

> Kiểm tra `Card` có prop `padding="none"`. Nếu không, bỏ prop và thêm `className="p-0"`. Kiểm tra `Badge` có `size="md"`; nếu không dùng `size="sm"`.

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npm run test -- ProjectsPage`
Expected: PASS (4 test).

- [ ] **Step 6: Commit (user chạy)**

```bash
git add src/features/tasks/components/ProjectsPage.tsx \
        src/features/tasks/components/projects/ProjectTableRow.tsx \
        src/features/tasks/components/ProjectsPage.test.tsx
git commit -m "feat(tasks): add ProjectsPage table view"
```

---

## Task 7: ReportsView — báo cáo (mock data)

**Files:**
- Modify: `src/features/tasks/components/ReportsView.tsx` (viết đầy đủ thay placeholder Task 4)
- Create: `src/features/tasks/components/reports/StatCard.tsx`
- Test: `src/features/tasks/components/ReportsView.test.tsx` (create)

**Interfaces:**
- Consumes: Basuicn `Card`, `Progress`, `Avatar`, `Text`; lucide icons.
- Produces: `ReportsView` (no props); `StatCard` props `{ label: string; value: string; delta: string; deltaTone: 'up' | 'down'; icon: React.ReactNode }`.

> Toàn bộ số liệu là **mock tĩnh** — mỗi điểm dữ liệu kèm `// TODO: replace with useReports()`.

- [ ] **Step 1: Tạo StatCard**

Create `src/features/tasks/components/reports/StatCard.tsx`:

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card/Card';
import { Text } from '@/components/ui/typography/Typography';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down';
  icon: React.ReactNode;
}

export function StatCard({ label, value, delta, deltaTone, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between">
          <Text size="sm" color="muted">{label}</Text>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
        <Text size="xs" weight="medium" className={cn('mt-1', deltaTone === 'up' ? 'text-success' : 'text-danger')}>
          {delta}
        </Text>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Viết test thất bại cho ReportsView**

Create `src/features/tasks/components/ReportsView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ReportsView } from './ReportsView';

describe('ReportsView', () => {
  it('hiển thị 4 stat card', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText('Tổng việc')).toBeInTheDocument();
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('Đang làm')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
  });

  it('hiển thị tiêu đề biểu đồ', () => {
    renderWithProviders(<ReportsView />);
    expect(screen.getByText(/hoàn thành theo ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/phân bổ trạng thái/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `npm run test -- ReportsView`
Expected: FAIL — ReportsView còn placeholder.

- [ ] **Step 4: Viết đầy đủ ReportsView**

Replace `src/features/tasks/components/ReportsView.tsx`:

```tsx
'use client';

import { ListTodo, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Progress } from '@/components/ui/progress/Progress';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { StatCard } from './reports/StatCard';

// TODO: replace with useReports()
const STATS = [
  { label: 'Tổng việc', value: '48', delta: '+12% so với tuần trước', deltaTone: 'up' as const, icon: <ListTodo className="h-4 w-4" /> },
  { label: 'Hoàn thành', value: '31', delta: '+8%', deltaTone: 'up' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'Đang làm', value: '13', delta: '-3%', deltaTone: 'down' as const, icon: <Clock className="h-4 w-4" /> },
  { label: 'Quá hạn', value: '4', delta: '+1', deltaTone: 'down' as const, icon: <AlertTriangle className="h-4 w-4" /> },
];

// TODO: replace with useReports()
const WEEK = [
  { label: 'T2', pct: 40 }, { label: 'T3', pct: 65 }, { label: 'T4', pct: 50 },
  { label: 'T5', pct: 80 }, { label: 'T6', pct: 70 }, { label: 'T7', pct: 30 }, { label: 'CN', pct: 20 },
];

// TODO: replace with useReports()
const DONUT = [
  { label: 'Đang làm', pct: 27, className: 'bg-chart-1' },
  { label: 'Hoàn thành', pct: 65, className: 'bg-chart-2' },
  { label: 'Chưa bắt đầu', pct: 8, className: 'bg-chart-3' },
];

// TODO: replace with useReports()
const TEAM = [
  { name: 'An', pct: 80, count: 12 }, { name: 'Bình', pct: 60, count: 9 },
  { name: 'Châu', pct: 45, count: 7 }, { name: 'Dũng', pct: 30, count: 5 },
];

const DONUT_GRADIENT =
  'conic-gradient(var(--chart-1) 0 27%, var(--chart-2) 27% 92%, var(--chart-3) 92% 100%)';

export function ReportsView() {
  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {STATS.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Nhiệm vụ hoàn thành theo ngày</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-[190px] items-end gap-4">
                {WEEK.map((b) => (
                  <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${b.pct}%` }} />
                    <Text size="xs" color="muted">{b.label}</Text>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Phân bổ trạng thái</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-5 grid place-items-center">
                <div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: DONUT_GRADIENT }}>
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-background">
                    <span className="text-2xl font-extrabold text-foreground">48</span>
                    <Text size="xs" color="muted">tổng việc</Text>
                  </div>
                </div>
              </div>
              {DONUT.map((d) => (
                <div key={d.label} className="flex items-center gap-2 py-1.5">
                  <span className={`h-3 w-3 rounded-sm ${d.className}`} />
                  <Text size="sm" className="flex-1">{d.label}</Text>
                  <Text size="sm" weight="bold" numeric>{d.pct}%</Text>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Khối lượng theo thành viên</CardTitle></CardHeader>
          <CardContent>
            {TEAM.map((t) => (
              <div key={t.name} className="flex items-center gap-4 py-2">
                <Avatar fallback={t.name.charAt(0)} size="sm" />
                <Text size="sm" weight="medium" className="w-28 shrink-0">{t.name}</Text>
                <Progress value={t.pct} size="sm" variant="gradient" className="flex-1" />
                <Text size="sm" color="muted" numeric className="w-16 text-right">{t.count} việc</Text>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
```

> Donut dùng CSS var `--chart-1/2/3` (đã định nghĩa trong index.css). Nếu các var này không phải hex đơn (vd. là `oklch`), `conic-gradient` vẫn hoạt động.

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npm run test -- ReportsView`
Expected: PASS (2 test).

- [ ] **Step 6: Commit (user chạy)**

```bash
git add src/features/tasks/components/ReportsView.tsx \
        src/features/tasks/components/reports/StatCard.tsx \
        src/features/tasks/components/ReportsView.test.tsx
git commit -m "feat(tasks): add ReportsView with CSS charts (mock data)"
```

---

## Task 8: Convert board components sang dark theme

**Files:**
- Modify: `src/features/tasks/components/BoardHeader.tsx`
- Modify: `src/features/tasks/components/KanbanBoard.tsx`
- Modify: `src/features/tasks/components/Column.tsx`
- Modify: `src/features/tasks/components/TaskCard.tsx`

**Interfaces:** Không đổi logic/props — chỉ thay class màu hardcode bằng semantic token.

> Đây là task thuần style. Không có test mới; xác minh bằng `typecheck` + chạy app. Convert theo bảng map dưới, áp dụng cho cả 4 file.

**Bảng quy đổi màu hardcode → token:**

| Hardcode | Thay bằng |
|---|---|
| `bg-white` | `bg-secondary` |
| `border-[#ECE9F7]`, `border-[#E7E3F5]`, `border-[#F2F0FA]`, `border-[#EFEDF8]` | `border-border` |
| `bg-[#F4F3FB]`, `bg-[#EFEDF8]`, `bg-[#F7F5FE]` (surface) | `bg-muted` |
| `hover:bg-[#F4F3FB]`, `hover:bg-[#F7F5FE]`, `hover:bg-[#ECE9F7]` | `hover:bg-accent` |
| `text-[#6D4AFF]` (accent) | `text-primary` |
| `bg-[#6D4AFF]` (accent solid) | `bg-primary` |
| `bg-white` cho item active trong segment | `bg-secondary` |
| `text-[#211B41]`, `text-[#2E2A4D]` (text chính) | `text-foreground` |
| `text-[#9A96B0]`, `text-[#6B6880]` (text phụ) | `text-muted-foreground` |
| `bg-[#211B41]` (nút Chia sẻ tối) | `bg-primary text-primary-foreground` |
| `hover:bg-[#2E2A4D]` | `hover:bg-primary/90` |

- [ ] **Step 1: Đọc & convert BoardHeader**

Mở `src/features/tasks/components/BoardHeader.tsx`, thay toàn bộ class hardcode theo bảng. Kết quả mong đợi cho phần segment control:

```tsx
<div className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-background px-6">
  <div className="flex gap-1 rounded-xl bg-muted p-1">
    <button
      type="button"
      onClick={() => setBoardView('board')}
      className={
        boardView === 'board'
          ? 'rounded-lg bg-secondary px-3 py-1 text-sm font-semibold text-primary shadow-sm'
          : 'cursor-pointer px-3 py-1 text-sm text-muted-foreground'
      }
    >
      Board
    </button>
    <button
      type="button"
      onClick={() => setBoardView('list')}
      className={
        boardView === 'list'
          ? 'rounded-lg bg-secondary px-3 py-1 text-sm font-semibold text-primary shadow-sm'
          : 'cursor-pointer px-3 py-1 text-sm text-muted-foreground'
      }
    >
      Danh sách
    </button>
  </div>
  {/* ... members + settings + share, convert tương tự ... */}
</div>
```

Phần Avatar `border-2 border-white` → `border-2 border-background`. Nút Settings `border border-[#E7E3F5] bg-white ... hover:bg-[#F4F3FB]` → `border border-border bg-secondary ... hover:bg-accent`, icon `text-[#6B6880]` → `text-muted-foreground`. Nút Chia sẻ `bg-[#211B41] text-white ... hover:bg-[#2E2A4D]` → `bg-primary text-primary-foreground ... hover:bg-primary/90`.

- [ ] **Step 2: Convert KanbanBoard, Column, TaskCard**

Áp dụng đúng bảng quy đổi cho 3 file. Sau khi sửa, kiểm tra không còn hex tím sáng:

```bash
grep -rn '#6D4AFF\|#ECE9F7\|#211B41\|#F4F3FB\|#9A96B0\|#EFEDF8\|#2E2A4D\|#E7E3F5\|#F2F0FA\|#F7F5FE\|#6B6880\|#2E2A4D\|bg-white\|border-white' \
  src/features/tasks/components/BoardHeader.tsx \
  src/features/tasks/components/KanbanBoard.tsx \
  src/features/tasks/components/Column.tsx \
  src/features/tasks/components/TaskCard.tsx
```

Expected: không còn kết quả (rỗng).

> Lưu ý màu cột Kanban: nếu `Column`/`TaskCard` dùng `col.color` từ API (dynamic hex) qua inline `style`, GIỮ NGUYÊN — đó là data, không phải hardcode theme. Chỉ convert class Tailwind tĩnh.

- [ ] **Step 3: Typecheck + chạy test toàn bộ feature**

Run: `npm run typecheck`
Expected: không lỗi.

Run: `npm run test -- tasks`
Expected: tất cả test tasks PASS.

- [ ] **Step 4: Kiểm tra trực quan (thủ công)**

Chạy app, mở Task Management:
- Sidebar dock phóng to icon khi hover (kiểu macOS)
- Điều hướng 4 view hoạt động
- Board view nền tối, accent cyan, không còn mảng trắng/tím sáng

- [ ] **Step 5: Commit (user chạy)**

```bash
git add src/features/tasks/components/BoardHeader.tsx \
        src/features/tasks/components/KanbanBoard.tsx \
        src/features/tasks/components/Column.tsx \
        src/features/tasks/components/TaskCard.tsx
git commit -m "style(tasks): convert board components to dark theme tokens"
```

---

## Self-Review Notes

**Spec coverage:**
- §2 store activeView → Task 1 ✓
- §3 AppSidebar (Dock) → Task 2 ✓
- §4 AppHeader → Task 3 ✓
- §5 Dashboard → Task 5 ✓
- §6 ProjectsPage → Task 6 ✓
- §7 ReportsView → Task 7 ✓
- §8 BoardHeader + (bổ sung) board components → Task 8 ✓
- §9 xóa ProjectList → Task 4 ✓
- §2 layout restructure → Task 4 ✓

**Bổ sung ngoài spec gốc:** Task 8 mở rộng convert cả KanbanBoard/Column/TaskCard (không chỉ BoardHeader) vì cả 4 file đang hardcode màu tím sáng — cần để board nhất quán dark theme.

**Điểm cần verify khi code (ghi rõ trong task):** biến thể `Badge` (`soft-primary`/`soft-success`), prop `Card padding="none"`, prop `Input icon`, biến thể `Progress variant="gradient"` — tất cả đã dùng trong code hiện có (Dashboard cũ, BoardHeader) nên nhiều khả năng tồn tại; mỗi chỗ dùng đều có ghi chú fallback.

**Phụ thuộc giữa task:** 1→2,3 (cần ActiveView) → 4 (cần Sidebar/Header + placeholder Projects/Reports) → 5,6,7 (điền view thật) → 8 (style board). Thực thi tuần tự theo thứ tự task.
