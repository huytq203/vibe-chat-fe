# UI quản trị Commitment Graph — Khách hàng & Phạm vi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm view "Cam kết" (`boardView === 'commitments'`) vào khu vực project đã có, với 2 tab
hoạt động đầy đủ (Khách hàng, Phạm vi) và 2 tab placeholder (Cam kết, Yêu cầu thay đổi — sub-project
sau).

**Architecture:** Mở rộng `boardView` union có sẵn ở `tasks-ui.store.ts` (không route mới). Shell
`CommitmentGraphView` dùng `Tabs` có sẵn. 2 API client file mới (`client.api.ts`, `scope.api.ts`) +
2 hook file mới, theo đúng pattern `commitments.api.ts`/`useConfirmSuggestion.ts` đã có từ milestone
trước.

**Tech Stack:** React, TanStack Query, Vitest + Testing Library, sonner.

**Spec:** `docs/superpowers/specs/2026-09-21-commitment-graph-admin-client-scope-design.md`

## Global Constraints

- KHÔNG dùng `any`. Named export cho hook/API/component.
- UI text + comment nghiệp vụ tiếng Việt, định danh tiếng Anh.
- Mọi mutation Scope PHẢI đọc `version` từ `data` mới nhất (React Query state) tại thời điểm gọi —
  không cache version cục bộ.
- KHÔNG implement tab "Cam kết"/"Yêu cầu thay đổi" (giữ `SettingsPlaceholder`) — ngoài phạm vi plan
  này.

---

## Task 1: Shell — mở rộng `boardView`, `CommitmentGraphView`, tiện ích `taskClient`

**Files:**
- Modify: `src/features/tasks/stores/tasks-ui.store.ts`
- Modify: `src/features/tasks/components/board/BoardHeader.tsx`
- Test: `src/features/tasks/components/board/BoardHeader.test.tsx` (mới)
- Modify: `src/features/tasks/components/layout/TaskManagementLayout.tsx`
- Modify: `src/features/tasks/lib/task-client.ts`
- Create: `src/features/tasks/components/commitments/CommitmentGraphView.tsx`
- Test: `src/features/tasks/components/commitments/CommitmentGraphView.test.tsx`
- Modify: `src/features/tasks/types.ts` (thêm type, xem spec §3.1 — copy nguyên khối `ProjectContact`/
  `ProjectClient`/`ScopeItemStatus`/`ScopeItem`/`ProjectScope` vào cuối file)

**Interfaces:**
- Produces: `boardView: 'board' | 'list' | 'commitments'`; `CommitmentGraphView({ projectId:
  string })`; `taskClient.put<T>(path, body?)`; `taskClient.delete<T>(path, body?)` (thêm tham số
  `body` optional, không breaking call site cũ) — Task 2/3 dùng `put`/`delete` có body.

- [ ] **Step 1: Sửa `tasks-ui.store.ts`**

Đổi kiểu `boardView`/`setBoardView`:

```ts
boardView: 'board' | 'list' | 'commitments';
setBoardView: (v: 'board' | 'list' | 'commitments') => void;
```

(Giá trị khởi tạo `boardView: 'board'` giữ nguyên.)

- [ ] **Step 2: Sửa `task-client.ts` — thêm `put`, thêm body cho `delete`**

```ts
export const taskClient = {
  get: <T>(path: string) => request<T>('GET', path),
  getPaged: <T, M>(path: string) => requestPaged<T, M>('GET', path),
  post: <T>(
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ) => request<T>('POST', path, body, extraHeaders),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};
```

- [ ] **Step 3: Build ngay để bắt lỗi type sớm**

Run: `npx tsc --noEmit`
Expected: PASS (chỉ thêm method, không đổi chữ ký cũ theo cách breaking).

- [ ] **Step 4: Thêm nút "Cam kết" vào `BoardHeader.tsx`**

Thêm import `ShieldCheck` vào dòng import lucide-react đã có:

```ts
import { Columns3, List, Settings, Share2, ShieldCheck } from 'lucide-react';
```

Thêm nút thứ 3 vào segment control, ngay sau nút "Danh sách":

