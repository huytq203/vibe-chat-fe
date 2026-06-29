# Task Management — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 task management pages (`/tasks/*`) with real-time Socket.io board + task detail, S3 file upload, and Reports charts — fully adapted to the dark purple design system.

**Architecture:** Next.js 15 App Router + Tailwind CSS v4. State split across Zustand (UI + board optimistic state) and React Query (server data). Socket.io singleton (`task-socket.ts`) emits into Zustand to trigger optimistic updates. Route: `/tasks/(home|projects|board|reports)`, with `TaskDetailModal` as a portal overlay opened by Zustand state.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS v4, Zustand, TanStack Query v5, Socket.io-client v4, @dnd-kit/core, Recharts (must install).

## Global Constraints

- Working directory: `/home/huytq/code/my/fe/vibe-chat-fe`
- All CSS variables from `src/styles/index.css`: `--primary: #8b7cf0`, `--background: #17171f`, `--secondary: #242433`, `--border: #32334a`, `--muted-foreground: #9a9db5`, `--sidebar: #1d1d28`
- No light-theme colors from mockup — always use CSS variables
- No `any` types — use explicit interfaces
- All components use named exports (no default export)
- API base: use `taskClient` from `src/features/tasks/lib/task-client.ts`
- WebSocket: new `task-socket.ts` singleton, NOT the chat socket
- No `console.log` in production code — use `logger` or remove
- All text content in Vietnamese matching mockup
- Route `/tasks` completely separate from `/work`

---

### Task 1: Install Recharts + task-socket.ts + environment check

**Files:**
- Modify: `package.json` (install recharts)
- Create: `src/features/tasks/lib/task-socket.ts`
- Verify: `src/config/env.ts` (NEXT_PUBLIC_TASK_WS_URL exists)

**Interfaces:**
- Produces: `connectTaskSocket(token)`, `disconnectTaskSocket()`, `getTaskSocket()` — used by Tasks 4, 5, 7

- [ ] **Step 1: Install Recharts**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe
npm install recharts
npm install --save-dev @types/recharts 2>/dev/null || true
```

Expected: recharts in node_modules.

- [ ] **Step 2: Verify env.ts has TASK_WS_URL**

Read `src/config/env.ts`. Confirm `NEXT_PUBLIC_TASK_WS_URL` is present. If missing, add:

```typescript
NEXT_PUBLIC_TASK_WS_URL: process.env.NEXT_PUBLIC_TASK_WS_URL ?? 'ws://localhost:3002',
```

- [ ] **Step 3: Create `src/features/tasks/lib/task-socket.ts`**

```typescript
import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function connectTaskSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${env.NEXT_PUBLIC_TASK_WS_URL}/tasks`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
  });

  socket.on('disconnect', () => {
    // socket.io auto-reconnects
  });

  return socket;
}

export function disconnectTaskSocket(): void {
  socket?.disconnect();
  socket = null;
  reconnectAttempts = 0;
}

export function getTaskSocket(): Socket | null {
  return socket;
}

export function joinProjectRoom(projectId: string): void {
  socket?.emit('join-project', { projectId });
}

export function leaveProjectRoom(projectId: string): void {
  socket?.emit('leave-project', { projectId });
}

export function joinTaskRoom(taskId: string): void {
  socket?.emit('join-task', { taskId });
}

export function leaveTaskRoom(taskId: string): void {
  socket?.emit('leave-task', { taskId });
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors in the new file.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tasks): install recharts, add task-socket.ts singleton"
```

---

### Task 2: `/tasks` layout + route structure

**Files:**
- Create: `src/app/(app)/tasks/layout.tsx`
- Create: `src/app/(app)/tasks/page.tsx` (redirect)
- Create: `src/app/(app)/tasks/home/page.tsx` (stub)
- Create: `src/app/(app)/tasks/projects/page.tsx` (stub)
- Create: `src/app/(app)/tasks/board/page.tsx` (stub)
- Create: `src/app/(app)/tasks/reports/page.tsx` (stub)
- Create: `src/features/tasks/components/layout/TasksSidebar.tsx`
- Create: `src/features/tasks/components/layout/TasksHeader.tsx`

**Interfaces:**
- Produces: Layout shell used by all `/tasks/*` pages

- [ ] **Step 1: Create `src/features/tasks/components/layout/TasksSidebar.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, FolderIcon, SquareKanban, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/tasks/home', icon: HomeIcon, label: 'Tổng quan' },
  { href: '/tasks/projects', icon: FolderIcon, label: 'Dự án' },
  { href: '/tasks/board', icon: SquareKanban, label: 'Bảng' },
  { href: '/tasks/reports', icon: BarChart3, label: 'Báo cáo' },
];

export function TasksSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="w-16 h-screen flex flex-col items-center py-4 border-r border-[var(--border)] bg-[var(--sidebar)] shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-6">
        <SquareKanban className="w-5 h-5 text-white" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]',
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-1 mt-auto">
        <button
          title="Cài đặt"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `src/features/tasks/components/layout/TasksHeader.tsx`**

```typescript
'use client';

import { Search, Bell, Plus } from 'lucide-react';
import { useState } from 'react';

interface TasksHeaderProps {
  onCreateTask?: () => void;
}

export function TasksHeader({ onCreateTask }: TasksHeaderProps): JSX.Element {
  const [search, setSearch] = useState('');

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--background)] flex items-center gap-4 px-4 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--secondary)] rounded-lg px-3 py-2 flex-1 max-w-xs">
        <Search className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        <input
          type="text"
          placeholder="Tìm kiếm task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-full"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Bell */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* Create */}
        <button
          onClick={onCreateTask}
          className="flex items-center gap-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg px-3 py-2 hover:bg-[var(--primary)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo mới
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create `src/app/(app)/tasks/layout.tsx`**

