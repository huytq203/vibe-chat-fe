# Task Management — Full Implementation Design

**Date:** 2026-06-29  
**Status:** Approved  
**Scope:** BE (`task-service`) + FE (`vibe-chat-fe`)  
**Reference mockup:** `/home/huytq/Downloads/Hệ thống quản lý task/TaskFlow.dc.html`

---

## 1. Decisions

| Câu hỏi | Quyết định |
|---------|-----------|
| Scope | Full: 4 trang + Task Detail đầy đủ + WebSocket real-time |
| Attachments | S3 presigned URL flow, bucket `vibe-attachments` |
| Navigation | Route `/tasks` riêng biệt (không liên quan `/work`) |
| User info | Sync từ vibe-chat API → cache vào `UserSnapshot` |
| Real-time | Socket.io dual-room: `project:{id}` + `task:{id}` |
| Charts | Recharts |
| Stats | REST (không cần real-time) |

---

## 2. Backend Architecture (`task-service`)

### 2.1 New Modules

```
src/modules/
├── comments/      # TaskComment CRUD + emit real-time
├── checklists/    # TaskChecklist CRUD + emit real-time
├── tags/          # Tag CRUD + TaskTag attach/detach
├── assignees/     # TaskAssignee add/remove + emit real-time
├── attachments/   # S3 presigned URL + confirm + delete
├── activities/    # ActivityLog read-only
├── reports/       # REST stats (no real-time)
└── gateway/       # Socket.io WebSocket gateway
```

### 2.2 New REST Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/v1/tasks/:id/detail` | Task detail đầy đủ (tags, assignees, checklist, comments, attachments, activity) |
| `POST` | `/api/v1/tasks/:id/comments` | Tạo comment |
| `PATCH` | `/api/v1/tasks/:id/comments/:cid` | Sửa comment |
| `DELETE` | `/api/v1/tasks/:id/comments/:cid` | Xóa comment |
| `POST` | `/api/v1/tasks/:id/checklists` | Thêm checklist item |
| `PATCH` | `/api/v1/tasks/:id/checklists/:cid` | Toggle/sửa item |
| `DELETE` | `/api/v1/tasks/:id/checklists/:cid` | Xóa item |
| `POST` | `/api/v1/tasks/:id/assignees/:uid` | Thêm assignee |
| `DELETE` | `/api/v1/tasks/:id/assignees/:uid` | Xóa assignee |
| `GET` | `/api/v1/projects/:id/tags` | Danh sách tag của project |
| `POST` | `/api/v1/projects/:id/tags` | Tạo tag |
| `DELETE` | `/api/v1/projects/:id/tags/:tagId` | Xóa tag |
| `POST` | `/api/v1/tasks/:id/tags/:tagId` | Attach tag vào task |
| `DELETE` | `/api/v1/tasks/:id/tags/:tagId` | Detach tag khỏi task |
| `POST` | `/api/v1/tasks/:id/attachments/presign` | Lấy presigned upload URL |
| `POST` | `/api/v1/tasks/:id/attachments/confirm` | Confirm upload + lưu record |
| `DELETE` | `/api/v1/tasks/:id/attachments/:aid` | Xóa attachment (S3 + DB) |
| `GET` | `/api/v1/projects/:id/activities` | Activity log của project (phân trang) |
| `GET` | `/api/v1/reports/stats` | Stats tổng quan của user hiện tại |
| `GET` | `/api/v1/reports/projects/:id/stats` | Stats 1 project |
| `GET` | `/api/v1/users/snapshot` | Upsert + trả UserSnapshot |

### 2.3 WebSocket Gateway

**Namespace:** `/tasks`  
**Auth:** JWT middleware tại handshake

**Client → Server events:**

| Event | Payload | Hành động |
|-------|---------|-----------|
| `join-project` | `{ projectId }` | Socket join room `project:{projectId}` |
| `leave-project` | `{ projectId }` | Socket leave room |
| `join-task` | `{ taskId }` | Socket join room `task:{taskId}` |
| `leave-task` | `{ taskId }` | Socket leave room |

**Server → Client (project room `project:{id}`):**

| Event | Payload |
|-------|---------|
| `task:created` | `TaskResponseDto` |
| `task:updated` | `{ taskId, changes }` |
| `task:moved` | `{ taskId, columnId, position }` |
| `task:deleted` | `{ taskId }` |
| `column:created` | `BoardColumnDto` |
| `column:updated` | `{ columnId, changes }` |
| `column:deleted` | `{ columnId }` |

