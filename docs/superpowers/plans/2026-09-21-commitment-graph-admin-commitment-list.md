# Danh sách & chi tiết Commitment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay `SettingsPlaceholder` ở tab "Cam kết" (`CommitmentGraphView`) bằng danh sách
Commitment có filter + infinite scroll, dialog tạo mới, và modal xem chi tiết read-only.

**Architecture:** Mở rộng type/API/hook đã có từ milestone "xác nhận đề xuất AI"
(`commitments.api.ts`, `types.ts`) — không tạo file trùng chức năng. Tái dùng
`useInfiniteScroll`/`useMembers` đã có. State modal chi tiết theo đúng pattern
`selectedTaskId`/`TaskDetailModal` đã có ở `tasks-ui.store.ts`.

**Tech Stack:** React, TanStack Query, Vitest + Testing Library, sonner.

**Spec:** `docs/superpowers/specs/2026-09-21-commitment-graph-admin-commitment-list-design.md`

## Global Constraints

- KHÔNG dùng `any`. Định danh tiếng Anh, UI text/comment nghiệp vụ tiếng Việt.
- KHÔNG implement sửa/transition/evidence/link task/gắn source-ref mới — chỉ đọc + tạo mới. Xem
  spec §11.
- Nhãn tiếng Việt (status/risk/scope/evidence) đặt trong `commitment-labels.ts` riêng, KHÔNG import
  chéo từ `features/chat`.

---

## Task 1: Type, API client, query key, hooks

**Files:**
- Modify: `src/features/tasks/types.ts` (mở rộng `CommitmentSummary`, thêm `DeliveryStatus`,
  `CommitmentRiskCode`, `CommitmentTaskLink`, `EvidenceMilestone`, `EvidenceType`,
  `CommitmentEvidence`, `SourceRef`, `CommitmentDetail` — copy nguyên khối ở spec §2)
- Modify: `src/features/tasks/services/commitments.api.ts` (thêm `listPaged`, `getDetail`,
  `getSourceRefContent`)
- Test: `src/features/tasks/services/commitments.api.test.ts` (thêm case, file đã có)
- Modify: `src/features/tasks/services/keys.ts` (thêm `commitments`, `commitmentDetail`)
- Create: `src/features/tasks/lib/commitment-labels.ts`
- Create: `src/features/tasks/hooks/useCommitments.ts`
- Test: `src/features/tasks/hooks/useCommitments.test.ts`

**Interfaces:**
- Produces: `commitmentsApi.listPaged/getDetail/getSourceRefContent`; `taskKeys.commitments/
  commitmentDetail`; `DELIVERY_STATUS_LABELS/RISK_LABELS/SCOPE_STATUS_LABELS/
  EVIDENCE_MILESTONE_LABELS`; hooks `useCommitmentsInfinite/useCommitmentDetail/
  useCreateCommitment` — Task 2/3 dùng trực tiếp.

- [ ] **Step 1: Mở rộng `types.ts`**

Copy nguyên khối type ở spec §2 — SỬA `CommitmentSummary` hiện có (thêm field, giữ tên), thêm các
type mới còn lại vào cuối file.

- [ ] **Step 2: Build ngay để bắt lỗi type sớm (đặc biệt chỗ nào đang dùng `CommitmentSummary` cũ)**

Run: `npx tsc --noEmit`
Expected: PASS — field mới đều optional-safe hoặc đã có giá trị thật từ backend, không có call site
nào tự tạo `CommitmentSummary` thủ công thiếu field (kiểm tra
`ConfirmLinkExistingCommitmentForm.tsx`/test liên quan nếu lỗi xuất hiện ở đó — thường chỉ đọc
`.id`/`.title` nên không vỡ).

- [ ] **Step 3: Viết test trước cho API mới (thêm vào `commitments.api.test.ts` đã có)**

```ts
// Thêm vào cuối describe('commitmentsApi', ...) trong commitments.api.test.ts đã có
it('listPaged() gửi đúng query filter', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
  });
  await commitmentsApi.listPaged('proj-1', {
    page: 2,
    limit: 20,
    deliveryStatus: 'IN_PROGRESS',
    risk: 'OVERDUE',
  });
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/projects/proj-1/commitments?');
  expect(url).toContain('page=2');
  expect(url).toContain('deliveryStatus=IN_PROGRESS');
  expect(url).toContain('risk=OVERDUE');
});

it('getDetail() gọi đúng path', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
  await commitmentsApi.getDetail('c1');
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/commitments/c1');
});

it('getSourceRefContent() gọi đúng path', async () => {
  mockFetch.mockResolvedValue(okResponse([]));
  await commitmentsApi.getSourceRefContent('c1', 'ref1');
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/commitments/c1/source-refs/ref1/content');
});
```