```typescript
import type { ReactNode } from 'react';
import { TasksSidebar } from '@/features/tasks/components/layout/TasksSidebar';
import { TasksHeader } from '@/features/tasks/components/layout/TasksHeader';

interface TasksLayoutProps {
  children: ReactNode;
}

export default function TasksLayout({ children }: TasksLayoutProps): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <TasksSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TasksHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/tasks/page.tsx`**

```typescript
import { redirect } from 'next/navigation';

export default function TasksRootPage(): never {
  redirect('/tasks/home');
}
```

- [ ] **Step 5: Create stub pages**

`src/app/(app)/tasks/home/page.tsx`:
```typescript
export default function TasksHomePage(): JSX.Element {
  return <div className="p-6 text-[var(--foreground)]">Dashboard — coming soon</div>;
}
```

`src/app/(app)/tasks/projects/page.tsx`:
```typescript
export default function TasksProjectsPage(): JSX.Element {
  return <div className="p-6 text-[var(--foreground)]">Projects — coming soon</div>;
}
```

`src/app/(app)/tasks/board/page.tsx`:
```typescript
export default function TasksBoardPage(): JSX.Element {
  return <div className="p-6 text-[var(--foreground)]">Board — coming soon</div>;
}
```

`src/app/(app)/tasks/reports/page.tsx`:
```typescript
export default function TasksReportsPage(): JSX.Element {
  return <div className="p-6 text-[var(--foreground)]">Reports — coming soon</div>;
}
```

- [ ] **Step 6: Type-check + build verification**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Start dev server and verify `/tasks` route loads**

Start dev server and navigate to `http://localhost:3000/tasks` — verify sidebar + header render, redirect to `/tasks/home` works.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(tasks): /tasks route layout with sidebar + header + 4 stub pages"
```

---

### Task 3: Extend stores + API layer

**Files:**
- Modify: `src/features/tasks/stores/tasks-ui.store.ts`
- Create: `src/features/tasks/stores/board.store.ts`
- Modify: `src/features/tasks/services/tasks.api.ts`
- Create: `src/features/tasks/services/detail.api.ts`
- Create: `src/features/tasks/services/reports.api.ts`
- Modify: `src/features/tasks/hooks/useBoard.ts`
- Create: `src/features/tasks/types/task.types.ts`

**Interfaces:**
- Produces: `useTasksUiStore`, `useBoardStore`, type definitions, API functions — used by Tasks 4–8

- [ ] **Step 1: Create `src/features/tasks/types/task.types.ts`**

```typescript
export interface TagDto {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface AssigneeDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  assignedAt: string;
}

export interface ChecklistItemDto {
  id: string;
  taskId: string;
  content: string;
  isDone: boolean;
  position: number;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentDto {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  downloadUrl?: string;
}

export interface ActivityDto {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  actorName: string;
  actorAvatar?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskDetailDto {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string | null;
  position: number;
  isPinned: boolean;
  priority?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt: string;
  tags: TagDto[];
  assignees: AssigneeDto[];
  checklist: ChecklistItemDto[];
  comments: CommentDto[];
  attachments: AttachmentDto[];
  activities: ActivityDto[];
}

export interface TaskDto {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string | null;
  position: number;
  isPinned: boolean;
  priority?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ColumnDto {
  id: string;
  projectId: string;
  name: string;
  position: number;
  color?: string | null;
  isDoneCol: boolean;
  tasksCount: number;
}

export interface BoardDto {
  project: { id: string; name: string; description?: string | null };
  columns: ColumnDto[];
  tasks: TaskDto[];
}

export interface ProjectDto {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
  openTaskCount?: number;
  completedTaskCount?: number;
}

export interface ProjectStatsDto {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  dailyCompleted: Array<{ label: string; date: string; count: number }>;
  byStatus: Array<{ columnId: string; columnName: string; count: number; color: string | null }>;
  memberWorkload: Array<{ userId: string; displayName: string; avatarUrl?: string | null; count: number }>;
}
```

- [ ] **Step 2: Update `src/features/tasks/stores/tasks-ui.store.ts`**

Replace full content:

```typescript
import { create } from 'zustand';

interface TasksUiState {
  selectedProjectId: string | null;
  openTaskId: string | null;
  activeView: 'kanban' | 'list';
  setSelectedProjectId: (id: string | null) => void;
  openTaskDetail: (id: string) => void;
  closeTaskDetail: () => void;
  setActiveView: (view: 'kanban' | 'list') => void;
}

export const useTasksUiStore = create<TasksUiState>((set) => ({
  selectedProjectId: null,
  openTaskId: null,
  activeView: 'kanban',
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  openTaskDetail: (id) => set({ openTaskId: id }),
  closeTaskDetail: () => set({ openTaskId: null }),
  setActiveView: (view) => set({ activeView: view }),
}));
```

- [ ] **Step 3: Create `src/features/tasks/stores/board.store.ts`**

```typescript
import { create } from 'zustand';
import type { ColumnDto, TaskDto } from '../types/task.types';

interface BoardState {
  columns: ColumnDto[];
  tasks: TaskDto[];
  setBoard: (columns: ColumnDto[], tasks: TaskDto[]) => void;
  addTask: (task: TaskDto) => void;
  updateTask: (taskId: string, changes: Partial<TaskDto>) => void;
  moveTask: (taskId: string, columnId: string, position?: number) => void;
  removeTask: (taskId: string) => void;
  addColumn: (column: ColumnDto) => void;
  updateColumn: (columnId: string, changes: Partial<ColumnDto>) => void;
  removeColumn: (columnId: string) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  tasks: [],
  setBoard: (columns, tasks) => set({ columns, tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (taskId, changes) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)) })),
  moveTask: (taskId, columnId, position) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, columnId, position: position ?? t.position }
          : t,
      ),
    })),
  removeTask: (taskId) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),
  addColumn: (column) => set((s) => ({ columns: [...s.columns, column] })),
  updateColumn: (columnId, changes) =>
    set((s) => ({
      columns: s.columns.map((c) => (c.id === columnId ? { ...c, ...changes } : c)),
    })),
  removeColumn: (columnId) =>
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== columnId),
      tasks: s.tasks.filter((t) => t.columnId !== columnId),
    })),
}));
```

- [ ] **Step 4: Create `src/features/tasks/services/detail.api.ts`**

```typescript
import { taskClient } from '../lib/task-client';
import type {
  TaskDetailDto, CommentDto, ChecklistItemDto, AttachmentDto, AssigneeDto
} from '../types/task.types';

