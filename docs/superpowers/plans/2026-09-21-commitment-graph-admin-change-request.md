# UI Yêu cầu thay đổi (Change Request) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay `SettingsPlaceholder` ở tab "Yêu cầu thay đổi" (`CommitmentGraphView`) bằng danh
sách + tạo mới + chi tiết (xem/sửa/chuyển trạng thái/gỡ nguồn tham chiếu) — sub-project cuối của
"Giao diện quản trị Commitment Graph".

**Architecture:** Mở rộng `changeRequestsApi` đã có (chỉ có `create`) trong `commitments.api.ts`.
File hook/label riêng cho Change Request (không gộp vào file Commitment — domain khác). UI theo
ĐÚNG cấu trúc `CommitmentsTab`/`CommitmentDetailModal` đã có (list+filter+infinite scroll+dialog
tạo mới; modal chi tiết có sửa/transition/source-ref) — copy pattern, đổi domain.

**Tech Stack:** React, TanStack Query, Vitest + Testing Library, sonner.

**Spec:** `docs/superpowers/specs/2026-09-21-commitment-graph-admin-change-request-design.md`

## Global Constraints

- KHÔNG dùng `any`. Định danh tiếng Anh, UI text/comment nghiệp vụ tiếng Việt.
- FE KHÔNG replicate ma trận chuyển trạng thái hợp lệ đầy đủ — chỉ ẩn nút khi status terminal
  (`CLIENT_APPROVED`/`REJECTED`) + field điều kiện theo `to` (`onBehalfOf` khi `CLIENT_APPROVED`,
  `reason` khi `REJECTED`). Backend tự trả lỗi cho bước không hợp lệ khác.
- KHÔNG thêm UI xoá Change Request, KHÔNG thêm UI gắn nguồn tham chiếu mới thủ công, KHÔNG tra cứu
  tên Commitment liên quan (chỉ hiện id thô). Xem spec §7.
- Mọi mutation dùng `version` mới nhất từ query data tại thời điểm submit.

---

## Task 1: Type, API client, query key, hooks, nhãn

**Files:**
- Modify: `src/features/tasks/types.ts` (mở rộng `ChangeRequestSummary`, thêm
  `ChangeRequestStatusValue` — copy nguyên khối ở spec §2)
- Modify: `src/features/tasks/services/commitments.api.ts` (thêm 6 method vào object
  `changeRequestsApi` đã có — copy nguyên ở spec §3)
- Test: `src/features/tasks/services/commitments.api.test.ts` (thêm case, file đã có)
- Modify: `src/features/tasks/services/keys.ts` (thêm `changeRequests`, `changeRequestDetail`)
- Create: `src/features/tasks/lib/change-request-labels.ts`
- Create: `src/features/tasks/hooks/useChangeRequests.ts`
- Test: `src/features/tasks/hooks/useChangeRequests.test.ts`

**Interfaces:**
- Produces: `changeRequestsApi.listPaged/getDetail/update/transition/addSourceRef/
  removeSourceRef/getSourceRefContent`; `taskKeys.changeRequests/changeRequestDetail`;
  `CHANGE_REQUEST_STATUS_LABELS`; hooks `useChangeRequestsInfinite/useChangeRequestDetail/
  useCreateChangeRequest/useUpdateChangeRequest/useTransitionChangeRequest/
  useRemoveChangeRequestSourceRef` — Task 2/3 dùng trực tiếp.

- [ ] **Step 1: Mở rộng `types.ts`** — copy nguyên khối type ở spec §2 (sửa `ChangeRequestSummary`
  hiện có, thêm `ChangeRequestStatusValue`).

- [ ] **Step 2: Build ngay để bắt lỗi type sớm**

Run: `npx tsc --noEmit`
Expected: PASS (kiểm tra `useConfirmCreateChangeRequest` và test liên quan không vỡ — nếu vỡ, cập
nhật mock data thêm field mới, cùng cách đã xử lý ở `CommitmentSummary` milestone trước).