> Dùng lại `mockFetch`/`okResponse` đã khai báo ở đầu file test (không khai báo lại).

- [ ] **Step 4: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: FAIL — 3 method chưa tồn tại.

- [ ] **Step 5: Thêm 3 method vào `commitmentsApi`**

```ts
listPaged: (
  projectId: string,
  params: {
    page?: number;
    limit?: number;
    deliveryStatus?: DeliveryStatus;
    scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
    risk?: CommitmentRiskCode;
    ownerId?: string;
  },
) => {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 20));
  if (params.deliveryStatus) sp.set('deliveryStatus', params.deliveryStatus);
  if (params.scopeStatus) sp.set('scopeStatus', params.scopeStatus);
  if (params.risk) sp.set('risk', params.risk);
  if (params.ownerId) sp.set('ownerId', params.ownerId);
  return taskClient.getPaged<CommitmentSummary[], PaginationMeta>(
    `/api/v1/projects/${projectId}/commitments?${sp.toString()}`,
  );
},

getDetail: (commitmentId: string) =>
  taskClient.get<CommitmentDetail>(`/api/v1/commitments/${commitmentId}`),

getSourceRefContent: (commitmentId: string, refId: string) =>
  taskClient.get<ResolvedMessage[]>(
    `/api/v1/commitments/${commitmentId}/source-refs/${refId}/content`,
  ),
```

Cập nhật import ở đầu `commitments.api.ts`:

```ts
import type {
  ChangeRequestSummary,
  CommitmentDetail,
  CommitmentRiskCode,
  CommitmentSummary,
  CreateSourceRefInput,
  DeliveryStatus,
  PaginationMeta,
} from '../types';
import type { ResolvedMessage } from '@/features/chat/types';
```

- [ ] **Step 6: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: PASS toàn bộ (test cũ + 3 test mới).

- [ ] **Step 7: Thêm query key**

Trong `keys.ts`:

```ts
commitments: (projectId: string) => [...taskKeys.all, 'commitments', projectId] as const,
commitmentDetail: (commitmentId: string) => [...taskKeys.all, 'commitment', commitmentId] as const,
```

- [ ] **Step 8: Viết `commitment-labels.ts`**

Copy nguyên khối ở spec §9 (4 hằng số `Record`).

- [ ] **Step 9: Viết test trước cho `useCommitments.ts`**

```ts
// src/features/tasks/hooks/useCommitments.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCommitmentsInfinite,
  useCommitmentDetail,
  useCreateCommitment,
} from './useCommitments';
import { commitmentsApi } from '../services/commitments.api';

vi.mock('../services/commitments.api', () => ({
  commitmentsApi: {
    listPaged: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('useCommitmentsInfinite', () => {
  it('nên gọi commitmentsApi.listPaged với đúng filter', async () => {
    vi.mocked(commitmentsApi.listPaged).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });
    const { result } = renderHook(
      () => useCommitmentsInfinite('proj-1', { deliveryStatus: 'READY' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.listPaged).toHaveBeenCalledWith('proj-1', {
      page: 1,
      limit: 20,
      deliveryStatus: 'READY',
    });
  });
});

describe('useCommitmentDetail', () => {
  it('không gọi API khi commitmentId rỗng', () => {
    const { result } = renderHook(() => useCommitmentDetail(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(commitmentsApi.getDetail).not.toHaveBeenCalled();
  });
});

describe('useCreateCommitment', () => {
  it('nên gọi commitmentsApi.create với idempotency key mới mỗi lần', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({} as never);
    const { result } = renderHook(() => useCreateCommitment('proj-1'), { wrapper });

    result.current.mutate({ title: 'X', scopeStatus: 'UNCLEAR' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      expect.any(String),
    );
  });
});
```

- [ ] **Step 10: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/hooks/useCommitments.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 11: Viết `useCommitments.ts`**