```tsx
<button
  type="button"
  onClick={() => setBoardView('commitments')}
  aria-pressed={boardView === 'commitments'}
  className={boardView === 'commitments'
    ? 'flex h-9 items-center gap-1.5 rounded-lg bg-background px-3 text-sm font-semibold text-primary shadow-micro'
    : 'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground'}
>
  <ShieldCheck className="h-4 w-4" />
  Cam kết
</button>
```

- [ ] **Step 5: Viết test cho `BoardHeader.tsx` (chưa có file test — tạo mới)**

```tsx
// src/features/tasks/components/board/BoardHeader.test.tsx
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { BoardHeader } from './BoardHeader';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

vi.mock('../../hooks/useMembers', () => ({
  useMembers: () => ({ data: [] }),
}));

describe('BoardHeader', () => {
  it('nên gọi setBoardView("commitments") khi bấm nút Cam kết', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BoardHeader projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: /cam kết/i }));

    expect(useTasksUIStore.getState().boardView).toBe('commitments');
  });
});
```

> Kiểm tra `useMembers` có đúng import path `'../../hooks/useMembers'` từ vị trí file test (cùng
> thư mục `board/`) — nếu path khác, sửa theo import thật trong `BoardHeader.tsx`.

- [ ] **Step 6: Run test Step 5, xác nhận PASS**

Run: `npx vitest run src/features/tasks/components/board/BoardHeader.test.tsx`
Expected: PASS.

- [ ] **Step 7: Thêm type mới vào `types.ts`**

Copy nguyên khối type ở spec §3.1 (`ProjectContact`, `ProjectClient`, `ScopeItemStatus`, `ScopeItem`,
`ProjectScope`) vào cuối `src/features/tasks/types.ts`.

- [ ] **Step 8: Viết `CommitmentGraphView.tsx` (tab Khách hàng/Phạm vi tạm thời dùng
  `SettingsPlaceholder` — Task 2/3 sẽ thay bằng component thật)**

```tsx
// src/features/tasks/components/commitments/CommitmentGraphView.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { SettingsPlaceholder } from '../projects/SettingsPlaceholder';

const TABS = [
  { value: 'client', label: 'Khách hàng' },
  { value: 'scope', label: 'Phạm vi' },
  { value: 'commitments', label: 'Cam kết' },
  { value: 'change-requests', label: 'Yêu cầu thay đổi' },
] as const;

export function CommitmentGraphView({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs defaultValue="client" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 max-w-full shrink-0 flex-nowrap overflow-x-auto sm:mx-5">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <TabsContent value="client">
            <SettingsPlaceholder title="Khách hàng" />
          </TabsContent>
          <TabsContent value="scope">
            <SettingsPlaceholder title="Phạm vi" />
          </TabsContent>
          <TabsContent value="commitments">
            <SettingsPlaceholder title="Danh sách cam kết" />
          </TabsContent>
          <TabsContent value="change-requests">
            <SettingsPlaceholder title="Yêu cầu thay đổi" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
```

> `projectId` chưa dùng ở component này cho tới khi Task 2/3 thay `SettingsPlaceholder` bằng
> `ClientTab`/`ScopeTab` thật (2 component đó cần `projectId`). Giữ tham số trong chữ ký ngay từ
> Task 1 để Task 2/3 không phải sửa lại signature — chấp nhận eslint có thể cảnh báo unused param,
> nếu cảnh báo thật (không phải chỉ warning cho phép), đổi tên thành `_projectId` tạm thời rồi đổi
> lại ở Task 2.

- [ ] **Step 9: Viết test cho `CommitmentGraphView.tsx`**

```tsx
// src/features/tasks/components/commitments/CommitmentGraphView.test.tsx
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CommitmentGraphView } from './CommitmentGraphView';

describe('CommitmentGraphView', () => {
  it('nên hiện đủ 4 tab và mặc định mở tab Khách hàng', () => {
    renderWithProviders(<CommitmentGraphView projectId="proj-1" />);
    expect(screen.getByRole('tab', { name: 'Khách hàng' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Phạm vi' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cam kết' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Yêu cầu thay đổi' }),
    ).toBeInTheDocument();
  });

  it('nên chuyển sang tab Phạm vi khi bấm', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentGraphView projectId="proj-1" />);

    await user.click(screen.getByRole('tab', { name: 'Phạm vi' }));

    expect(screen.getByRole('tab', { name: 'Phạm vi' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
```