- [ ] **Step 3: Viết test trước cho 6 API mới (thêm vào `describe('changeRequestsApi', ...)` đã có
  trong `commitments.api.test.ts`)**

```ts
it('listPaged() gửi đúng query filter', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
  });
  await changeRequestsApi.listPaged('proj-1', { page: 1, status: 'DRAFT' });
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/projects/proj-1/change-requests?');
  expect(url).toContain('status=DRAFT');
});

it('getDetail() gọi đúng path', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
  await changeRequestsApi.getDetail('cr1');
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/change-requests/cr1');
});

it('update() gửi PATCH với đúng body', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
  await changeRequestsApi.update('cr1', { title: 'X mới', version: 2 });
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/change-requests/cr1');
  expect(init.method).toBe('PATCH');
  expect(JSON.parse(init.body as string)).toEqual({ title: 'X mới', version: 2 });
});

it('transition() gửi POST với đúng body', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'cr1' }));
  await changeRequestsApi.transition('cr1', { to: 'REJECTED', reason: 'Không khả thi', version: 2 });
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/change-requests/cr1/transition');
  expect(JSON.parse(init.body as string)).toEqual({
    to: 'REJECTED',
    reason: 'Không khả thi',
    version: 2,
  });
});

it('removeSourceRef() gửi DELETE với đúng path', async () => {
  mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
  await changeRequestsApi.removeSourceRef('cr1', 'ref1');
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/change-requests/cr1/source-refs/ref1');
  expect(init.method).toBe('DELETE');
});

it('getSourceRefContent() gọi đúng path', async () => {
  mockFetch.mockResolvedValue(okResponse([]));
  await changeRequestsApi.getSourceRefContent('cr1', 'ref1');
  const [url] = mockFetch.mock.calls[0] as [string];
  expect(url).toContain('/api/v1/change-requests/cr1/source-refs/ref1/content');
});
```

- [ ] **Step 4: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: FAIL — 6 method chưa tồn tại (`addSourceRef` không có test riêng ở bước này — logic y hệt
`commitmentsApi.linkSourceRef` đã có test tương tự, chấp nhận không lặp lại).

- [ ] **Step 5: Thêm 6 method vào `changeRequestsApi`** (copy nguyên spec §3, đặt sau `create` đã
  có)

- [ ] **Step 6: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 7: Thêm query key vào `keys.ts`**

```ts
changeRequests: (projectId: string) => [...taskKeys.all, 'change-requests', projectId] as const,
changeRequestDetail: (id: string) => [...taskKeys.all, 'change-request', id] as const,
```

- [ ] **Step 8: Viết `change-request-labels.ts`**

```ts
// src/features/tasks/lib/change-request-labels.ts
import type { ChangeRequestStatusValue } from '../types';

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatusValue, string> = {
  DRAFT: 'Nháp',
  INTERNAL_APPROVED: 'Đã duyệt nội bộ',
  SENT: 'Đã gửi khách',
  CLIENT_APPROVED: 'Khách đã duyệt',
  REJECTED: 'Bị từ chối',
};
```

- [ ] **Step 9: Viết test trước cho `useChangeRequests.ts`**