```ts
// src/features/tasks/hooks/useCommitments.ts
'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commitmentsApi } from '../services/commitments.api';
import { taskKeys } from '../services/keys';
import type { CommitmentRiskCode, DeliveryStatus } from '../types';

const PAGE_SIZE = 20;

export interface CommitmentFilters {
  deliveryStatus?: DeliveryStatus;
  scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
  risk?: CommitmentRiskCode;
  ownerId?: string;
}

export function useCommitmentsInfinite(projectId: string, filters: CommitmentFilters) {
  return useInfiniteQuery({
    queryKey: [...taskKeys.commitments(projectId), 'infinite', filters] as const,
    queryFn: ({ pageParam }) =>
      commitmentsApi.listPaged(projectId, { page: pageParam, limit: PAGE_SIZE, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
}

export function useCommitmentDetail(commitmentId: string) {
  return useQuery({
    queryKey: taskKeys.commitmentDetail(commitmentId),
    queryFn: () => commitmentsApi.getDetail(commitmentId),
    enabled: !!commitmentId,
  });
}

export function useCreateCommitment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.create>[1]) =>
      commitmentsApi.create(projectId, input, crypto.randomUUID()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitments(projectId) });
      toast.success('Đã tạo cam kết');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể tạo cam kết'),
  });
}
```

- [ ] **Step 12: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/hooks/useCommitments.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 13: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/types.ts src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/services/keys.ts src/features/tasks/lib/commitment-labels.ts src/features/tasks/hooks/useCommitments.ts src/features/tasks/hooks/useCommitments.test.ts`
Expected: sạch.

- [ ] **Step 14: Commit**

```bash
git add src/features/tasks/types.ts src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/services/keys.ts src/features/tasks/lib/commitment-labels.ts src/features/tasks/hooks/useCommitments.ts src/features/tasks/hooks/useCommitments.test.ts
git commit -m "feat(tasks): type/API/hook cho danh sách & chi tiết Commitment"
```

---

## Task 2: `CommitmentsTab` — danh sách, filter, tạo mới

**Files:**
- Modify: `src/features/tasks/stores/tasks-ui.store.ts` (thêm `selectedCommitmentId`/
  `openCommitmentDetail`/`closeCommitmentDetail`)
- Create: `src/features/tasks/components/commitments/CommitmentsTab.tsx`
- Test: `src/features/tasks/components/commitments/CommitmentsTab.test.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentGraphView.tsx` (thay
  `SettingsPlaceholder` tab "commitments" bằng `CommitmentsTab`)

**Interfaces:**
- Consumes: `useCommitmentsInfinite`/`useCreateCommitment` (Task 1); `useInfiniteScroll`/
  `useMembers` (có sẵn); `DELIVERY_STATUS_LABELS`/`RISK_LABELS`/`SCOPE_STATUS_LABELS` (Task 1).
- Produces: `CommitmentsTab({ projectId })`.

- [ ] **Step 1: Thêm state modal vào `tasks-ui.store.ts`**

```ts
selectedCommitmentId: string | null;
openCommitmentDetail: (id: string) => void;
closeCommitmentDetail: () => void;
```

```ts
selectedCommitmentId: null,
openCommitmentDetail: (id) => set({ selectedCommitmentId: id }),
closeCommitmentDetail: () => set({ selectedCommitmentId: null }),
```

- [ ] **Step 2: Viết `CommitmentsTab.tsx`**

```tsx
// src/features/tasks/components/commitments/CommitmentsTab.tsx
'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Text } from '@/components/ui/typography/Typography';
import {
  DELIVERY_STATUS_LABELS,
  RISK_LABELS,
  SCOPE_STATUS_LABELS,
} from '../../lib/commitment-labels';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMembers } from '../../hooks/useMembers';
import { useCommitmentsInfinite, useCreateCommitment } from '../../hooks/useCommitments';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { CommitmentFilters } from '../../hooks/useCommitments';
import type { CommitmentSummary, DeliveryStatus, CommitmentRiskCode } from '../../types';

const DELIVERY_STATUS_VARIANT: Record<
  DeliveryStatus,
  'secondary' | 'soft-warning' | 'soft-success' | 'soft-danger'