export const detailApi = {
  getDetail: (taskId: string): Promise<TaskDetailDto> =>
    taskClient.get<TaskDetailDto>(`/tasks/${taskId}/detail`),

  // Comments
  createComment: (projectId: string, taskId: string, body: { content: string; displayName: string; avatarUrl?: string }): Promise<CommentDto> =>
    taskClient.post<CommentDto>(`/projects/${projectId}/tasks/${taskId}/comments`, body),
  updateComment: (projectId: string, taskId: string, commentId: string, body: { content: string }): Promise<CommentDto> =>
    taskClient.patch<CommentDto>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, body),
  deleteComment: (projectId: string, taskId: string, commentId: string): Promise<void> =>
    taskClient.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),

  // Checklist
  addChecklistItem: (projectId: string, taskId: string, body: { content: string }): Promise<ChecklistItemDto> =>
    taskClient.post<ChecklistItemDto>(`/projects/${projectId}/tasks/${taskId}/checklists`, body),
  updateChecklistItem: (projectId: string, taskId: string, itemId: string, body: { content?: string; isDone?: boolean }): Promise<ChecklistItemDto> =>
    taskClient.patch<ChecklistItemDto>(`/projects/${projectId}/tasks/${taskId}/checklists/${itemId}`, body),
  deleteChecklistItem: (projectId: string, taskId: string, itemId: string): Promise<void> =>
    taskClient.delete(`/projects/${projectId}/tasks/${taskId}/checklists/${itemId}`),

  // Assignees
  addAssignee: (projectId: string, taskId: string, body: { targetUserId: string; displayName: string; avatarUrl?: string }): Promise<AssigneeDto> =>
    taskClient.post<AssigneeDto>(`/projects/${projectId}/tasks/${taskId}/assignees`, body),
  removeAssignee: (projectId: string, taskId: string, targetUserId: string): Promise<void> =>
    taskClient.delete(`/projects/${projectId}/tasks/${taskId}/assignees/${targetUserId}`),

  // Attachments
  presignAttachment: (projectId: string, taskId: string, body: { fileName: string; mimeType: string; fileSize: number }): Promise<{ attachmentId: string; uploadUrl: string }> =>
    taskClient.post(`/projects/${projectId}/tasks/${taskId}/attachments/presign`, body),
  confirmAttachment: (projectId: string, taskId: string, body: { attachmentId: string }): Promise<AttachmentDto> =>
    taskClient.post<AttachmentDto>(`/projects/${projectId}/tasks/${taskId}/attachments/confirm`, body),
  deleteAttachment: (projectId: string, taskId: string, attachmentId: string): Promise<void> =>
    taskClient.delete(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`),

  // Tags (for task)
  attachTag: (taskId: string, tagId: string): Promise<void> =>
    taskClient.post(`/tasks/${taskId}/tags/${tagId}`, {}),
  detachTag: (taskId: string, tagId: string): Promise<void> =>
    taskClient.delete(`/tasks/${taskId}/tags/${tagId}`),
};
```

- [ ] **Step 5: Create `src/features/tasks/services/reports.api.ts`**

```typescript
import { taskClient } from '../lib/task-client';
import type { ProjectStatsDto } from '../types/task.types';

export const reportsApi = {
  getProjectStats: (projectId: string): Promise<ProjectStatsDto> =>
    taskClient.get<ProjectStatsDto>(`/reports/projects/${projectId}/stats`),
};
```

- [ ] **Step 6: Extend `src/features/tasks/services/tasks.api.ts`**

Add these exports at the bottom:

```typescript
// Tags
export const listProjectTags = (projectId: string) =>
  taskClient.get<TagDto[]>(`/projects/${projectId}/tags`);

export const createTag = (projectId: string, body: { name: string; color: string }) =>
  taskClient.post<TagDto>(`/projects/${projectId}/tags`, body);

export const deleteTag = (projectId: string, tagId: string) =>
  taskClient.delete(`/projects/${projectId}/tags/${tagId}`);

// Activities
export const listProjectActivities = (projectId: string) =>
  taskClient.get<ActivityDto[]>(`/projects/${projectId}/activities`);
```

(Add `import type { TagDto, ActivityDto } from '../types/task.types';` at the top)

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(tasks): extend stores + API layer — board.store, detail.api, reports.api, task.types"
```

---

### Task 4: Home page (Dashboard)

**Files:**
- Modify: `src/app/(app)/tasks/home/page.tsx`
- Create: `src/features/tasks/components/home/MyTasksCard.tsx`
- Create: `src/features/tasks/components/home/ActivityCard.tsx`
- Create: `src/features/tasks/components/home/ProjectsOverview.tsx`
- Create: `src/features/tasks/hooks/useActivityFeed.ts`

**Interfaces:**
- Consumes: `listProjects` (existing), `listProjectActivities` (Task 3), `joinProjectRoom`, `getTaskSocket()` (Task 1), `useTasksUiStore`

- [ ] **Step 1: Create `src/features/tasks/hooks/useActivityFeed.ts`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import type { ActivityDto } from '../types/task.types';
import { getTaskSocket, joinProjectRoom } from '../lib/task-socket';

export function useActivityFeed(projectId: string | null): ActivityDto[] {
  const [activities, setActivities] = useState<ActivityDto[]>([]);

  useEffect(() => {
    if (!projectId) return;
    const socket = getTaskSocket();
    if (!socket) return;

    joinProjectRoom(projectId);

    const handler = (activity: ActivityDto) => {
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    };
    socket.on('activity:logged', handler);

    return () => {
      socket.off('activity:logged', handler);
    };
  }, [projectId]);

  return activities;
}
```

- [ ] **Step 2: Create `src/features/tasks/components/home/MyTasksCard.tsx`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock } from 'lucide-react';
import { taskKeys } from '../../lib/task-client';
import { taskClient } from '../../lib/task-client';
import type { TaskDto } from '../../types/task.types';