**Server → Client (task room `task:{id}`):**

| Event | Payload |
|-------|---------|
| `comment:created` | `CommentDto` |
| `comment:updated` | `{ commentId, content }` |
| `comment:deleted` | `{ commentId }` |
| `checklist:added` | `ChecklistItemDto` |
| `checklist:toggled` | `{ itemId, isDone }` |
| `checklist:deleted` | `{ itemId }` |
| `attachment:added` | `AttachmentDto` |
| `attachment:deleted` | `{ attachmentId }` |
| `assignee:added` | `AssigneeDto` |
| `assignee:removed` | `{ userId }` |
| `task:field-updated` | `{ field, value }` |

### 2.4 Config thêm vào `configuration.ts`

```typescript
s3: {
  internalEndpoint: string  // http://localhost:9000 (server-side)
  endpoint: string          // https://s3.halotech.io.vn (public)
  region: string
  accessKey: string
  secretKey: string
  forcePathStyle: boolean
  bucketAttachments: string // 'vibe-attachments'
  uploadUrlTtl: number      // seconds
  downloadUrlTtl: number    // seconds
}
userServiceUrl: string      // vibe-chat URL để sync UserSnapshot
```

### 2.5 ActivityLog pattern

Mọi action quan trọng (create task, move, comment, assign, toggle checklist) đều tạo một `ActivityLog` record. `CommentsService`, `ChecklistsService`, `TasksService` v.v. emit `activity.logged` event → `ActivitiesService` lắng nghe và ghi vào DB. Không ghi trực tiếp từ các module.

---

## 3. Frontend Architecture (`vibe-chat-fe`)

### 3.1 Route Structure

```
src/app/tasks/
├── layout.tsx          # TasksRootLayout: auth + TasksSidebar + TasksHeader
├── page.tsx            # redirect → /tasks/home
├── home/
│   └── page.tsx        # Dashboard: MyTasksCard + ActivityCard + ProjectsOverview
├── projects/
│   └── page.tsx        # ProjectsTable + NewProjectModal
├── board/
│   └── page.tsx        # BoardView (?projectId=xxx query param)
└── reports/
    └── page.tsx        # StatCards + DailyBarChart + DonutChart + TeamWorkload
```

### 3.2 Feature Component Tree

```
src/features/tasks/components/
├── layout/
│   ├── TasksSidebar.tsx          # Logo TF + nav icons + settings + user avatar
│   └── TasksHeader.tsx           # Search + bell + "Tạo mới" button
├── home/
│   ├── MyTasksCard.tsx           # Tasks được assign cho current user
│   └── ActivityCard.tsx          # Real-time activity feed (project room)
├── projects/
│   ├── ProjectsTable.tsx         # Grid: name, progress bar, open count, members, status
│   └── NewProjectModal.tsx       # (giữ nguyên)
├── board/
│   ├── BoardView.tsx             # Toggle Kanban / List
│   ├── KanbanBoard.tsx           # @dnd-kit, columns, real-time
│   ├── ListView.tsx              # List grouped by column
│   ├── Column.tsx                # Drop target + column header
│   ├── TaskCard.tsx              # Card: priority badge, tags, checklist progress, assignees, due
│   └── AddColumnButton.tsx
├── task-detail/
│   ├── TaskDetailModal.tsx       # Overlay 820px, closes on backdrop click
│   ├── ChecklistSection.tsx      # Progress bar + items + add input
│   ├── CommentsSection.tsx       # List + compose input (real-time)
│   ├── AttachmentsSection.tsx    # File list + presigned upload
│   ├── ActivitySection.tsx       # Scrollable history
│   └── TaskSidePanel.tsx         # Status / Due date / Priority / Tags / Assignees
└── reports/
    ├── StatCards.tsx             # 4 metric cards
    ├── DailyBarChart.tsx         # Recharts BarChart (7 ngày)
    ├── StatusDonutChart.tsx      # Recharts PieChart
    └── TeamWorkload.tsx          # Progress bars per member
```

### 3.3 State & Real-time Hooks

```
src/features/tasks/
├── stores/
│   ├── tasks-ui.store.ts         # activeView, selectedProjectId, openTaskId
│   └── board.store.ts            # Optimistic board state (columns + tasks)
├── hooks/
│   ├── useBoardRealtime.ts       # Subscribe project room → update board store
│   ├── useTaskDetailRealtime.ts  # Subscribe task room → update detail queries
│   └── useActivityFeed.ts        # Subscribe project room → activity list
└── lib/
    └── task-socket.ts            # Socket.io singleton cho task-service
```