> = {
  PLANNED: 'secondary',
  IN_PROGRESS: 'secondary',
  READY: 'soft-warning',
  DELIVERED: 'soft-warning',
  ACCEPTED: 'soft-success',
  CHANGES_REQUESTED: 'soft-danger',
  CANCELLED: 'soft-danger',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function isOverdue(commitment: CommitmentSummary): boolean {
  if (!commitment.dueAt) return false;
  if (commitment.deliveryStatus === 'ACCEPTED' || commitment.deliveryStatus === 'CANCELLED') {
    return false;
  }
  return new Date(commitment.dueAt) < new Date();
}

export function CommitmentsTab({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<CommitmentFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const openDetail = useTasksUIStore((s) => s.openCommitmentDetail);

  const commitments = useCommitmentsInfinite(projectId, filters);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage: commitments.hasNextPage,
    isFetchingNextPage: commitments.isFetchingNextPage,
    onLoadMore: () => void commitments.fetchNextPage(),
  });

  const items = commitments.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ComboBox
          label="Trạng thái bàn giao"
          value={filters.deliveryStatus ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              deliveryStatus: ((Array.isArray(v) ? v[0] : v) || undefined) as DeliveryStatus | undefined,
            }))
          }
          className="w-48"
        />
        <ComboBox
          label="Phạm vi"
          value={filters.scopeStatus ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(SCOPE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              scopeStatus: ((Array.isArray(v) ? v[0] : v) || undefined) as
                | 'IN_SCOPE'
                | 'UNCLEAR'
                | 'OUT_OF_SCOPE'
                | undefined,
            }))
          }
          className="w-44"
        />
        <ComboBox
          label="Rủi ro"
          value={filters.risk ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              risk: ((Array.isArray(v) ? v[0] : v) || undefined) as CommitmentRiskCode | undefined,
            }))
          }
          className="w-48"
        />
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tạo cam kết
        </Button>
      </div>

      {commitments.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Text size="sm" color="muted">Chưa có cam kết nào.</Text>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            Tạo cam kết đầu tiên
          </Button>
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openDetail(c.id)}
              className="flex w-full flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{c.title}</span>
                <Badge variant={DELIVERY_STATUS_VARIANT[c.deliveryStatus]} size="sm">
                  {DELIVERY_STATUS_LABELS[c.deliveryStatus]}
                </Badge>
                {c.risks.slice(0, 2).map((r) => (
                  <Badge key={r} variant="soft-danger" size="sm">
                    {RISK_LABELS[r]}
                  </Badge>
                ))}
                {c.risks.length > 2 && (
                  <Badge variant="soft-danger" size="sm">+{c.risks.length - 2}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {c.contact && <span>{c.contact.name}</span>}
                <span className={isOverdue(c) ? 'font-medium text-danger' : undefined}>
                  Hạn: {formatDate(c.dueAt)}
                </span>
              </div>
            </button>
          ))}
          {commitments.hasNextPage && (
            <div ref={sentinelRef} className="py-2 text-center">
              {commitments.isFetchingNextPage && (
                <Text size="xs" color="muted">Đang tải thêm…</Text>
              )}
            </div>
          )}
        </div>
      )}

      <CreateCommitmentDialog projectId={projectId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateCommitmentDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const members = useMembers(projectId);
  const create = useCreateCommitment(projectId);

  const memberOptions = (members.data ?? []).map((m) => ({ value: m.userId, label: m.displayName }));

  function reset() {
    setTitle('');
    setDescription('');
    setOwnerId('');
    setDueAt(undefined);
  }

  function handleSubmit() {
    create.mutate(
      {
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(ownerId ? { ownerId } : {}),
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
        scopeStatus: 'UNCLEAR',
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo cam kết</DialogTitle>
          <DialogDescription>Một cam kết mới với khách hàng.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Mô tả (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ComboBox
            label="Người chịu trách nhiệm (không bắt buộc)"
            value={ownerId}
            options={memberOptions}
            onValueChange={(v) => setOwnerId(Array.isArray(v) ? (v[0] ?? '') : v)}
            placeholder="Chọn thành viên"
            emptyText="Không có thành viên."
          />
          <DatePicker
            mode="single"
            editable
            label="Hạn hoàn thành (không bắt buộc)"
            placeholder="dd/mm/yyyy"
            value={dueAt}
            onChange={(d) => setDueAt(d instanceof Date ? d : undefined)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} isLoading={create.isPending}>
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

> **Trước khi dùng:** đọc `ComboBox` thật để xác nhận `className` là prop hợp lệ (đã thấy dùng ở
> `MessageAnalysisDialog.tsx` dạng `className="[&_[role=combobox]]:min-h-11"` — xác nhận `className`
> áp lên root, không phải lên input con, điều chỉnh nếu khác). Đọc `Text` component
> (`@/components/ui/typography/Typography`) xác nhận prop `size`/`color` đúng như dùng ở
> `ProjectList.tsx`.

- [ ] **Step 3: Wiring vào `CommitmentGraphView.tsx`**

```tsx
import { CommitmentsTab } from './CommitmentsTab';
// ...
<TabsContent value="commitments">
  <CommitmentsTab projectId={projectId} />
</TabsContent>
```

- [ ] **Step 4: Viết test cho `CommitmentsTab.tsx`**

Mock `useCommitmentsInfinite`/`useCreateCommitment`/`useMembers` trực tiếp (theo pattern
`ClientTab.test.tsx`). Case: hiện đúng danh sách + badge; đổi filter gọi lại hook với params mới
(assert `useCommitmentsInfinite` được gọi lại — kiểm tra qua mock lần gọi thứ 2 nếu component
re-render với filter mới, hoặc đơn giản hơn: assert giá trị `ComboBox` thay đổi đúng khi chọn); rỗng
→ hiện CTA; tạo mới (mở dialog, điền, submit → gọi đúng `create.mutate`); click 1 item → gọi
`openDetail` với đúng id (mock `useTasksUIStore`).

- [ ] **Step 5: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/CommitmentsTab.test.tsx`

- [ ] **Step 6: Build + lint + full scope test**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Expected: sạch, PASS toàn bộ.

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/commitments/CommitmentsTab.tsx src/features/tasks/components/commitments/CommitmentsTab.test.tsx src/features/tasks/components/commitments/CommitmentGraphView.tsx
git commit -m "feat(tasks): tab Cam kết — danh sách filter + infinite scroll + tạo mới"
```

---

## Task 3: `CommitmentDetailModal` (read-only)

**Files:**
- Create: `src/features/tasks/components/commitments/CommitmentDetailModal.tsx`
- Test: `src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentsTab.tsx` (mount
  `CommitmentDetailModal` ở cuối)

**Interfaces:**
- Consumes: `useCommitmentDetail` (Task 1); `commitmentsApi.getSourceRefContent` (Task 1);
  `useMembers` (có sẵn); `selectedCommitmentId`/`closeCommitmentDetail` (Task 2).

- [ ] **Step 1: Viết `CommitmentDetailModal.tsx`**

```tsx
// src/features/tasks/components/commitments/CommitmentDetailModal.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Text } from '@/components/ui/typography/Typography';
import {
  DELIVERY_STATUS_LABELS,
  EVIDENCE_MILESTONE_LABELS,
  RISK_LABELS,
  SCOPE_STATUS_LABELS,
} from '../../lib/commitment-labels';
import { useMembers } from '../../hooks/useMembers';
import { useCommitmentDetail } from '../../hooks/useCommitments';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { SourceRef } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function CommitmentDetailModal({ projectId }: { projectId: string }) {
  const selectedId = useTasksUIStore((s) => s.selectedCommitmentId);
  const close = useTasksUIStore((s) => s.closeCommitmentDetail);
  const detail = useCommitmentDetail(selectedId ?? '');
  const members = useMembers(projectId);

  const ownerName = (ownerId: string | null) =>
    ownerId
      ? (members.data ?? []).find((m) => m.userId === ownerId)?.displayName ?? ownerId
      : 'Chưa có người phụ trách';

  return (
    <Dialog open={selectedId !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {detail.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {detail.data.title}
                <Badge variant="secondary" size="sm">
                  {DELIVERY_STATUS_LABELS[detail.data.deliveryStatus]}
                </Badge>
                <Badge variant="soft-primary" size="sm">
                  {SCOPE_STATUS_LABELS[detail.data.scopeStatus]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {detail.data.isReadyToDeliver && (
                <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                  Đã sẵn sàng bàn giao
                </div>
              )}

              {detail.data.risks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.data.risks.map((r) => (
                    <Badge key={r} variant="soft-danger" size="sm">{RISK_LABELS[r]}</Badge>
                  ))}
                </div>
              )}

              {detail.data.description && (
                <p className="text-sm text-foreground">{detail.data.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="Khách hàng" value={detail.data.contact?.name ?? '—'} />
                <InfoField label="Người phụ trách" value={ownerName(detail.data.ownerId)} />
                <InfoField label="Đã hứa lúc" value={formatDate(detail.data.promisedAt)} />
                <InfoField label="Hạn hoàn thành" value={formatDate(detail.data.dueAt)} />
                <InfoField label="Đã bàn giao lúc" value={formatDate(detail.data.deliveredAt)} />
              </div>

              <Section title="Task liên kết">
                {detail.data.tasks.length === 0 ? (
                  <EmptyText>Chưa liên kết task nào.</EmptyText>
                ) : (
                  <ul className="space-y-1">
                    {detail.data.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span>{t.title}</span>
                        {t.completedAt && (
                          <Badge variant="soft-success" size="sm">Hoàn thành</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Bằng chứng">
                {detail.data.evidence.length === 0 ? (
                  <EmptyText>Chưa có bằng chứng.</EmptyText>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.data.evidence.map((e) => (
                      <li key={e.id} className="text-sm">
                        <span className="font-medium">{EVIDENCE_MILESTONE_LABELS[e.milestone]}</span>
                        {': '}
                        {e.type === 'URL' && e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {e.url}
                          </a>
                        ) : (
                          e.note
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Nguồn tham chiếu">
                {detail.data.sourceRefs.length === 0 ? (
                  <EmptyText>Chưa gắn nguồn tham chiếu.</EmptyText>
                ) : (
                  <SourceRefList commitmentId={detail.data.id} refs={detail.data.sourceRefs} />
                )}
              </Section>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" color="muted">{label}</Text>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <Text size="sm" color="muted">{children}</Text>;
}

function SourceRefList({ commitmentId, refs }: { commitmentId: string; refs: SourceRef[] }) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);

  return (
    <ul className="space-y-1.5">
      {refs.map((ref) => (
        <li key={ref.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span>{ref.type === 'CHAT_MESSAGE' ? 'Tin nhắn chat' : ref.type}</span>
            {ref.type === 'CHAT_MESSAGE' && (
              <button
                type="button"
                className="text-xs font-medium text-primary underline"
                onClick={() => setOpenRefId(openRefId === ref.id ? null : ref.id)}
              >
                {openRefId === ref.id ? 'Ẩn nội dung' : 'Xem nội dung'}
              </button>
            )}
          </div>
          {openRefId === ref.id && (
            <SourceRefContent commitmentId={commitmentId} refId={ref.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceRefContent({ commitmentId, refId }: { commitmentId: string; refId: string }) {
  const content = useQuery({
    queryKey: ['tasks', 'commitment', commitmentId, 'source-ref-content', refId],
    queryFn: () => commitmentsApi.getSourceRefContent(commitmentId, refId),
  });

  if (content.isPending) return <Skeleton className="mt-1 h-8 w-full" />;
  if (!content.data || content.data.length === 0) {
    return <EmptyText>Không tìm được nội dung tin nhắn.</EmptyText>;
  }

  return (
    <ul className="mt-1 space-y-1 rounded-lg bg-muted/50 p-2">
      {content.data.map((m) => (
        <li key={m.uuid} className="text-xs text-muted-foreground">
          {m.previewText}
        </li>
      ))}
    </ul>
  );
}
```

> **Trước khi dùng:** đọc `Dialog`/`DialogContent` thật xác nhận `className="max-h-[85vh]
> max-w-2xl overflow-y-auto"` không xung đột style mặc định (đã thấy pattern tương tự ở
> `MessageAnalysisDialog.tsx` dùng `max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden` — điều
> chỉnh theo đúng convention thật nếu khác).

- [ ] **Step 2: Mount `CommitmentDetailModal` trong `CommitmentsTab.tsx`**

Thêm cuối JSX (`CommitmentsTab`, sau `CreateCommitmentDialog`):

```tsx
<CommitmentDetailModal projectId={projectId} />
```

- [ ] **Step 3: Viết test cho `CommitmentDetailModal.tsx`**

Mock `useCommitmentDetail`/`useMembers`/`useTasksUIStore`/`commitmentsApi.getSourceRefContent`.
Case: đóng khi `selectedCommitmentId === null` (không render dialog mở); hiện đầy đủ field khi có
data; từng section rỗng hiện đúng text; bấm "Xem nội dung" gọi đúng API với `commitmentId`/`refId`.

- [ ] **Step 4: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`

- [ ] **Step 5: Build + lint + full scope test + full suite (1 lần, không song song việc khác)**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Run: `npx vitest run`
Expected: sạch toàn bộ, không regression.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/commitments/CommitmentDetailModal.tsx src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx src/features/tasks/components/commitments/CommitmentsTab.tsx
git commit -m "feat(tasks): modal chi tiết Commitment (read-only) — task, evidence, nguồn tham chiếu"
```