export function MyTasksCard(): JSX.Element {
  // GET tasks assigned to current user (use existing getBoard + filter, or new endpoint)
  // For now, show placeholder — endpoint can be wired when available
  const tasks: TaskDto[] = [];

  return (
    <div className="bg-[var(--secondary)] rounded-xl p-5 border border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
        Task của bạn
      </h3>

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Không có task nào được giao.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)] shrink-0" />
              <span className="text-[var(--foreground)] truncate">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/tasks/components/home/ActivityCard.tsx`**

```typescript
'use client';

import { Activity } from 'lucide-react';
import type { ActivityDto } from '../../types/task.types';

interface ActivityCardProps {
  activities: ActivityDto[];
}

const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.moved': 'đã di chuyển task',
  'task.deleted': 'đã xóa task',
  'comment.created': 'đã bình luận',
  'checklist.toggled': 'đã cập nhật checklist',
};

export function ActivityCard({ activities }: ActivityCardProps): JSX.Element {
  return (
    <div className="bg-[var(--secondary)] rounded-xl p-5 border border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[var(--primary)]" />
        Hoạt động gần đây
      </h3>

      {activities.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Chưa có hoạt động nào.</p>
      ) : (
        <ul className="space-y-3">
          {activities.slice(0, 10).map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-[var(--primary)] font-bold">
                  {a.actorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-sm text-[var(--foreground)] font-medium">{a.actorName}</span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {' '}{ACTION_LABELS[a.action] ?? a.action}
                </span>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {new Date(a.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/tasks/components/home/ProjectsOverview.tsx`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';
import { listProjects } from '../../services/tasks.api';
import { taskKeys } from '../../lib/task-client';
import type { ProjectDto } from '../../types/task.types';

export function ProjectsOverview(): JSX.Element {
  const { data: projects = [] } = useQuery({
    queryKey: taskKeys.projects(),
    queryFn: listProjects,
  });

  return (
    <div className="bg-[var(--secondary)] rounded-xl p-5 border border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <FolderKanban className="w-4 h-4 text-[var(--primary)]" />
        Dự án ({projects.length})
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {projects.slice(0, 6).map((p) => (
          <div key={p.id} className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">{p.name}</p>
            {p.description && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">{p.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `src/app/(app)/tasks/home/page.tsx`**

```typescript
'use client';

import { MyTasksCard } from '@/features/tasks/components/home/MyTasksCard';
import { ActivityCard } from '@/features/tasks/components/home/ActivityCard';
import { ProjectsOverview } from '@/features/tasks/components/home/ProjectsOverview';
import { useActivityFeed } from '@/features/tasks/hooks/useActivityFeed';
import { useTasksUiStore } from '@/features/tasks/stores/tasks-ui.store';

export default function TasksHomePage(): JSX.Element {
  const selectedProjectId = useTasksUiStore((s) => s.selectedProjectId);
  const activities = useActivityFeed(selectedProjectId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Tổng quan</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Theo dõi tiến độ và hoạt động của team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <MyTasksCard />
        </div>
        <div className="lg:col-span-1">
          <ActivityCard activities={activities} />
        </div>
        <div className="lg:col-span-1">
          <ProjectsOverview />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Type-check + visual verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Navigate to `http://localhost:3000/tasks/home` — verify layout renders.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(tasks/home): Dashboard with MyTasksCard, ActivityCard, ProjectsOverview"
```

---

### Task 5: Projects page

**Files:**
- Modify: `src/app/(app)/tasks/projects/page.tsx`
- Create: `src/features/tasks/components/projects/ProjectsTable.tsx`

**Interfaces:**
- Consumes: `listProjects` (existing), `createProject` (existing), `useTasksUiStore`

- [ ] **Step 1: Create `src/features/tasks/components/projects/ProjectsTable.tsx`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Users, CheckSquare, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { listProjects } from '../../services/tasks.api';
import { taskKeys } from '../../lib/task-client';
import { useTasksUiStore } from '../../stores/tasks-ui.store';

export function ProjectsTable(): JSX.Element {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: taskKeys.projects(),
    queryFn: listProjects,
  });
  const setSelectedProjectId = useTasksUiStore((s) => s.setSelectedProjectId);
  const router = useRouter();

  const handleOpenBoard = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.push(`/tasks/board?projectId=${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[var(--secondary)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có dự án nào. Tạo dự án đầu tiên của bạn!</p>
        </div>
      ) : (
        projects.map((p) => {
          const total = (p.openTaskCount ?? 0) + (p.completedTaskCount ?? 0);
          const progress = total === 0 ? 0 : Math.round(((p.completedTaskCount ?? 0) / total) * 100);
          return (
            <div
              key={p.id}
              className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--primary)]/50 transition-colors"
            >
              {/* Name */}
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
                <span className="text-[var(--primary)] font-bold text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[var(--foreground)] truncate">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{p.description}</p>
                )}
              </div>

              {/* Progress */}
              <div className="w-32 hidden sm:block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--muted-foreground)]">{progress}%</span>
                </div>
                <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Tasks */}
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] w-20 hidden md:flex">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{p.openTaskCount ?? 0} mở</span>
              </div>

              {/* Members */}
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] w-20 hidden lg:flex">
                <Users className="w-3.5 h-3.5" />
                <span>{p.memberCount ?? 0} thành viên</span>
              </div>

              {/* Action */}
              <button
                onClick={() => handleOpenBoard(p.id)}
                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-80 transition-opacity shrink-0"
              >
                Xem board
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/(app)/tasks/projects/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ProjectsTable } from '@/features/tasks/components/projects/ProjectsTable';
import { NewProjectModal } from '@/features/tasks/components/NewProjectModal';

export default function TasksProjectsPage(): JSX.Element {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Dự án</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Quản lý tất cả dự án của bạn</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg px-3 py-2 hover:bg-[var(--primary)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo dự án
        </button>
      </div>

      <ProjectsTable />

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

> **Note:** `NewProjectModal` import path — check that the existing component exports match. Adjust import if needed.

- [ ] **Step 3: Visual verify**

Navigate to `http://localhost:3000/tasks/projects` — verify table renders with existing projects.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(tasks/projects): ProjectsTable with progress bars and board navigation"
```

---

### Task 6: Board page + real-time hook

**Files:**
- Modify: `src/app/(app)/tasks/board/page.tsx`
- Create: `src/features/tasks/components/board/BoardView.tsx`
- Create: `src/features/tasks/hooks/useBoardRealtime.ts`
- Modify: `src/features/tasks/components/KanbanBoard.tsx` (adapt for board.store)

**Interfaces:**
- Consumes: `getBoard` (existing), `useBoardStore` (Task 3), `joinProjectRoom`, `getTaskSocket()`, `useTasksUiStore`
- Produces: Board with real-time sync across browser tabs

- [ ] **Step 1: Create `src/features/tasks/hooks/useBoardRealtime.ts`**

```typescript
'use client';

import { useEffect } from 'react';
import { getTaskSocket, joinProjectRoom, leaveProjectRoom } from '../lib/task-socket';
import { useBoardStore } from '../stores/board.store';
import type { ColumnDto, TaskDto } from '../types/task.types';

export function useBoardRealtime(projectId: string | null): void {
  const store = useBoardStore();

  useEffect(() => {
    if (!projectId) return;
    const socket = getTaskSocket();
    if (!socket) return;

    joinProjectRoom(projectId);

    socket.on('task:created', (task: TaskDto) => store.addTask(task));
    socket.on('task:updated', (payload: { taskId: string; changes: Partial<TaskDto> }) =>
      store.updateTask(payload.taskId, payload.changes),
    );
    socket.on('task:moved', (payload: { taskId: string; columnId: string; position?: number }) =>
      store.moveTask(payload.taskId, payload.columnId, payload.position),
    );
    socket.on('task:deleted', (payload: { taskId: string }) => store.removeTask(payload.taskId));
    socket.on('column:created', (col: ColumnDto) => store.addColumn(col));
    socket.on('column:updated', (payload: { columnId: string; changes: Partial<ColumnDto> }) =>
      store.updateColumn(payload.columnId, payload.changes),
    );
    socket.on('column:deleted', (payload: { columnId: string }) =>
      store.removeColumn(payload.columnId),
    );

    return () => {
      leaveProjectRoom(projectId);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('column:created');
      socket.off('column:updated');
      socket.off('column:deleted');
    };
  }, [projectId, store]);
}
```

- [ ] **Step 2: Create `src/features/tasks/components/board/BoardView.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List } from 'lucide-react';
import { getBoard } from '../../services/tasks.api';
import { taskKeys } from '../../lib/task-client';
import { useBoardStore } from '../../stores/board.store';
import { useTasksUiStore } from '../../stores/tasks-ui.store';
import { useBoardRealtime } from '../../hooks/useBoardRealtime';
import { KanbanBoard } from '../KanbanBoard';

interface BoardViewProps {
  projectId: string;
}

export function BoardView({ projectId }: BoardViewProps): JSX.Element {
  const { data } = useQuery({
    queryKey: taskKeys.board(projectId),
    queryFn: () => getBoard(projectId),
    enabled: !!projectId,
  });

  const setBoard = useBoardStore((s) => s.setBoard);
  const columns = useBoardStore((s) => s.columns);
  const tasks = useBoardStore((s) => s.tasks);
  const activeView = useTasksUiStore((s) => s.activeView);
  const setActiveView = useTasksUiStore((s) => s.setActiveView);

  // Seed store from server data
  useEffect(() => {
    if (data) setBoard(data.columns, data.tasks);
  }, [data, setBoard]);

  // Subscribe to real-time
  useBoardRealtime(projectId);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)] flex-1">
          {data?.project?.name ?? 'Board'}
        </h2>
        <div className="flex items-center gap-1 bg-[var(--secondary)] rounded-lg p-1">
          <button
            onClick={() => setActiveView('kanban')}
            className={`p-1.5 rounded-md transition-colors ${
              activeView === 'kanban'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`p-1.5 rounded-md transition-colors ${
              activeView === 'list'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'kanban' ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <div className="p-6">
            {/* List view — show tasks grouped by column */}
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.columnId === col.id);
              return (
                <div key={col.id} className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color ?? 'var(--primary)' }}
                    />
                    {col.name}
                    <span className="text-[var(--muted-foreground)] font-normal">({colTasks.length})</span>
                  </h3>
                  <div className="space-y-1">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:border-[var(--primary)]/50 cursor-pointer transition-colors"
                      >
                        <span className="flex-1 truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/(app)/tasks/board/page.tsx`**

```typescript
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FolderOpen } from 'lucide-react';
import { BoardView } from '@/features/tasks/components/board/BoardView';

function BoardPageContent(): JSX.Element {
  const params = useSearchParams();
  const projectId = params.get('projectId');

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
        <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Chọn một dự án để xem board</p>
      </div>
    );
  }

  return <BoardView projectId={projectId} />;
}

export default function TasksBoardPage(): JSX.Element {
  return (
    <Suspense>
      <BoardPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Visual verify**

Navigate to `http://localhost:3000/tasks/board?projectId=<id>` — verify kanban board renders, toggle list view works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tasks/board): BoardView with kanban/list toggle + useBoardRealtime hook"
```

---

### Task 7: Task Detail Modal + real-time task room

**Files:**
- Create: `src/features/tasks/components/task-detail/TaskDetailModal.tsx`
- Create: `src/features/tasks/components/task-detail/ChecklistSection.tsx`
- Create: `src/features/tasks/components/task-detail/CommentsSection.tsx`
- Create: `src/features/tasks/components/task-detail/AttachmentsSection.tsx`
- Create: `src/features/tasks/components/task-detail/ActivitySection.tsx`
- Create: `src/features/tasks/components/task-detail/TaskSidePanel.tsx`
- Create: `src/features/tasks/hooks/useTaskDetailRealtime.ts`
- Modify: `src/features/tasks/components/KanbanBoard.tsx` (open modal on card click)

**Interfaces:**
- Consumes: `detailApi` (Task 3), `useTasksUiStore.openTaskDetail/closeTaskDetail`, `joinTaskRoom`, `leaveTaskRoom`, `getTaskSocket()`

- [ ] **Step 1: Create `src/features/tasks/hooks/useTaskDetailRealtime.ts`**

```typescript
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTaskSocket, joinTaskRoom, leaveTaskRoom } from '../lib/task-socket';
import type { CommentDto, ChecklistItemDto, AttachmentDto, AssigneeDto } from '../types/task.types';

export function useTaskDetailRealtime(taskId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;
    const socket = getTaskSocket();
    if (!socket) return;

    joinTaskRoom(taskId);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });

    socket.on('comment:created', invalidate);
    socket.on('comment:updated', invalidate);
    socket.on('comment:deleted', invalidate);
    socket.on('checklist:added', invalidate);
    socket.on('checklist:toggled', invalidate);
    socket.on('checklist:updated', invalidate);
    socket.on('checklist:deleted', invalidate);
    socket.on('attachment:added', invalidate);
    socket.on('attachment:deleted', invalidate);
    socket.on('assignee:added', invalidate);
    socket.on('assignee:removed', invalidate);
    socket.on('task:field-updated', invalidate);

    return () => {
      leaveTaskRoom(taskId);
      socket.off('comment:created');
      socket.off('comment:updated');
      socket.off('comment:deleted');
      socket.off('checklist:added');
      socket.off('checklist:toggled');
      socket.off('checklist:updated');
      socket.off('checklist:deleted');
      socket.off('attachment:added');
      socket.off('attachment:deleted');
      socket.off('assignee:added');
      socket.off('assignee:removed');
      socket.off('task:field-updated');
    };
  }, [taskId, queryClient]);
}
```

- [ ] **Step 2: Create `src/features/tasks/components/task-detail/ChecklistSection.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { detailApi } from '../../services/detail.api';
import type { ChecklistItemDto } from '../../types/task.types';

interface ChecklistSectionProps {
  taskId: string;
  projectId: string;
  items: ChecklistItemDto[];
}

export function ChecklistSection({ taskId, projectId, items }: ChecklistSectionProps): JSX.Element {
  const [newItem, setNewItem] = useState('');
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });

  const addMutation = useMutation({
    mutationFn: (content: string) => detailApi.addChecklistItem(projectId, taskId, { content }),
    onSuccess: () => { setNewItem(''); invalidate(); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      detailApi.updateChecklistItem(projectId, taskId, itemId, { isDone }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => detailApi.deleteChecklistItem(projectId, taskId, itemId),
    onSuccess: invalidate,
  });

  const doneCount = items.filter((i) => i.isDone).length;
  const progress = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Checklist</span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">{doneCount}/{items.length}</span>
      </div>

      {items.length > 0 && (
        <div className="h-1.5 bg-[var(--border)] rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.isDone}
              onChange={(e) => toggleMutation.mutate({ itemId: item.id, isDone: e.target.checked })}
              className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
            />
            <span className={`text-sm flex-1 ${item.isDone ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
              {item.content}
            </span>
            <button
              onClick={() => deleteMutation.mutate(item.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <div className="flex items-center gap-2 mt-3">
        <Plus className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
        <input
          type="text"
          placeholder="Thêm mục mới..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim()) addMutation.mutate(newItem.trim());
          }}
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/tasks/components/task-detail/CommentsSection.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { detailApi } from '../../services/detail.api';
import type { CommentDto } from '../../types/task.types';

interface CommentsSectionProps {
  taskId: string;
  projectId: string;
  comments: CommentDto[];
  currentUserId: string;
  currentUserName: string;
}

export function CommentsSection({ taskId, projectId, comments, currentUserId, currentUserName }: CommentsSectionProps): JSX.Element {
  const [content, setContent] = useState('');
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      detailApi.createComment(projectId, taskId, { content: text, displayName: currentUserName }),
    onSuccess: () => { setContent(''); invalidate(); },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Bình luận ({comments.length})</span>
      </div>

      <div className="space-y-4 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <span className="text-xs text-[var(--primary)] font-bold">
                {c.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)]">{c.displayName}</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(c.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <p className="text-sm text-[var(--foreground)] mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border border-[var(--border)] rounded-lg px-3 py-2">
        <input
          type="text"
          placeholder="Thêm bình luận..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && content.trim()) createMutation.mutate(content.trim());
          }}
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
        <button
          onClick={() => content.trim() && createMutation.mutate(content.trim())}
          className="text-[var(--primary)] hover:opacity-80 transition-opacity"
          disabled={!content.trim()}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/tasks/components/task-detail/AttachmentsSection.tsx`**

```typescript
'use client';

import { useRef } from 'react';
import { Paperclip, Upload, Trash2, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { detailApi } from '../../services/detail.api';
import type { AttachmentDto } from '../../types/task.types';

interface AttachmentsSectionProps {
  taskId: string;
  projectId: string;
  attachments: AttachmentDto[];
}

const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

export function AttachmentsSection({ taskId, projectId, attachments }: AttachmentsSectionProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: presign
      const { attachmentId, uploadUrl } = await detailApi.presignAttachment(projectId, taskId, {
        fileName: file.name, mimeType: file.type, fileSize: file.size,
      });
      // Step 2: PUT to S3
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
      // Step 3: confirm
      return detailApi.confirmAttachment(projectId, taskId, { attachmentId });
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => detailApi.deleteAttachment(projectId, taskId, attachmentId),
    onSuccess: invalidate,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > FILE_SIZE_LIMIT) { alert('File quá lớn (tối đa 100MB)'); return; }
    uploadMutation.mutate(file);
    e.target.value = '';
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Tệp đính kèm ({attachments.length})</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="ml-auto flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploadMutation.isPending ? 'Đang tải...' : 'Tải lên'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="space-y-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2 bg-[var(--background)] rounded-lg border border-[var(--border)] group">
            <Paperclip className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)] truncate">{a.fileName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatSize(a.fileSize)}</p>
            </div>
            {a.downloadUrl && (
              <a href={a.downloadUrl} download={a.fileName} className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => deleteMutation.mutate(a.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-red-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/features/tasks/components/task-detail/ActivitySection.tsx`**

```typescript
'use client';

import { Clock } from 'lucide-react';
import type { ActivityDto } from '../../types/task.types';

const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.moved': 'đã di chuyển task sang cột khác',
  'task.deleted': 'đã xóa task',
  'comment.created': 'đã bình luận',
  'checklist.toggled': 'đã cập nhật checklist',
};

interface ActivitySectionProps {
  activities: ActivityDto[];
}

export function ActivitySection({ activities }: ActivitySectionProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Lịch sử hoạt động</span>
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">Chưa có hoạt động nào.</p>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <div className="w-5 h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[var(--primary)] font-bold text-[10px]">
                  {a.actorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="font-semibold text-[var(--foreground)]">{a.actorName}</span>
                <span className="text-[var(--muted-foreground)]"> {ACTION_LABELS[a.action] ?? a.action}</span>
                <p className="text-[var(--muted-foreground)] mt-0.5">
                  {new Date(a.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/features/tasks/components/task-detail/TaskSidePanel.tsx`**

```typescript
'use client';

import { Calendar, Flag, Tag, Users } from 'lucide-react';
import type { TaskDetailDto, TagDto, AssigneeDto } from '../../types/task.types';

interface TaskSidePanelProps {
  task: TaskDetailDto;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Thấp', color: '#22c55e' },
  medium: { label: 'Trung bình', color: '#f59e0b' },
  high: { label: 'Cao', color: '#ef4444' },
  urgent: { label: 'Khẩn cấp', color: '#a855f7' },
};

export function TaskSidePanel({ task }: TaskSidePanelProps): JSX.Element {
  const priority = task.priority ? PRIORITY_LABELS[task.priority] : null;

  return (
    <div className="space-y-4">
      {/* Priority */}
      {priority && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <Flag className="w-3.5 h-3.5" /> Độ ưu tiên
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style={{ color: priority.color, backgroundColor: `${priority.color}20` }}
          >
            {priority.label}
          </span>
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Hạn hoàn thành
          </p>
          <p className="text-sm text-[var(--foreground)]">
            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
          </p>
        </div>
      )}

      {/* Assignees */}
      <div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Người thực hiện
        </p>
        {task.assignees.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">Chưa có</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {task.assignees.map((a) => (
              <div key={a.userId} className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                  <span className="text-[10px] text-[var(--primary)] font-bold">
                    {a.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-[var(--foreground)]">{a.displayName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5" /> Tags
        </p>
        {task.tags.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">Chưa có</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                style={{ color: t.color, backgroundColor: `${t.color}20` }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/features/tasks/components/task-detail/TaskDetailModal.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { detailApi } from '../../services/detail.api';
import { useTasksUiStore } from '../../stores/tasks-ui.store';
import { useTaskDetailRealtime } from '../../hooks/useTaskDetailRealtime';
import { ChecklistSection } from './ChecklistSection';
import { CommentsSection } from './CommentsSection';
import { AttachmentsSection } from './AttachmentsSection';
import { ActivitySection } from './ActivitySection';
import { TaskSidePanel } from './TaskSidePanel';

export function TaskDetailModal(): JSX.Element | null {
  const openTaskId = useTasksUiStore((s) => s.openTaskId);
  const closeTaskDetail = useTasksUiStore((s) => s.closeTaskDetail);

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', 'detail', openTaskId],
    queryFn: () => detailApi.getDetail(openTaskId!),
    enabled: !!openTaskId,
  });

  useTaskDetailRealtime(openTaskId);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTaskDetail(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeTaskDetail]);

  if (!openTaskId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeTaskDetail(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[var(--secondary)] border border-[var(--border)] rounded-2xl shadow-2xl flex overflow-hidden">
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-bold text-[var(--foreground)]">{task.title}</h2>
                <button onClick={closeTaskDetail} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {task.description && (
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{task.description}</p>
              )}

              <div className="border-t border-[var(--border)] pt-4">
                <ChecklistSection taskId={task.id} projectId={task.projectId} items={task.checklist} />
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <AttachmentsSection taskId={task.id} projectId={task.projectId} attachments={task.attachments} />
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <CommentsSection
                  taskId={task.id}
                  projectId={task.projectId}
                  comments={task.comments}
                  currentUserId=""
                  currentUserName="Tôi"
                />
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <ActivitySection activities={task.activities} />
              </div>
            </div>

            {/* Side panel */}
            <div className="w-60 border-l border-[var(--border)] p-5 shrink-0 overflow-y-auto">
              <TaskSidePanel task={task} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Mount TaskDetailModal globally in layout**

In `src/app/(app)/tasks/layout.tsx`, add:

```typescript
import { TaskDetailModal } from '@/features/tasks/components/task-detail/TaskDetailModal';

// Inside the <main> or after:
<TaskDetailModal />
```

- [ ] **Step 9: Wire KanbanBoard to open modal on card click**

In `src/features/tasks/components/KanbanBoard.tsx`, find the task card click handler and call:

```typescript
const openTaskDetail = useTasksUiStore((s) => s.openTaskDetail);
// On task card click:
openTaskDetail(taskId);
```

- [ ] **Step 10: Type-check + visual verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Open board, click a task card — verify modal opens with checklist, comments, attachments, activity.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(tasks/detail): TaskDetailModal with checklist, comments, attachments, activity + real-time"
```

---

### Task 8: Reports page (Recharts)

**Files:**
- Modify: `src/app/(app)/tasks/reports/page.tsx`
- Create: `src/features/tasks/components/reports/StatCards.tsx`
- Create: `src/features/tasks/components/reports/DailyBarChart.tsx`
- Create: `src/features/tasks/components/reports/StatusDonutChart.tsx`
- Create: `src/features/tasks/components/reports/TeamWorkload.tsx`

**Interfaces:**
- Consumes: `reportsApi.getProjectStats` (Task 3), `useTasksUiStore.selectedProjectId`

- [ ] **Step 1: Create `src/features/tasks/components/reports/StatCards.tsx`**

```typescript
'use client';

import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import type { ProjectStatsDto } from '../../types/task.types';

interface StatCardsProps {
  stats: ProjectStatsDto;
}

export function StatCards({ stats }: StatCardsProps): JSX.Element {
  const cards = [
    { label: 'Tổng task', value: stats.totalTasks, icon: ListTodo, color: '#8b7cf0' },
    { label: 'Hoàn thành', value: stats.completedTasks, icon: CheckCircle2, color: '#22c55e' },
    { label: 'Đang mở', value: stats.openTasks, icon: Clock, color: '#f59e0b' },
    { label: 'Quá hạn', value: stats.overdueTasks, icon: AlertTriangle, color: '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/tasks/components/reports/DailyBarChart.tsx`**

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ProjectStatsDto } from '../../types/task.types';

interface DailyBarChartProps {
  data: ProjectStatsDto['dailyCompleted'];
}

export function DailyBarChart({ data }: DailyBarChartProps): JSX.Element {
  return (
    <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Task hoàn thành (7 ngày qua)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fill: '#9a9db5', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9a9db5', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#f5f6f8', fontSize: 12 }}
            cursor={{ fill: 'rgba(139,124,240,0.1)' }}
          />
          <Bar dataKey="count" fill="#8b7cf0" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/tasks/components/reports/StatusDonutChart.tsx`**

```typescript
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectStatsDto } from '../../types/task.types';

const COLORS = ['#8b7cf0', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

interface StatusDonutChartProps {
  data: ProjectStatsDto['byStatus'];
}

export function StatusDonutChart({ data }: StatusDonutChartProps): JSX.Element {
  const chartData = data.map((s) => ({ name: s.columnName, value: s.count }));

  return (
    <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Phân bổ theo trạng thái</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#f5f6f8', fontSize: 12 }}
          />
          <Legend
            formatter={(value) => <span style={{ color: '#9a9db5', fontSize: 11 }}>{value}</span>}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/tasks/components/reports/TeamWorkload.tsx`**

```typescript
'use client';

import { Users } from 'lucide-react';
import type { ProjectStatsDto } from '../../types/task.types';

interface TeamWorkloadProps {
  data: ProjectStatsDto['memberWorkload'];
  totalTasks: number;
}

export function TeamWorkload({ data, totalTasks }: TeamWorkloadProps): JSX.Element {
  const maxCount = Math.max(...data.map((m) => m.count), 1);

  return (
    <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-[var(--primary)]" />
        Khối lượng công việc theo thành viên
      </h3>
      <div className="space-y-3">
        {data.map((m) => {
          const pct = Math.round((m.count / maxCount) * 100);
          return (
            <div key={m.userId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[var(--primary)] font-bold">
                      {m.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--foreground)]">{m.displayName}</span>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{m.count} task</span>
              </div>
              <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">Chưa có dữ liệu.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `src/app/(app)/tasks/reports/page.tsx`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useTasksUiStore } from '@/features/tasks/stores/tasks-ui.store';
import { reportsApi } from '@/features/tasks/services/reports.api';
import { StatCards } from '@/features/tasks/components/reports/StatCards';
import { DailyBarChart } from '@/features/tasks/components/reports/DailyBarChart';
import { StatusDonutChart } from '@/features/tasks/components/reports/StatusDonutChart';
import { TeamWorkload } from '@/features/tasks/components/reports/TeamWorkload';
import { FolderOpen } from 'lucide-react';

export default function TasksReportsPage(): JSX.Element {
  const selectedProjectId = useTasksUiStore((s) => s.selectedProjectId);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['tasks', 'reports', selectedProjectId],
    queryFn: () => reportsApi.getProjectStats(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
        <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Chọn một dự án để xem báo cáo</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-32 bg-[var(--secondary)] rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <></>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Báo cáo</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Thống kê tiến độ và hiệu suất</p>
      </div>

      <StatCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DailyBarChart data={stats.dailyCompleted} />
        <StatusDonutChart data={stats.byStatus} />
      </div>

      <TeamWorkload data={stats.memberWorkload} totalTasks={stats.totalTasks} />
    </div>
  );
}
```

- [ ] **Step 6: Type-check + visual verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Select a project from Projects page, navigate to Reports — verify 4 stat cards + bar chart + donut + team workload render.

- [ ] **Step 7: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. Fix any errors before committing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(tasks/reports): Reports page with Recharts bar chart, donut, team workload"
```

---

## Final Verification

- [ ] Navigate all 4 routes: `/tasks/home`, `/tasks/projects`, `/tasks/board?projectId=X`, `/tasks/reports`
- [ ] Open two browser tabs on `/tasks/board?projectId=X`, create a task in tab 1 — verify it appears in tab 2 (real-time)
- [ ] Click a task card — verify detail modal opens with checklist/comments
- [ ] Add a checklist item, toggle it — verify real-time update
- [ ] Upload a file attachment — verify it appears after upload
- [ ] Add a comment — verify it appears immediately
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