### 3.4 `task-socket.ts` Pattern

```typescript
// Tương tự src/lib/ws/socket.ts nhưng kết nối task-service
// URL: env.NEXT_PUBLIC_TASK_WS_URL (e.g. ws://localhost:3002)
// Namespace: /tasks
// Auth: Bearer token (giống chat socket)
// Export: connectTaskSocket(), disconnectTaskSocket(), getTaskSocket()
```

### 3.5 Color Mapping (Mockup → Dark Theme)

| Mockup | CSS Variable | Hex |
|--------|-------------|-----|
| `#6D4AFF` accent | `var(--primary)` | `#8b7cf0` |
| `#211B41` heading | `var(--foreground)` | `#f5f6f8` |
| `#F4F3FB` page bg | `var(--background)` | `#17171f` |
| `#fff` card | `var(--secondary)` | `#242433` |
| `#ECE9F7` border | `var(--border)` | `#32334a` |
| `#9A96B0` muted | `var(--muted-foreground)` | `#9a9db5` |
| Sidebar dark purple | `var(--sidebar)` | `#1d1d28` |
| `#2C2456→#211B41` sidebar gradient | `var(--sidebar)` solid | `#1d1d28` |

---

## 4. Key Data Flows

### 4.1 Tạo comment (end-to-end)

```
User submit → POST /tasks/:id/comments { content, authorSnapshot }
  → CommentsService: lưu DB, upsert UserSnapshot, emit 'comment.created'
  → TaskGateway: gateway.to('task:{id}').emit('comment:created', dto)
  → useTaskDetailRealtime: append comment (không refetch)
```

### 4.2 Move task (drag & drop)

```
onDragEnd → optimistic update board.store (instant UI)
  → PATCH /tasks/:id/move { columnId, position }
  → TasksService: update DB, emit 'task.moved', log ActivityLog
  → TaskGateway: project room 'task:moved' { taskId, columnId, position }
  → useBoardRealtime (các client khác): update board store
```

### 4.3 Upload attachment

```
1. POST /tasks/:id/attachments/presign { fileName, mimeType, fileSize }
   ← { uploadUrl, attachmentId, key }
2. PUT uploadUrl (browser → S3 directly)
3. POST /tasks/:id/attachments/confirm { attachmentId }
   ← AttachmentDto với downloadUrl
4. BE emit 'attachment:added' → task room
5. UI append (local + broadcast)
```

### 4.4 UserSnapshot sync

```
FE đọc displayName + avatarUrl từ auth store (đã có sau login Keycloak)
  → gửi kèm trong request body khi comment/assign
  → BE upsert UserSnapshot { userId, displayName, avatarUrl }
  → dùng snapshot khi render activity/comment của user khác
```

---

## 5. Testing Plan

### BE (Jest)

- `CommentsService.create`: happy path + user-not-member → Forbidden
- `ChecklistsService.toggle`: isDone flip + emit event
- `AttachmentsService.presign`: mock S3Client, verify params
- `AttachmentsService.confirm`: lưu record + emit
- `TaskGateway`: mock EventEmitter2, verify emit đúng room

### FE (Vitest)

- `useBoardRealtime`: mock socket, join on mount, leave on unmount
- `TaskDetailModal`: render checklist, toggle → optimistic update
- `CommentsSection`: submit → optimistic append + API call

### E2E (Playwright)

- Tạo project → board → task → drag sang cột khác → verify
- Mở task detail → comment → verify real-time ở tab 2
- Upload file → verify attachment hiển thị

---

## 6. Definition of Done

- [ ] 4 trang `/tasks` render đúng theo mockup (adapted sang dark theme)
- [ ] Board: drag & drop + real-time sync giữa 2 tabs cùng project
- [ ] Task Detail modal: checklist, comments, attachments, activity — đều real-time
- [ ] Reports: 4 stat cards + bar chart + donut + team workload (REST)
- [ ] Upload attachment lên S3 `vibe-attachments` thành công
- [ ] `npm run build` + `npm run lint` không lỗi ở cả 2 repo
- [ ] Ít nhất 1 unit test / service mới (BE) và 1 test / hook chính (FE)