> Kiểm tra `Tabs` component thật (`@/components/ui/tabs/Tabs`) có render `role="tab"`/
> `aria-selected` chuẩn Radix/Base UI pattern hay khác — nếu selector không khớp, xem cách
> `ProjectSettingsModal` (hoặc test có sẵn của nó nếu tồn tại) test tab tương tự, dùng đúng
> query đã hoạt động trong repo thay vì đoán.

- [ ] **Step 10: Run test Step 9, xác nhận PASS**

Run: `npx vitest run src/features/tasks/components/commitments/CommitmentGraphView.test.tsx`
Expected: PASS.

- [ ] **Step 11: Wiring vào `TaskManagementLayout.tsx`**

Thêm import:

```ts
import { CommitmentGraphView } from '../commitments/CommitmentGraphView';
```

Sửa khối render (hiện có `boardView === 'board' ? <KanbanBoard .../> : <ListView .../>`):

```tsx
{boardView === 'board' ? (
  <KanbanBoard key={selectedId} projectId={selectedId} />
) : boardView === 'list' ? (
  <ListView projectId={selectedId} />
) : (
  <CommitmentGraphView projectId={selectedId} />
)}
```

- [ ] **Step 12: Build + lint + chạy toàn bộ test đã sửa**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/board/BoardHeader.tsx src/features/tasks/components/board/BoardHeader.test.tsx src/features/tasks/components/layout/TaskManagementLayout.tsx src/features/tasks/lib/task-client.ts src/features/tasks/components/commitments/CommitmentGraphView.tsx src/features/tasks/components/commitments/CommitmentGraphView.test.tsx src/features/tasks/types.ts`
Run: `npx vitest run src/features/tasks`
Expected: build sạch, lint sạch, test PASS (cũ + mới, không regression).

- [ ] **Step 13: Commit**

```bash
git add src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/board/BoardHeader.tsx src/features/tasks/components/board/BoardHeader.test.tsx src/features/tasks/components/layout/TaskManagementLayout.tsx src/features/tasks/lib/task-client.ts src/features/tasks/components/commitments/CommitmentGraphView.tsx src/features/tasks/components/commitments/CommitmentGraphView.test.tsx src/features/tasks/types.ts
git commit -m "feat(tasks): shell view Cam kết (boardView='commitments') với 4 tab placeholder"
```

---

## Task 2: Tab Khách hàng — API, hook, UI

**Files:**
- Modify: `src/features/tasks/services/keys.ts`
- Create: `src/features/tasks/services/client.api.ts`
- Test: `src/features/tasks/services/client.api.test.ts`
- Create: `src/features/tasks/hooks/useClient.ts`
- Test: `src/features/tasks/hooks/useClient.test.ts`
- Create: `src/features/tasks/components/commitments/ClientTab.tsx`
- Test: `src/features/tasks/components/commitments/ClientTab.test.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentGraphView.tsx` (thay
  `SettingsPlaceholder` tab "client" bằng `ClientTab`)

**Interfaces:**
- Consumes: `taskClient.put`/`taskClient.delete` với body (Task 1).
- Produces: `clientApi`, `useProjectClient/useUpsertClient/useAddContact/useUpdateContact/
  useRemoveContact`, `ClientTab({ projectId })`.

- [ ] **Step 1: Thêm query key**

Trong `src/features/tasks/services/keys.ts`, thêm vào object `taskKeys`:

```ts
client: (projectId: string) => [...taskKeys.all, 'client', projectId] as const,
```

- [ ] **Step 2: Viết test trước cho `client.api.ts` (TDD)**

```ts
// src/features/tasks/services/client.api.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientApi } from './client.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

function okResponse(data: unknown) {
  return { ok: true, text: async () => JSON.stringify({ success: true, data }) };
}