```ts
// src/features/tasks/hooks/useChangeRequests.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useChangeRequestsInfinite,
  useCreateChangeRequest,
  useTransitionChangeRequest,
} from './useChangeRequests';
import { changeRequestsApi } from '../services/commitments.api';

vi.mock('../services/commitments.api', () => ({
  changeRequestsApi: {
    listPaged: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    removeSourceRef: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('useChangeRequestsInfinite', () => {
  it('nên gọi changeRequestsApi.listPaged với đúng filter', async () => {
    vi.mocked(changeRequestsApi.listPaged).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });
    const { result } = renderHook(
      () => useChangeRequestsInfinite('proj-1', { status: 'DRAFT' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.listPaged).toHaveBeenCalledWith('proj-1', {
      page: 1,
      limit: 20,
      status: 'DRAFT',
    });
  });
});

describe('useCreateChangeRequest', () => {
  it('nên gọi changeRequestsApi.create với idempotency key mới', async () => {
    vi.mocked(changeRequestsApi.create).mockResolvedValue({} as never);
    const { result } = renderHook(() => useCreateChangeRequest('proj-1'), { wrapper });

    result.current.mutate({ title: 'X', impact: 'Ảnh hưởng lớn' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', impact: 'Ảnh hưởng lớn' },
      expect.any(String),
    );
  });
});

describe('useTransitionChangeRequest', () => {
  it('nên gọi changeRequestsApi.transition với đúng tham số', async () => {
    vi.mocked(changeRequestsApi.transition).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useTransitionChangeRequest('proj-1', 'cr1'),
      { wrapper },
    );

    result.current.mutate({ to: 'INTERNAL_APPROVED', version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.transition).toHaveBeenCalledWith('cr1', {
      to: 'INTERNAL_APPROVED',
      version: 1,
    });
  });
});
```

- [ ] **Step 10: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/hooks/useChangeRequests.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 11: Viết `useChangeRequests.ts`**

```ts
// src/features/tasks/hooks/useChangeRequests.ts
'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { changeRequestsApi } from '../services/commitments.api';
import { taskKeys } from '../services/keys';
import type { ChangeRequestStatusValue } from '../types';

const PAGE_SIZE = 20;

export interface ChangeRequestFilters {
  status?: ChangeRequestStatusValue;
  commitmentId?: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useChangeRequestsInfinite(projectId: string, filters: ChangeRequestFilters) {
  return useInfiniteQuery({
    queryKey: [...taskKeys.changeRequests(projectId), 'infinite', filters] as const,
    queryFn: ({ pageParam }) =>
      changeRequestsApi.listPaged(projectId, { page: pageParam, limit: PAGE_SIZE, ...filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
}

export function useChangeRequestDetail(changeRequestId: string) {
  return useQuery({
    queryKey: taskKeys.changeRequestDetail(changeRequestId),
    queryFn: () => changeRequestsApi.getDetail(changeRequestId),
    enabled: !!changeRequestId,
  });
}

export function useCreateChangeRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.create>[1]) =>
      changeRequestsApi.create(projectId, input, crypto.randomUUID()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequests(projectId) });
      toast.success('Đã tạo yêu cầu thay đổi');
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo yêu cầu thay đổi')),
  });
}

export function useUpdateChangeRequest(projectId: string, changeRequestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.update>[1]) =>
      changeRequestsApi.update(changeRequestId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequestDetail(changeRequestId) });
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequests(projectId) });
      toast.success('Đã cập nhật yêu cầu thay đổi');
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể cập nhật yêu cầu thay đổi')),
  });
}

export function useTransitionChangeRequest(projectId: string, changeRequestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.transition>[1]) =>
      changeRequestsApi.transition(changeRequestId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequestDetail(changeRequestId) });
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequests(projectId) });
      toast.success('Đã chuyển trạng thái yêu cầu thay đổi');
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể chuyển trạng thái yêu cầu thay đổi')),
  });
}

export function useRemoveChangeRequestSourceRef(changeRequestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId: string) => changeRequestsApi.removeSourceRef(changeRequestId, refId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.changeRequestDetail(changeRequestId) });
      toast.success('Đã gỡ nguồn tham chiếu');
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể gỡ nguồn tham chiếu')),
  });
}
```

