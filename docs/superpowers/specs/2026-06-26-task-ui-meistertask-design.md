# Task Management UI — MeisterTask-style (4 screens)

**Date:** 2026-06-26 · **Repo:** vibe-chat-fe (`feat/task-management-fe`) · **Route:** `/work`

## Goal
Build 4 screens matching the MeisterTask demo, using only shadcn/ui components in
`src/components/ui/` (no raw HTML tags). Wire everything the backend (task-service :3006)
already exposes; render deferred features as disabled "Sắp có" placeholders.

## Backend reality (what we can wire)
- **Project**: name, description, ownerId, isBoardLocked, archivedAt. CRUD + `GET /:id/board`.
  - No start/end date fields in schema → New Project date inputs are FE-only/omitted.
- **Column**: name, color, position, isDoneCol. CRUD.
- **Task**: title, description, position, isPinned, dueDate, completedAt. create / patch / `move` / delete.
- **Deferred (DB table exists, NO endpoint)**: Tag, TaskAssignee, TaskComment, TaskChecklist,
  ProjectMember(list/invite), Notification, ActivityLog → **FE-only placeholder** this round.

## Screens
1. **Dashboard** (`Dashboard.tsx`): greeting + date, command search, "My Tasks" widget,
   Notifications widget (empty state — no BE), Projects table w/ progress % (computed from
   board: done-column tasks / total), "My checklist" widget (local-only). Components:
   card, tabs, progress, avatar, badge, command, button.
2. **Kanban board upgrade** (refactor KanbanBoard/Column/TaskCard): section header icon+color
   (popover picker), richer card (pin, due-date badge, deferred checklist/assignee chips shown
   subtly), Add Section, New Project modal (name + description). Card click → Task detail modal.
3. **Task detail modal** (`TaskDetailModal.tsx`): real = edit title, description, due date,
   pin, Complete (set completedAt / move to done column), delete. Deferred sections rendered
   disabled with "Sắp có": checklist, subtask, attachment, tags, assignee, watching, relations,
   comment/activity.
4. **Project settings modal** (`ProjectSettingsModal.tsx`): tabs. Info (rename, description,
   owner, created, lock board) = real. Sharing/Members, Tags, Checklists = deferred placeholder.

## Infrastructure
- New shadcn-style primitives: `scroll-area`, `command`, `label`.
- Extend `BoardTask` type: add `description?`, `dueDate?`, `completedAt?`.
- Add missing API methods + hooks: patch/delete project, patch/delete column,
  patch/delete task (general patch, not just move).

## Conventions to follow
- shadcn in `src/components/ui/`; style via `tailwind-variants` (tv) + `cn()`; base-ui/react
  primitives; lucide-react icons; theme CSS vars; React Query v5 (invalidate `taskKeys`),
  Zustand for transient UI state. Gate = `npm run typecheck` (build is broken repo-wide).

## Out of scope
Real backend endpoints for deferred features; notifications; realtime gateway.