describe('clientApi', () => {
  it('get() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await clientApi.get('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/client');
  });

  it('upsert() gửi PUT với đúng body', async () => {
    mockFetch.mockResolvedValue(okResponse({ projectId: 'proj-1', name: 'ACME', contacts: [] }));
    await clientApi.upsert('proj-1', 'ACME');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'ACME' });
  });

  it('addContact() gửi đúng path/body', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'c1', userId: null, name: 'Alex', email: null, title: null, isPrimary: false, isDeleted: false }),
    );
    await clientApi.addContact('proj-1', { name: 'Alex' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Alex' });
  });

  it('updateContact() gửi PATCH với đúng path', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'c1', userId: null, name: 'Alex 2', email: null, title: null, isPrimary: false, isDeleted: false }),
    );
    await clientApi.updateContact('proj-1', 'c1', { name: 'Alex 2' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts/c1');
    expect(init.method).toBe('PATCH');
  });

  it('removeContact() gửi DELETE với đúng path', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await clientApi.removeContact('proj-1', 'c1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/client/contacts/c1');
    expect(init.method).toBe('DELETE');
  });
});
```

- [ ] **Step 3: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/client.api.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 4: Viết `client.api.ts`**

Copy nguyên code ở spec §3.2 (đã đầy đủ, copy-paste được).

- [ ] **Step 5: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/client.api.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 6: Viết test trước cho `useClient.ts`**

```ts
// src/features/tasks/hooks/useClient.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpsertClient, useAddContact } from './useClient';
import { clientApi } from '../services/client.api';