- [ ] **Step 12: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/hooks/useChangeRequests.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 13: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/types.ts src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/services/keys.ts src/features/tasks/lib/change-request-labels.ts src/features/tasks/hooks/useChangeRequests.ts src/features/tasks/hooks/useChangeRequests.test.ts`
Expected: sạch.

- [ ] **Step 14: Commit**

```bash
git add src/features/tasks/types.ts src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/services/keys.ts src/features/tasks/lib/change-request-labels.ts src/features/tasks/hooks/useChangeRequests.ts src/features/tasks/hooks/useChangeRequests.test.ts
git commit -m "feat(tasks): type/API/hook cho danh sách & chi tiết Change Request"
```

---

## Task 2: `ChangeRequestsTab` — danh sách, filter, tạo mới

**Files:**
- Modify: `src/features/tasks/stores/tasks-ui.store.ts` (thêm `selectedChangeRequestId`/
  `openChangeRequestDetail`/`closeChangeRequestDetail`)
- Create: `src/features/tasks/components/commitments/ChangeRequestsTab.tsx`
- Test: `src/features/tasks/components/commitments/ChangeRequestsTab.test.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentGraphView.tsx` (thay
  `SettingsPlaceholder` tab "change-requests" bằng `ChangeRequestsTab`)

**Interfaces:**
- Consumes: `useChangeRequestsInfinite/useCreateChangeRequest` (Task 1); `useInfiniteScroll` (có
  sẵn); `commitmentsApi.list` (có sẵn, milestone trước).

- [ ] **Step 1: Thêm state modal vào `tasks-ui.store.ts`** (cùng pattern
  `selectedCommitmentId`/`openCommitmentDetail`/`closeCommitmentDetail` đã có):

```ts
selectedChangeRequestId: string | null;
openChangeRequestDetail: (id: string) => void;
closeChangeRequestDetail: () => void;
```

```ts
selectedChangeRequestId: null,
openChangeRequestDetail: (id) => set({ selectedChangeRequestId: id }),
closeChangeRequestDetail: () => set({ selectedChangeRequestId: null }),
```

- [ ] **Step 2: Viết `ChangeRequestsTab.tsx`** — CẤU TRÚC GIỐNG HỆT `CommitmentsTab.tsx` (đọc file
  đó thật trước khi viết, copy cấu trúc: filter ComboBox + danh sách `useInfiniteScroll` + dialog
  tạo mới), đổi domain:

```tsx
// src/features/tasks/components/commitments/ChangeRequestsTab.tsx
'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Text } from '@/components/ui/typography/Typography';
import { CHANGE_REQUEST_STATUS_LABELS } from '../../lib/change-request-labels';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import {
  useChangeRequestsInfinite,
  useCreateChangeRequest,
} from '../../hooks/useChangeRequests';
import { commitmentsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { ChangeRequestFilters } from '../../hooks/useChangeRequests';
import type { ChangeRequestStatusValue } from '../../types';

const STATUS_VARIANT: Record<
  ChangeRequestStatusValue,
  'secondary' | 'soft-warning' | 'soft-success' | 'soft-danger'
> = {
  DRAFT: 'secondary',
  INTERNAL_APPROVED: 'soft-warning',
  SENT: 'soft-warning',
  CLIENT_APPROVED: 'soft-success',
  REJECTED: 'soft-danger',
};

export function ChangeRequestsTab({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<ChangeRequestFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const openDetail = useTasksUIStore((state) => state.openChangeRequestDetail);

  const changeRequests = useChangeRequestsInfinite(projectId, filters);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    rootRef: scrollRef,
    hasNextPage: changeRequests.hasNextPage,
    isFetchingNextPage: changeRequests.isFetchingNextPage,
    onLoadMore: () => void changeRequests.fetchNextPage(),
  });

  const items = changeRequests.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ComboBox
          label="Trạng thái"
          value={filters.status ?? ''}
          options={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(CHANGE_REQUEST_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: ((Array.isArray(value) ? value[0] : value) ||
                undefined) as ChangeRequestStatusValue | undefined,
            }))
          }
          className="w-48"
        />
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tạo yêu cầu thay đổi
        </Button>
      </div>

      {changeRequests.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Text size="sm" color="muted">Chưa có yêu cầu thay đổi nào.</Text>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            Tạo yêu cầu đầu tiên
          </Button>
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto">
          {items.map((cr) => (
            <button
              key={cr.id}
              type="button"
              onClick={() => openDetail(cr.id)}
              className="flex w-full flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{cr.title}</span>
                <Badge variant={STATUS_VARIANT[cr.status]} size="sm">
                  {CHANGE_REQUEST_STATUS_LABELS[cr.status]}
                </Badge>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">{cr.impact}</p>
            </button>
          ))}
          {changeRequests.hasNextPage && (
            <div ref={sentinelRef} className="py-2 text-center">
              {changeRequests.isFetchingNextPage && (
                <Text size="xs" color="muted">Đang tải thêm…</Text>
              )}
            </div>
          )}
        </div>
      )}

      <CreateChangeRequestDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function CreateChangeRequestDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [cost, setCost] = useState('');
  const [timelineShiftDays, setTimelineShiftDays] = useState('');
  const [commitmentId, setCommitmentId] = useState('');
  const commitments = useQuery({
    queryKey: ['tasks', projectId, 'commitments', 'list'],
    queryFn: () => commitmentsApi.list(projectId),
  });
  const create = useCreateChangeRequest(projectId);

  const commitmentOptions = (commitments.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.title,
  }));

  function reset() {
    setTitle('');
    setImpact('');
    setEstimateHours('');
    setCost('');
    setTimelineShiftDays('');
    setCommitmentId('');
  }

  function handleSubmit() {
    create.mutate(
      {
        title: title.trim(),
        impact: impact.trim(),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        ...(timelineShiftDays ? { timelineShiftDays: Number(timelineShiftDays) } : {}),
        ...(commitmentId ? { commitmentId } : {}),
      },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu thay đổi</DialogTitle>
          <DialogDescription>Một yêu cầu thay đổi phạm vi với khách hàng.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Tác động" value={impact} onChange={(e) => setImpact(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số giờ ước tính (không bắt buộc)"
              type="number"
              min={0}
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
            />
            <Input
              label="Chi phí ước tính (không bắt buộc)"
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <Input
            label="Số ngày dịch tiến độ (không bắt buộc)"
            type="number"
            value={timelineShiftDays}
            onChange={(e) => setTimelineShiftDays(e.target.value)}
          />
          <ComboBox
            label="Cam kết liên quan (không bắt buộc)"
            value={commitmentId}
            options={commitmentOptions}
            onValueChange={(v) => setCommitmentId(Array.isArray(v) ? (v[0] ?? '') : v)}
            placeholder="Chọn cam kết"
            emptyText="Chưa có cam kết nào."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !impact.trim()}
            isLoading={create.isPending}
          >
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wiring vào `CommitmentGraphView.tsx`**

```tsx
import { ChangeRequestsTab } from './ChangeRequestsTab';
// ...
<TabsContent value="change-requests">
  <ChangeRequestsTab projectId={projectId} />
</TabsContent>
```

- [ ] **Step 4: Viết test cho `ChangeRequestsTab.tsx`** — theo đúng mức đã áp dụng cho
  `CommitmentsTab.test.tsx` (đọc file đó làm mẫu): hiện danh sách + badge, filter, empty state, tạo
  mới, click item gọi `openChangeRequestDetail`.

- [ ] **Step 5: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/ChangeRequestsTab.test.tsx`

- [ ] **Step 6: Build + lint + full scope test**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Expected: sạch, PASS toàn bộ.

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/stores/tasks-ui.store.ts src/features/tasks/components/commitments/ChangeRequestsTab.tsx src/features/tasks/components/commitments/ChangeRequestsTab.test.tsx src/features/tasks/components/commitments/CommitmentGraphView.tsx
git commit -m "feat(tasks): tab Yêu cầu thay đổi — danh sách filter + infinite scroll + tạo mới"
```

---

## Task 3: `ChangeRequestDetailModal` — xem, sửa, chuyển trạng thái, gỡ source ref

**Files:**
- Create: `src/features/tasks/components/commitments/ChangeRequestDetailModal.tsx`
- Test: `src/features/tasks/components/commitments/ChangeRequestDetailModal.test.tsx`
- Modify: `src/features/tasks/components/commitments/ChangeRequestsTab.tsx` (mount modal ở cuối)

**Interfaces:**
- Consumes: `useChangeRequestDetail/useUpdateChangeRequest/useTransitionChangeRequest/
  useRemoveChangeRequestSourceRef` (Task 1); `changeRequestsApi.getSourceRefContent` (Task 1);
  `selectedChangeRequestId`/`closeChangeRequestDetail` (Task 2).

- [ ] **Step 1: Đọc THẬT `CommitmentDetailModal.tsx` (đã có, đầy đủ tính năng tương tự) làm mẫu** —
  copy cấu trúc `InfoField`/`Section`/`EmptyText`/`SourceRefList`/`SourceRefContent` (định nghĩa
  LẠI cục bộ trong file mới, KHÔNG import chéo từ `CommitmentDetailModal.tsx` — 2 file độc lập,
  cùng pattern nhỏ, chấp nhận lặp theo đúng convention đã dùng xuyên suốt dự án này).

- [ ] **Step 2: Viết `ChangeRequestDetailModal.tsx`**

```tsx
// src/features/tasks/components/commitments/ChangeRequestDetailModal.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Text } from '@/components/ui/typography/Typography';
import { Pencil, X } from 'lucide-react';
import { CHANGE_REQUEST_STATUS_LABELS } from '../../lib/change-request-labels';
import {
  useChangeRequestDetail,
  useRemoveChangeRequestSourceRef,
  useTransitionChangeRequest,
  useUpdateChangeRequest,
} from '../../hooks/useChangeRequests';
import { changeRequestsApi } from '../../services/commitments.api';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import type { ChangeRequestStatusValue, ChangeRequestSummary, SourceRef } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function ChangeRequestDetailModal({ projectId }: { projectId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const selectedId = useTasksUIStore((state) => state.selectedChangeRequestId);
  const close = useTasksUIStore((state) => state.closeChangeRequestDetail);
  const detail = useChangeRequestDetail(selectedId ?? '');

  return (
    <Dialog open={selectedId !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
        {detail.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.data ? (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {detail.data.title}
                <Badge variant="secondary" size="sm">
                  {CHANGE_REQUEST_STATUS_LABELS[detail.data.status]}
                </Badge>
                {detail.data.status !== 'CLIENT_APPROVED' && detail.data.status !== 'REJECTED' && (
                  <Button variant="outline" size="sm" onClick={() => setTransitionOpen(true)}>
                    Chuyển trạng thái
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sửa yêu cầu thay đổi"
                  className="ml-auto"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <p className="text-sm text-foreground">{detail.data.impact}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField
                  label="Số giờ ước tính"
                  value={detail.data.estimateHours != null ? String(detail.data.estimateHours) : '—'}
                />
                <InfoField
                  label="Chi phí ước tính"
                  value={detail.data.cost != null ? `${detail.data.cost} ${detail.data.currency}` : '—'}
                />
                <InfoField
                  label="Dịch tiến độ"
                  value={
                    detail.data.timelineShiftDays != null
                      ? `${detail.data.timelineShiftDays} ngày`
                      : '—'
                  }
                />
                <InfoField label="Cam kết liên quan" value={detail.data.commitmentId ?? '—'} />
                <InfoField label="Đã gửi khách lúc" value={formatDate(detail.data.sentAt)} />
                <InfoField
                  label="Khách duyệt bởi"
                  value={detail.data.clientApprovedOnBehalfOf ?? '—'}
                />
                {detail.data.rejectReason && (
                  <InfoField label="Lý do từ chối" value={detail.data.rejectReason} />
                )}
              </div>

              <Section title="Nguồn tham chiếu">
                {detail.data.sourceRefs.length === 0 ? (
                  <EmptyText>Chưa gắn nguồn tham chiếu.</EmptyText>
                ) : (
                  <SourceRefList
                    changeRequestId={detail.data.id}
                    refs={detail.data.sourceRefs}
                  />
                )}
              </Section>
            </div>

            <EditChangeRequestDialog
              projectId={projectId}
              changeRequest={detail.data}
              open={editOpen}
              onOpenChange={setEditOpen}
            />
            <TransitionDialog
              projectId={projectId}
              changeRequest={detail.data}
              open={transitionOpen}
              onOpenChange={setTransitionOpen}
            />
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

function SourceRefList({
  changeRequestId,
  refs,
}: {
  changeRequestId: string;
  refs: SourceRef[];
}) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);
  const removeSourceRef = useRemoveChangeRequestSourceRef(changeRequestId);

  return (
    <ul className="space-y-1.5">
      {refs.map((sourceRef) => (
        <li key={sourceRef.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span>{sourceRef.type === 'CHAT_MESSAGE' ? 'Tin nhắn chat' : sourceRef.type}</span>
            {sourceRef.type === 'CHAT_MESSAGE' && (
              <button
                type="button"
                className="text-xs font-medium text-primary underline"
                onClick={() => setOpenRefId(openRefId === sourceRef.id ? null : sourceRef.id)}
              >
                {openRefId === sourceRef.id ? 'Ẩn nội dung' : 'Xem nội dung'}
              </button>
            )}
            <button
              type="button"
              aria-label="Gỡ nguồn tham chiếu"
              className="ml-auto text-muted-foreground hover:text-danger"
              onClick={() => removeSourceRef.mutate(sourceRef.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {openRefId === sourceRef.id && (
            <SourceRefContent changeRequestId={changeRequestId} refId={sourceRef.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceRefContent({
  changeRequestId,
  refId,
}: {
  changeRequestId: string;
  refId: string;
}) {
  const content = useQuery({
    queryKey: ['tasks', 'change-request', changeRequestId, 'source-ref-content', refId],
    queryFn: () => changeRequestsApi.getSourceRefContent(changeRequestId, refId),
  });

  if (content.isPending) return <Skeleton className="mt-1 h-8 w-full" />;
  if (!content.data || content.data.length === 0) {
    return <EmptyText>Không tìm được nội dung tin nhắn.</EmptyText>;
  }

  return (
    <ul className="mt-1 space-y-1 rounded-lg bg-muted/50 p-2">
      {content.data.map((message) => (
        <li key={message.uuid} className="text-xs text-muted-foreground">
          {message.previewText}
        </li>
      ))}
    </ul>
  );
}

function EditChangeRequestDialog({
  projectId,
  changeRequest,
  open,
  onOpenChange,
}: {
  projectId: string;
  changeRequest: ChangeRequestSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(changeRequest.title);
  const [impact, setImpact] = useState(changeRequest.impact);
  const [estimateHours, setEstimateHours] = useState(
    changeRequest.estimateHours != null ? String(changeRequest.estimateHours) : '',
  );
  const [cost, setCost] = useState(changeRequest.cost ?? '');
  const [timelineShiftDays, setTimelineShiftDays] = useState(
    changeRequest.timelineShiftDays != null ? String(changeRequest.timelineShiftDays) : '',
  );
  const update = useUpdateChangeRequest(projectId, changeRequest.id);

  function handleSubmit() {
    update.mutate(
      {
        title: title.trim(),
        impact: impact.trim(),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        ...(timelineShiftDays ? { timelineShiftDays: Number(timelineShiftDays) } : {}),
        version: changeRequest.version,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa yêu cầu thay đổi</DialogTitle>
          <DialogDescription>Cập nhật thông tin yêu cầu thay đổi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Tác động" value={impact} onChange={(e) => setImpact(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số giờ ước tính"
              type="number"
              min={0}
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
            />
            <Input
              label="Chi phí ước tính"
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <Input
            label="Số ngày dịch tiến độ"
            type="number"
            value={timelineShiftDays}
            onChange={(e) => setTimelineShiftDays(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !impact.trim()} isLoading={update.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransitionDialog({
  projectId,
  changeRequest,
  open,
  onOpenChange,
}: {
  projectId: string;
  changeRequest: ChangeRequestSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState<ChangeRequestStatusValue>(
    (Object.keys(CHANGE_REQUEST_STATUS_LABELS) as ChangeRequestStatusValue[]).find(
      (status) => status !== changeRequest.status,
    )!,
  );
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [reason, setReason] = useState('');
  const transition = useTransitionChangeRequest(projectId, changeRequest.id);

  const needsOnBehalfOf = to === 'CLIENT_APPROVED';
  const needsReason = to === 'REJECTED';
  const canSubmit =
    (!needsOnBehalfOf || onBehalfOf.trim().length > 0) &&
    (!needsReason || reason.trim().length > 0);

  function handleSubmit() {
    transition.mutate(
      {
        to,
        version: changeRequest.version,
        ...(needsOnBehalfOf ? { onBehalfOf: onBehalfOf.trim() } : {}),
        ...(needsReason ? { reason: reason.trim() } : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển trạng thái yêu cầu thay đổi</DialogTitle>
          <DialogDescription>
            Đang ở &quot;{CHANGE_REQUEST_STATUS_LABELS[changeRequest.status]}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Chuyển đến"
            value={to}
            options={Object.entries(CHANGE_REQUEST_STATUS_LABELS)
              .filter(([value]) => value !== changeRequest.status)
              .map(([value, label]) => ({ value, label }))}
            onValueChange={(value) =>
              setTo((Array.isArray(value) ? value[0] : value) as ChangeRequestStatusValue)
            }
          />
          {needsOnBehalfOf && (
            <Input
              label="Người xác nhận phía khách"
              value={onBehalfOf}
              onChange={(e) => setOnBehalfOf(e.target.value)}
              required
            />
          )}
          {needsReason && (
            <Textarea label="Lý do từ chối" value={reason} onChange={(e) => setReason(e.target.value)} required />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} isLoading={transition.isPending}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mount modal trong `ChangeRequestsTab.tsx`**

Thêm import `ChangeRequestDetailModal`, mount cuối JSX chính (cạnh `CreateChangeRequestDialog`):

```tsx
<ChangeRequestDetailModal projectId={projectId} />
```

- [ ] **Step 4: Viết test cho `ChangeRequestDetailModal.tsx`** — theo đúng mức đã áp dụng cho
  `CommitmentDetailModal.test.tsx` (đọc file đó làm mẫu): hiện đầy đủ field, sửa (mở dialog prefill
  đúng, submit gọi đúng input+version), chuyển trạng thái (field điều kiện hiện/ẩn đúng theo `to`,
  submit gọi đúng payload), gỡ source ref, nút "Chuyển trạng thái" ẩn khi status terminal.

- [ ] **Step 5: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/ChangeRequestDetailModal.test.tsx`

- [ ] **Step 6: Build + lint + full scope test + full suite (1 lần, không song song việc khác)**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Run: `npx vitest run`
Expected: sạch toàn bộ, không regression. Sub-project "Change Request" — cũng là sub-project cuối
của "Giao diện quản trị Commitment Graph" — hoàn tất sau task này.

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/components/commitments/ChangeRequestDetailModal.tsx src/features/tasks/components/commitments/ChangeRequestDetailModal.test.tsx src/features/tasks/components/commitments/ChangeRequestsTab.tsx
git commit -m "feat(tasks): modal chi tiết Change Request — sửa, chuyển trạng thái, gỡ nguồn tham chiếu"
```