vi.mock('../services/client.api', () => ({
  clientApi: {
    get: vi.fn(),
    upsert: vi.fn(),
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('useUpsertClient', () => {
  it('nên gọi clientApi.upsert với đúng tham số', async () => {
    vi.mocked(clientApi.upsert).mockResolvedValue({ projectId: 'proj-1', name: 'ACME', contacts: [] });
    const { result } = renderHook(() => useUpsertClient('proj-1'), { wrapper });

    result.current.mutate('ACME');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientApi.upsert).toHaveBeenCalledWith('proj-1', 'ACME');
  });
});

describe('useAddContact', () => {
  it('nên gọi clientApi.addContact với đúng tham số', async () => {
    vi.mocked(clientApi.addContact).mockResolvedValue({
      id: 'c1', userId: null, name: 'Alex', email: null, title: null, isPrimary: false, isDeleted: false,
    });
    const { result } = renderHook(() => useAddContact('proj-1'), { wrapper });

    result.current.mutate({ name: 'Alex' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientApi.addContact).toHaveBeenCalledWith('proj-1', { name: 'Alex' });
  });
});
```

- [ ] **Step 7: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/hooks/useClient.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 8: Viết `useClient.ts`**

Copy code ở spec §4.1 (đầy đủ 5 hook, copy-paste được).

- [ ] **Step 9: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/hooks/useClient.test.ts`
Expected: PASS, 2/2 (test chỉ cover 2/5 hook — đủ để xác nhận pattern đúng, 3 hook còn lại
(`useProjectClient`/`useUpdateContact`/`useRemoveContact`) cùng pattern, không cần test riêng nếu
thời gian hạn chế — nhưng NÊN thêm nếu còn dư thời gian trong task, không bắt buộc).

- [ ] **Step 10: Viết `ClientTab.tsx`**

Theo đúng mô tả spec §5.1. Cấu trúc cụ thể:

```tsx
// src/features/tasks/components/commitments/ClientTab.tsx
'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import {
  useProjectClient,
  useUpsertClient,
  useAddContact,
  useUpdateContact,
  useRemoveContact,
} from '../../hooks/useClient';
import type { ProjectContact } from '../../types';

export function ClientTab({ projectId }: { projectId: string }) {
  const client = useProjectClient(projectId);

  if (client.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientNameForm projectId={projectId} name={client.data?.name ?? ''} />
      {client.data && (
        <ContactList projectId={projectId} contacts={client.data.contacts} />
      )}
    </div>
  );
}

function ClientNameForm({ projectId, name }: { projectId: string; name: string }) {
  const [value, setValue] = useState(name);
  const upsert = useUpsertClient(projectId);

  return (
    <div key={name} className="flex items-end gap-2">
      <Input
        label="Tên khách hàng"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="VD: ACME Corporation"
        className="max-w-sm"
      />
      <Button
        onClick={() => upsert.mutate(value.trim())}
        disabled={!value.trim() || value.trim() === name}
        isLoading={upsert.isPending}
      >
        Lưu
      </Button>
    </div>
  );
}

function ContactList({
  projectId,
  contacts,
}: {
  projectId: string;
  contacts: ProjectContact[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectContact | null>(null);
  const [deleting, setDeleting] = useState<ProjectContact | null>(null);
  const removeContact = useRemoveContact(projectId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Người liên hệ</h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm người liên hệ
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có người liên hệ nào.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{c.name}</span>
                  {c.isPrimary && (
                    <Badge variant="soft-primary" size="sm">Liên hệ chính</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.title, c.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa ${c.name}`}
                  onClick={() => setEditing(c)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xoá ${c.name}`}
                  onClick={() => setDeleting(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ContactFormDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
      />
      <ContactFormDialog
        projectId={projectId}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        contact={editing ?? undefined}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá người liên hệ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} sẽ bị xoá khỏi danh sách liên hệ của dự án.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Huỷ</Button>
            <Button
              variant="danger"
              isLoading={removeContact.isPending}
              onClick={() => {
                if (!deleting) return;
                removeContact.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
              }}
            >
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContactFormDialog({
  projectId,
  open,
  onOpenChange,
  mode,
  contact,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  contact?: ProjectContact;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [title, setTitle] = useState(contact?.title ?? '');
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);
  const addContact = useAddContact(projectId);
  const updateContact = useUpdateContact(projectId);
  const pending = mode === 'create' ? addContact.isPending : updateContact.isPending;

  function reset() {
    setName('');
    setEmail('');
    setTitle('');
    setIsPrimary(false);
  }

  function handleSubmit() {
    const input = {
      name: name.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
      isPrimary,
    };
    if (mode === 'create') {
      addContact.mutate(input, {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      });
    } else if (contact) {
      updateContact.mutate(
        { contactId: contact.id, input },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o && mode === 'create') reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm người liên hệ' : 'Sửa người liên hệ'}
          </DialogTitle>
          <DialogDescription>Thông tin người phía khách hàng.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tên" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email (không bắt buộc)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Chức danh (không bắt buộc)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Checkbox
            label="Liên hệ chính"
            checked={isPrimary}
            onCheckedChange={(checked) => setIsPrimary(checked === true)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()} isLoading={pending}>
            {mode === 'create' ? 'Thêm' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

> **Trước khi dùng `Checkbox`:** đọc `src/components/ui/checkbox/Checkbox.tsx` thật để xác nhận prop
> là `onCheckedChange` (không phải `onChange`) — nếu khác, sửa theo API thật của component.

- [ ] **Step 11: Thay `SettingsPlaceholder` bằng `ClientTab` trong `CommitmentGraphView.tsx`**

```tsx
import { ClientTab } from './ClientTab';
// ...
<TabsContent value="client">
  <ClientTab projectId={projectId} />
</TabsContent>
```

- [ ] **Step 12: Viết test cho `ClientTab.tsx`**

Happy path (hiện tên + danh sách contact), form tạo mới khi `client.data === null`, thêm contact
(mở dialog, điền, submit → gọi đúng mutation), xoá contact (mở AlertDialog, xác nhận → gọi
`removeContact`). Mock `useProjectClient`/`useUpsertClient`/`useAddContact`/`useUpdateContact`/
`useRemoveContact` từ `../../hooks/useClient` (theo pattern `ConfirmCreateCommitmentForm.test.tsx`
đã có ở milestone trước — mock hook trực tiếp thay vì mock API tầng dưới, đơn giản hơn cho test
component).

- [ ] **Step 13: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/ClientTab.test.tsx`
Expected: PASS.

- [ ] **Step 14: Build + lint + full scope test**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/services/keys.ts src/features/tasks/services/client.api.ts src/features/tasks/services/client.api.test.ts src/features/tasks/hooks/useClient.ts src/features/tasks/hooks/useClient.test.ts src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Expected: sạch, PASS toàn bộ.

- [ ] **Step 15: Commit**

```bash
git add src/features/tasks/services/keys.ts src/features/tasks/services/client.api.ts src/features/tasks/services/client.api.test.ts src/features/tasks/hooks/useClient.ts src/features/tasks/hooks/useClient.test.ts src/features/tasks/components/commitments/ClientTab.tsx src/features/tasks/components/commitments/ClientTab.test.tsx src/features/tasks/components/commitments/CommitmentGraphView.tsx
git commit -m "feat(tasks): tab Khách hàng trong Commitment Graph — CRUD contact"
```

---

## Task 3: Tab Phạm vi — API, hook, UI

**Files:**
- Modify: `src/features/tasks/services/keys.ts`
- Create: `src/features/tasks/services/scope.api.ts`
- Test: `src/features/tasks/services/scope.api.test.ts`
- Create: `src/features/tasks/hooks/useScope.ts`
- Test: `src/features/tasks/hooks/useScope.test.ts`
- Create: `src/features/tasks/components/commitments/ScopeTab.tsx`
- Test: `src/features/tasks/components/commitments/ScopeTab.test.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentGraphView.tsx` (thay
  `SettingsPlaceholder` tab "scope" bằng `ScopeTab`)

**Interfaces:**
- Consumes: `taskClient.put`/`taskClient.delete` với body (Task 1).
- Produces: `scopeApi`, `useProjectScope/useUpdateScopeDocument/useAddScopeItem/useUpdateScopeItem/
  useRemoveScopeItem`, `ScopeTab({ projectId })`.

- [ ] **Step 1: Thêm query key**

Trong `src/features/tasks/services/keys.ts`:

```ts
scope: (projectId: string) => [...taskKeys.all, 'scope', projectId] as const,
```

- [ ] **Step 2: Viết test trước cho `scope.api.ts` (TDD)**

```ts
// src/features/tasks/services/scope.api.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scopeApi } from './scope.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

function okResponse(data: unknown) {
  return { ok: true, text: async () => JSON.stringify({ success: true, data }) };
}

const SCOPE = { projectId: 'proj-1', rawDocument: null, version: 0, items: [] };

describe('scopeApi', () => {
  it('get() gọi đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.get('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/scope');
  });

  it('updateDocument() gửi PUT với rawDocument + version', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.updateDocument('proj-1', 'Nội dung SOW', 3);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/document');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ rawDocument: 'Nội dung SOW', version: 3 });
  });

  it('addItem() gửi đúng path/body', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.addItem('proj-1', { title: 'Đăng nhập', version: 2 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items');
    expect(JSON.parse(init.body as string)).toEqual({ title: 'Đăng nhập', version: 2 });
  });

  it('updateItem() gửi PATCH với đúng path', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.updateItem('proj-1', 'item-1', { status: 'PHASE_2', version: 2 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items/item-1');
    expect(init.method).toBe('PATCH');
  });

  it('removeItem() gửi DELETE kèm body version', async () => {
    mockFetch.mockResolvedValue(okResponse(SCOPE));
    await scopeApi.removeItem('proj-1', 'item-1', 2);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/scope/items/item-1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ version: 2 });
  });
});
```

- [ ] **Step 3: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/scope.api.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 4: Viết `scope.api.ts`**

Copy nguyên code ở spec §3.3.

- [ ] **Step 5: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/scope.api.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 6: Viết `useScope.ts`**

Cùng pattern `useClient.ts` (Task 2) — 5 hook: `useProjectScope(projectId)` (query, key
`taskKeys.scope(projectId)`, queryFn `scopeApi.get`), `useUpdateScopeDocument(projectId)`,
`useAddScopeItem(projectId)`, `useUpdateScopeItem(projectId)`, `useRemoveScopeItem(projectId)` —
mỗi mutation `onSuccess` invalidate `taskKeys.scope(projectId)` + toast tiếng Việt phù hợp
("Đã lưu tài liệu phạm vi" / "Đã thêm hạng mục" / "Đã cập nhật hạng mục" / "Đã xoá hạng mục"),
`onError` toast lỗi chung ("Không thể lưu tài liệu phạm vi" / v.v., dùng `error.message` nếu là
`Error`). Viết test 2/5 hook tối thiểu (theo đúng mức Task 2 Step 6-9), ưu tiên
`useAddScopeItem`/`useUpdateScopeItem` (2 hook có logic tham số phức tạp nhất, đáng test nhất).

- [ ] **Step 7: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/hooks/useScope.test.ts`

- [ ] **Step 8: Viết `ScopeTab.tsx`**

Theo mô tả spec §5.2. Cấu trúc:

```tsx
// src/features/tasks/components/commitments/ScopeTab.tsx
'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Textarea } from '@/components/ui/textarea/Textarea';
import {
  useProjectScope,
  useUpdateScopeDocument,
  useAddScopeItem,
  useUpdateScopeItem,
  useRemoveScopeItem,
} from '../../hooks/useScope';
import type { ScopeItem, ScopeItemStatus } from '../../types';

const STATUS_LABELS: Record<ScopeItemStatus, string> = {
  APPROVED: 'Đã duyệt',
  PHASE_2: 'Giai đoạn 2',
  REMOVED: 'Đã gỡ',
};

const STATUS_BADGE_VARIANT: Record<ScopeItemStatus, 'soft-success' | 'soft-warning' | 'secondary'> = {
  APPROVED: 'soft-success',
  PHASE_2: 'soft-warning',
  REMOVED: 'secondary',
};

export function ScopeTab({ projectId }: { projectId: string }) {
  const scope = useProjectScope(projectId);

  if (scope.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!scope.data) return null;

  return (
    <div className="space-y-6">
      <ScopeDocumentForm projectId={projectId} rawDocument={scope.data.rawDocument} version={scope.data.version} />
      <ScopeItemList projectId={projectId} items={scope.data.items} version={scope.data.version} />
    </div>
  );
}

function ScopeDocumentForm({
  projectId,
  rawDocument,
  version,
}: {
  projectId: string;
  rawDocument: string | null;
  version: number;
}) {
  const [value, setValue] = useState(rawDocument ?? '');
  const update = useUpdateScopeDocument(projectId);

  return (
    <div key={`${version}:${rawDocument ?? ''}`} className="space-y-2">
      <Textarea
        label="Tài liệu phạm vi (SOW/hợp đồng)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Dán nội dung SOW hoặc mô tả phạm vi dự án..."
      />
      <Button
        size="sm"
        disabled={value === (rawDocument ?? '')}
        isLoading={update.isPending}
        onClick={() => update.mutate({ rawDocument: value, version })}
      >
        Lưu tài liệu
      </Button>
    </div>
  );
}

function ScopeItemList({
  projectId,
  items,
  version,
}: {
  projectId: string;
  items: ScopeItem[];
  version: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ScopeItem | null>(null);
  const [deleting, setDeleting] = useState<ScopeItem | null>(null);
  const removeItem = useRemoveScopeItem(projectId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Hạng mục phạm vi</h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm hạng mục
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hạng mục phạm vi nào.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      item.status === 'REMOVED'
                        ? 'font-medium text-muted-foreground line-through'
                        : 'font-medium text-foreground'
                    }
                  >
                    {item.title}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[item.status]} size="sm">
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa ${item.title}`}
                  onClick={() => setEditing(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xoá ${item.title}`}
                  onClick={() => setDeleting(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ScopeItemFormDialog
        projectId={projectId}
        version={version}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
      />
      <ScopeItemFormDialog
        projectId={projectId}
        version={version}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        item={editing ?? undefined}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hạng mục phạm vi?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" sẽ bị xoá (mềm) khỏi phạm vi dự án.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Huỷ</Button>
            <Button
              variant="danger"
              isLoading={removeItem.isPending}
              onClick={() => {
                if (!deleting) return;
                removeItem.mutate(
                  { itemId: deleting.id, version },
                  { onSuccess: () => setDeleting(null) },
                );
              }}
            >
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScopeItemFormDialog({
  projectId,
  version,
  open,
  onOpenChange,
  mode,
  item,
}: {
  projectId: string;
  version: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  item?: ScopeItem;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [status, setStatus] = useState<ScopeItemStatus>(item?.status ?? 'APPROVED');
  const addItem = useAddScopeItem(projectId);
  const updateItem = useUpdateScopeItem(projectId);
  const pending = mode === 'create' ? addItem.isPending : updateItem.isPending;

  function reset() {
    setTitle('');
    setDescription('');
    setStatus('APPROVED');
  }

  function handleSubmit() {
    if (mode === 'create') {
      addItem.mutate(
        {
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          version,
        },
        { onSuccess: () => { reset(); onOpenChange(false); } },
      );
    } else if (item) {
      updateItem.mutate(
        {
          itemId: item.id,
          input: {
            title: title.trim(),
            description: description.trim(),
            status,
            version,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && mode === 'create') reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Thêm hạng mục phạm vi' : 'Sửa hạng mục phạm vi'}</DialogTitle>
          <DialogDescription>Mô tả 1 hạng mục cụ thể trong phạm vi dự án.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tên hạng mục" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Mô tả (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {mode === 'edit' && (
            <ComboBox
              label="Trạng thái"
              value={status}
              options={[
                { value: 'APPROVED', label: 'Đã duyệt' },
                { value: 'PHASE_2', label: 'Giai đoạn 2' },
                { value: 'REMOVED', label: 'Đã gỡ' },
              ]}
              onValueChange={(v) =>
                setStatus((Array.isArray(v) ? v[0] : v) as ScopeItemStatus)
              }
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} isLoading={pending}>
            {mode === 'create' ? 'Thêm' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

> Đã xác nhận trong `src/components/ui/badge/Badge.tsx`: variant có sẵn gồm `default`,
> `secondary`, `outline`, `success`, `warning`, `danger`, `soft-primary`, `soft-success`,
> `soft-warning`, `soft-danger`, `glass`, `gradient` — KHÔNG có `soft-muted`, dùng `secondary` cho
> trạng thái `REMOVED` như code trên.

- [ ] **Step 9: Thay `SettingsPlaceholder` bằng `ScopeTab` trong `CommitmentGraphView.tsx`**

```tsx
import { ScopeTab } from './ScopeTab';
// ...
<TabsContent value="scope">
  <ScopeTab projectId={projectId} />
</TabsContent>
```

- [ ] **Step 10: Viết test cho `ScopeTab.tsx`**

Happy path (hiện document + items), lưu document (đổi nội dung → nút "Lưu tài liệu" bật, submit gọi
đúng `version` hiện tại), thêm hạng mục, sửa trạng thái hạng mục (assert gọi `updateItem` với đúng
`status` mới), xoá hạng mục (AlertDialog confirm → gọi `removeItem` với đúng `version`). Mock 5 hook
từ `../../hooks/useScope` trực tiếp (cùng cách Task 2 Step 12).

- [ ] **Step 11: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/ScopeTab.test.tsx`

- [ ] **Step 12: Build + lint + full scope test + toàn bộ suite**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/services/keys.ts src/features/tasks/services/scope.api.ts src/features/tasks/services/scope.api.test.ts src/features/tasks/hooks/useScope.ts src/features/tasks/hooks/useScope.test.ts src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Run: `npx vitest run` (full suite — chỉ chạy 1 lần, KHÔNG song song với lệnh khác để tránh
timeout giả do tranh chấp tài nguyên, đúng bài học từ milestone trước)
Expected: sạch toàn bộ, không regression.

- [ ] **Step 13: Commit**

```bash
git add src/features/tasks/services/keys.ts src/features/tasks/services/scope.api.ts src/features/tasks/services/scope.api.test.ts src/features/tasks/hooks/useScope.ts src/features/tasks/hooks/useScope.test.ts src/features/tasks/components/commitments/ScopeTab.tsx src/features/tasks/components/commitments/ScopeTab.test.tsx src/features/tasks/components/commitments/CommitmentGraphView.tsx
git commit -m "feat(tasks): tab Phạm vi trong Commitment Graph — tài liệu + hạng mục scope"
```
