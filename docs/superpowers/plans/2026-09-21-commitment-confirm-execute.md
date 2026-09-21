# Xác nhận & thực thi đề xuất AI — Implementation Plan (FE)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `suggestedActions` (đọc-only hiện tại ở `MessageAnalysisPreview`) thành hành động ghi
thật: PM chọn 1 action, chỉnh sửa, xác nhận → gọi task-service tạo Commitment/Change
Request/Task hoặc gắn nguồn vào Commitment có sẵn.

**Architecture:** 3 lớp mới, không đổi kiến trúc hiện có — API client (`commitmentsApi`/
`changeRequestsApi`, tái dùng `taskClient` đã có) → mutation hooks (react-query, sinh
`Idempotency-Key` phía form) → 4 form component theo từng `AnalysisActionType`, mount trong
`MessageAnalysisPreview`.

**Tech Stack:** Next.js/React, TanStack Query, Zod (đã dùng cho `messageAnalysisSchema`), `sonner`
(toast), component UI có sẵn (`ComboBox`, `Input`, `Textarea`, `DatePicker`, `Button`, `Dialog`).

**Spec:** `docs/superpowers/specs/2026-09-21-commitment-confirm-execute-design.md`
**Spec song song (backend, PHẢI xong trước Task 1 của plan này):**
`task-service/docs/superpowers/plans/2026-09-21-commitment-confirm-execute.md`

## Global Constraints

- KHÔNG dùng `any`. Named export. Không default export cho hook/component logic (component React
  export theo convention hiện có của repo — kiểm file cạnh để theo đúng, các file đã đọc trong plan
  này đều dùng named export).
- Toàn bộ text hiển thị cho PM: tiếng Việt. Code/identifier: tiếng Anh.
- `Idempotency-Key` CHỈ gửi ở 3 API tạo mới (`commitmentsApi.create`, `changeRequestsApi.create`,
  `tasksApi.createTask`) — KHÔNG gửi ở `linkSourceRef`/`linkTask`/`list` (đúng thiết kế backend, có
  ràng buộc DB tự nhiên chống trùng ở các route đó).
- KHÔNG tạo route/trang mới (danh sách/chi tiết Commitment) — ngoài phạm vi milestone này.
- KHÔNG xử lý `CREATE_DECISION` (backend chưa có entity) — ẩn nút xác nhận cho loại action này.

---

## Task 1: API client — `commitmentsApi`, `changeRequestsApi`, header tuỳ chỉnh

**Files:**
- Modify: `src/features/tasks/lib/task-client.ts`
- Modify: `src/features/tasks/services/tasks.api.ts` (sửa `createTask`, thêm tham số idempotency key)
- Modify: `src/features/tasks/types.ts` (thêm type ở cuối file)
- Create: `src/features/tasks/services/commitments.api.ts`
- Test: `src/features/tasks/services/commitments.api.test.ts`
- Test: `src/features/tasks/lib/task-client.test.ts` (file test cho `task-client.ts` — kiểm tra xem
  đã có chưa; nếu chưa có test nào cho file này, tạo mới; nếu đã có, thêm case mới vào file đó thay
  vì tạo trùng)

**Interfaces:**
- Produces: `taskClient.post<T>(path, body?, extraHeaders?)`; `commitmentsApi.create/linkSourceRef/
  linkTask/list`; `changeRequestsApi.create`; `tasksApi.createTask(projectId, input, idempotencyKey)`
  (chữ ký cũ `createTask(projectId, input)` — thêm tham số thứ 3 **bắt buộc** vì route giờ đòi hỏi
  header, sửa tại chỗ mọi call site hiện có của `tasksApi.createTask`, xem Step 5).
- Consumes: không phụ thuộc task nào khác trong plan này.

- [ ] **Step 1: Sửa `task-client.ts` để nhận header tuỳ chỉnh**

Trong `src/features/tasks/lib/task-client.ts`, sửa hàm `request` và export `taskClient.post`:

```ts
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = apiAuth.getToken();
  const res = await fetch(`${taskBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as Envelope<T>) : null;
  if (!res.ok || (json !== null && !json.success)) {
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
  return normalizeTaskDisplayNames((json ? json.data : undefined) as T);
}
```

```ts
export const taskClient = {
  get: <T>(path: string) => request<T>('GET', path),
  getPaged: <T, M>(path: string) => requestPaged<T, M>('GET', path),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
    request<T>('POST', path, body, extraHeaders),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
```

(`requestPaged` giữ nguyên — không cần header tuỳ chỉnh cho GET trong milestone này.)

- [ ] **Step 2: Thêm type mới vào cuối `src/features/tasks/types.ts`**

```ts
export interface CommitmentSummary {
  id: string;
  title: string;
  deliveryStatus: string;
}

export interface ChangeRequestSummary {
  id: string;
  title: string;
  status: string;
}

export interface CreateSourceRefInput {
  type: 'CHAT_MESSAGE';
  conversationId: string;
  messageIds: string[];
}
```

- [ ] **Step 3: Viết test trước cho `commitments.api.ts` (TDD)**

```ts
// src/features/tasks/services/commitments.api.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { commitmentsApi, changeRequestsApi } from './commitments.api';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

function okResponse(data: unknown) {
  return {
    ok: true,
    text: async () => JSON.stringify({ success: true, data }),
  };
}

describe('commitmentsApi', () => {
  it('create() gửi đúng path/body và header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'c1', title: 'X', deliveryStatus: 'PLANNED' }));

    await commitmentsApi.create(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      'idem-key-1',
    );

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/commitments');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('idem-key-1');
    expect(JSON.parse(init.body as string)).toEqual({ title: 'X', scopeStatus: 'UNCLEAR' });
  });

  it('linkSourceRef() KHÔNG gửi header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));

    await commitmentsApi.linkSourceRef('c1', {
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1'],
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBeUndefined();
  });

  it('linkTask() gọi đúng path với taskId trong body', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));
    await commitmentsApi.linkTask('c1', 't1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/commitments/c1/tasks');
    expect(JSON.parse(init.body as string)).toEqual({ taskId: 't1' });
  });

  it('list() gọi đúng path với limit=100', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
    });
    await commitmentsApi.list('proj-1');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/projects/proj-1/commitments?limit=100');
  });
});

describe('changeRequestsApi', () => {
  it('create() gửi đúng path/body và header Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'cr1', title: 'X', status: 'DRAFT' }),
    );

    await changeRequestsApi.create(
      'proj-1',
      { title: 'X', impact: 'Ảnh hưởng lớn' },
      'idem-key-2',
    );

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/projects/proj-1/change-requests');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('idem-key-2');
  });
});
```

> Kiểm tra file test hiện có (`tasks.api.test.ts` nếu tồn tại, hoặc bất kỳ `*.test.ts` cạnh
> `services/`) dùng `vitest` hay `jest` — dùng ĐÚNG runner đã cấu hình trong repo (import
> `describe/it/expect/vi` từ `vitest` nếu `package.json` có `"test": "vitest"`, đổi `vi.fn()` sang
> `jest.fn()` nếu repo dùng Jest — đã xác nhận trước đó trong review là repo dùng `vitest`
> — `npx vitest run` chạy toàn bộ 1005 test).

- [ ] **Step 4: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: FAIL — module `./commitments.api` chưa tồn tại.

- [ ] **Step 5: Viết `commitments.api.ts`**

```ts
// src/features/tasks/services/commitments.api.ts
import { taskClient } from '../lib/task-client';
import type {
  CommitmentSummary,
  ChangeRequestSummary,
  CreateSourceRefInput,
} from '../types';

export const commitmentsApi = {
  create: (
    projectId: string,
    input: {
      title: string;
      description?: string;
      ownerId?: string;
      promisedAt?: string;
      dueAt?: string;
      scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      sourceRefs?: CreateSourceRefInput[];
    },
    idempotencyKey: string,
  ) =>
    taskClient.post<CommitmentSummary>(
      `/api/v1/projects/${projectId}/commitments`,
      input,
      { 'Idempotency-Key': idempotencyKey },
    ),

  linkSourceRef: (commitmentId: string, input: CreateSourceRefInput) =>
    taskClient.post<void>(`/api/v1/commitments/${commitmentId}/source-refs`, input),

  linkTask: (commitmentId: string, taskId: string) =>
    taskClient.post<void>(`/api/v1/commitments/${commitmentId}/tasks`, { taskId }),

  // Picker cho LINK_EXISTING_COMMITMENT. Backend chưa hỗ trợ tìm theo tên (`q`) — lấy 1 trang
  // tối đa (limit=100, giới hạn cứng của PaginationQueryDto) rồi filter theo title ở client.
  list: (projectId: string) =>
    taskClient.getPaged<CommitmentSummary[], { total: number }>(
      `/api/v1/projects/${projectId}/commitments?limit=100`,
    ),
};

export const changeRequestsApi = {
  create: (
    projectId: string,
    input: {
      title: string;
      impact: string;
      estimateHours?: number;
      cost?: number;
      timelineShiftDays?: number;
      commitmentId?: string;
      sourceRefs?: CreateSourceRefInput[];
    },
    idempotencyKey: string,
  ) =>
    taskClient.post<ChangeRequestSummary>(
      `/api/v1/projects/${projectId}/change-requests`,
      input,
      { 'Idempotency-Key': idempotencyKey },
    ),
};
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: PASS, 5/5 test.

- [ ] **Step 7: Sửa `tasksApi.createTask` để nhận `idempotencyKey`, cập nhật call site**

Trong `src/features/tasks/services/tasks.api.ts`:

```ts
createTask: (
  projectId: string,
  input: { title: string; columnId: string },
  idempotencyKey: string,
) =>
  taskClient.post<BoardTask>(`/api/v1/projects/${projectId}/tasks`, input, {
    'Idempotency-Key': idempotencyKey,
  }),
```

Tìm mọi nơi gọi `tasksApi.createTask(` hiện có (`grep -rn "tasksApi.createTask(" src/`) — mỗi call
site cần truyền thêm `crypto.randomUUID()` làm tham số thứ 3 nếu chưa đi qua hook mới ở Task 2 (giữ
hành vi cũ nguyên vẹn, chỉ thêm idempotency ở tầng gọi trực tiếp — các nơi dùng qua hook mới
`useConfirmCreateTask` ở Task 2 tự lo phần này, không cần sửa 2 lần).

- [ ] **Step 8: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/lib/task-client.ts src/features/tasks/services/tasks.api.ts src/features/tasks/services/commitments.api.ts src/features/tasks/types.ts`
Expected: không lỗi.

- [ ] **Step 9: Commit**

```bash
git add src/features/tasks/lib/task-client.ts src/features/tasks/services/tasks.api.ts src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/types.ts
git commit -m "feat(tasks): commitmentsApi/changeRequestsApi + hỗ trợ Idempotency-Key ở taskClient"
```

---

## Task 2: Helper build source ref + mutation hooks

**Files:**
- Create: `src/features/chat/lib/message-analysis.ts`
- Test: `src/features/chat/lib/message-analysis.test.ts`
- Create: `src/features/chat/hooks/useConfirmSuggestion.ts`
- Test: `src/features/chat/hooks/useConfirmSuggestion.test.ts`

**Interfaces:**
- Consumes: `commitmentsApi`, `changeRequestsApi` (Task 1); `tasksApi.createTask` (Task 1, đã sửa
  chữ ký); `tasksApi.listMembers`/`getBoard` (có sẵn, không đổi); `MessageAnalysis['source']` (có
  sẵn, `types/message-analysis.ts`).
- Produces: `buildSourceRefFromAnalysis(source): CreateSourceRefInput`; hooks
  `useConfirmCreateCommitment(projectId)`, `useConfirmCreateChangeRequest(projectId)`,
  `useConfirmCreateTask(projectId)`, `useConfirmLinkExistingCommitment()` — Task 3 dùng trực tiếp.

- [ ] **Step 1: Viết test cho helper (TDD)**

```ts
// src/features/chat/lib/message-analysis.test.ts
import { describe, expect, it } from 'vitest';
import { buildSourceRefFromAnalysis } from './message-analysis';

describe('buildSourceRefFromAnalysis', () => {
  it('map đúng conversationId/messageIds sang CreateSourceRefInput', () => {
    const result = buildSourceRefFromAnalysis({
      conversationId: 'conv-1',
      messageIds: ['m1', 'm2'],
    });
    expect(result).toEqual({
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1', 'm2'],
    });
  });
});
```

- [ ] **Step 2: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/chat/lib/message-analysis.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết helper**

```ts
// src/features/chat/lib/message-analysis.ts
import type { CreateSourceRefInput } from '@/features/tasks/types';
import type { MessageAnalysis } from '@/features/chat/types';

export function buildSourceRefFromAnalysis(
  source: MessageAnalysis['source'],
): CreateSourceRefInput {
  return {
    type: 'CHAT_MESSAGE',
    conversationId: source.conversationId,
    messageIds: source.messageIds,
  };
}
```

- [ ] **Step 4: Run test, xác nhận PASS**

Run: `npx vitest run src/features/chat/lib/message-analysis.test.ts`
Expected: PASS.

- [ ] **Step 5: Viết test cho mutation hooks**

```ts
// src/features/chat/hooks/useConfirmSuggestion.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useConfirmCreateCommitment,
  useConfirmCreateChangeRequest,
  useConfirmCreateTask,
  useConfirmLinkExistingCommitment,
} from './useConfirmSuggestion';
import { commitmentsApi, changeRequestsApi } from '@/features/tasks/services/commitments.api';
import { tasksApi } from '@/features/tasks/services/tasks.api';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: {
    create: vi.fn(),
    linkSourceRef: vi.fn(),
    linkTask: vi.fn(),
  },
  changeRequestsApi: { create: vi.fn() },
}));
vi.mock('@/features/tasks/services/tasks.api', () => ({
  tasksApi: { createTask: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('useConfirmCreateCommitment', () => {
  it('gọi commitmentsApi.create với đúng input', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({
      id: 'c1',
      title: 'X',
      deliveryStatus: 'PLANNED',
    });
    const { result } = renderHook(() => useConfirmCreateCommitment('proj-1'), { wrapper });

    result.current.mutate({
      title: 'X',
      scopeStatus: 'UNCLEAR',
      idempotencyKey: 'k1',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      'k1',
    );
  });
});

describe('useConfirmCreateTask', () => {
  it('tạo task rồi gắn vào commitment khi có commitmentId', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 't1' } as never);
    vi.mocked(commitmentsApi.linkTask).mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmCreateTask('proj-1'), { wrapper });

    result.current.mutate({
      title: 'Task X',
      columnId: 'col-1',
      commitmentId: 'c1',
      idempotencyKey: 'k2',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.createTask).toHaveBeenCalledWith(
      'proj-1',
      { title: 'Task X', columnId: 'col-1' },
      'k2',
    );
    expect(commitmentsApi.linkTask).toHaveBeenCalledWith('c1', 't1');
  });

  it('không gọi linkTask khi không có commitmentId', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 't1' } as never);
    const { result } = renderHook(() => useConfirmCreateTask('proj-1'), { wrapper });

    result.current.mutate({ title: 'Task X', columnId: 'col-1', idempotencyKey: 'k3' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.linkTask).not.toHaveBeenCalled();
  });
});

describe('useConfirmLinkExistingCommitment', () => {
  it('gọi commitmentsApi.linkSourceRef với đúng tham số', async () => {
    vi.mocked(commitmentsApi.linkSourceRef).mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmLinkExistingCommitment(), { wrapper });

    result.current.mutate({
      commitmentId: 'c1',
      sourceRef: { type: 'CHAT_MESSAGE', conversationId: 'conv-1', messageIds: ['m1'] },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.linkSourceRef).toHaveBeenCalledWith('c1', {
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1'],
    });
  });
});
```

> Kiểm tra file test hook hiện có (vd `useDeleteProject.test.ts` nếu tồn tại) để copy đúng cách
> mock `@tanstack/react-query` + `renderHook` wrapper đã dùng trong repo — nếu khác với trên (vd
> repo có sẵn 1 `renderHookWithQueryClient` helper dùng chung), dùng helper đó thay vì tự viết
> `wrapper` mới, tránh trùng lặp.

- [ ] **Step 6: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/chat/hooks/useConfirmSuggestion.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 7: Viết hooks**

```ts
// src/features/chat/hooks/useConfirmSuggestion.ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commitmentsApi, changeRequestsApi } from '@/features/tasks/services/commitments.api';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import type { CreateSourceRefInput } from '@/features/tasks/types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useConfirmCreateCommitment(projectId: string) {
  return useMutation({
    mutationFn: (input: {
      title: string;
      description?: string;
      ownerId?: string;
      promisedAt?: string;
      dueAt?: string;
      scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
      sourceRefs?: CreateSourceRefInput[];
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return commitmentsApi.create(projectId, body, idempotencyKey);
    },
    onSuccess: () => toast.success('Đã tạo cam kết'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo cam kết')),
  });
}

export function useConfirmCreateChangeRequest(projectId: string) {
  return useMutation({
    mutationFn: (input: {
      title: string;
      impact: string;
      estimateHours?: number;
      cost?: number;
      timelineShiftDays?: number;
      commitmentId?: string;
      sourceRefs?: CreateSourceRefInput[];
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return changeRequestsApi.create(projectId, body, idempotencyKey);
    },
    onSuccess: () => toast.success('Đã tạo yêu cầu thay đổi'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo yêu cầu thay đổi')),
  });
}

export function useConfirmCreateTask(projectId: string) {
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      columnId: string;
      commitmentId?: string;
      idempotencyKey: string;
    }) => {
      const task = await tasksApi.createTask(
        projectId,
        { title: input.title, columnId: input.columnId },
        input.idempotencyKey,
      );
      if (input.commitmentId) {
        try {
          await commitmentsApi.linkTask(input.commitmentId, task.id);
        } catch {
          // Task đã tạo thành công — không rollback. PM có thể gắn lại thủ công sau
          // (chưa có trang quản trị Commitment Graph để tự thao tác lại, xem spec §5).
          toast.warning('Task đã tạo nhưng chưa gắn được vào cam kết, thử gắn lại sau');
        }
      }
      return task;
    },
    onSuccess: () => toast.success('Đã tạo task'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể tạo task')),
  });
}

export function useConfirmLinkExistingCommitment() {
  return useMutation({
    mutationFn: (input: { commitmentId: string; sourceRef: CreateSourceRefInput }) =>
      commitmentsApi.linkSourceRef(input.commitmentId, input.sourceRef),
    onSuccess: () => toast.success('Đã gắn nguồn vào cam kết'),
    onError: (error) => toast.error(errorMessage(error, 'Không thể gắn nguồn vào cam kết')),
  });
}
```

- [ ] **Step 8: Run test, xác nhận PASS**

Run: `npx vitest run src/features/chat/hooks/useConfirmSuggestion.test.ts`
Expected: PASS, 4/4 test.

- [ ] **Step 9: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/chat/lib/message-analysis.ts src/features/chat/hooks/useConfirmSuggestion.ts`
Expected: không lỗi.

- [ ] **Step 10: Commit**

```bash
git add src/features/chat/lib/message-analysis.ts src/features/chat/lib/message-analysis.test.ts src/features/chat/hooks/useConfirmSuggestion.ts src/features/chat/hooks/useConfirmSuggestion.test.ts
git commit -m "feat(chat): hooks xác nhận đề xuất AI thành Commitment/CR/Task"
```

---

## Task 3: 4 form xác nhận + wiring vào `MessageAnalysisPreview`

**Files:**
- Create: `src/features/chat/components/messages/analysis/ConfirmCreateCommitmentForm.tsx`
- Create: `src/features/chat/components/messages/analysis/ConfirmCreateChangeRequestForm.tsx`
- Create: `src/features/chat/components/messages/analysis/ConfirmCreateTaskForm.tsx`
- Create: `src/features/chat/components/messages/analysis/ConfirmLinkExistingCommitmentForm.tsx`
- Test: 1 file test / form (4 file, cùng thư mục `analysis/`, hậu tố `.test.tsx`)
- Modify: `src/features/chat/components/messages/MessageAnalysisPreview.tsx`
- Modify: `src/features/chat/components/messages/MessageAnalysisDialog.tsx` (truyền `projectId`
  xuống `MessageAnalysisPreview`)

**Interfaces:**
- Consumes: 4 hook từ Task 2; `commitmentsApi.list` (Task 1) cho picker; `tasksApi.getBoard` (có
  sẵn) cho picker column; `useMembers` (có sẵn, `src/features/tasks/hooks/useMembers.ts`) cho picker
  owner; `buildSourceRefFromAnalysis` (Task 2).

- [ ] **Step 1: `ConfirmCreateCommitmentForm.tsx`**

```tsx
// src/features/chat/components/messages/analysis/ConfirmCreateCommitmentForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useMembers } from '@/features/tasks/hooks/useMembers';
import { useConfirmCreateCommitment } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  scopeStatus: MessageAnalysis['scopeStatus'];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmCreateCommitmentForm({
  projectId,
  action,
  scopeStatus,
  source,
  onDone,
}: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description);
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const members = useMembers(projectId);
  const confirm = useConfirmCreateCommitment(projectId);

  const memberOptions = (members.data ?? []).map((m) => ({
    value: m.userId,
    label: m.displayName,
  }));

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        description,
        scopeStatus,
        ...(ownerId ? { ownerId } : {}),
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
        sourceRefs: [buildSourceRefFromAnalysis(source)],
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input label="Tiêu đề cam kết" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
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
      <Button onClick={handleSubmit} disabled={!title.trim()} isLoading={confirm.isPending}>
        Xác nhận tạo cam kết
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: `ConfirmCreateChangeRequestForm.tsx`**

```tsx
// src/features/chat/components/messages/analysis/ConfirmCreateChangeRequestForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useConfirmCreateChangeRequest } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmCreateChangeRequestForm({ projectId, action, source, onDone }: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [impact, setImpact] = useState(action.description);
  const [estimateHours, setEstimateHours] = useState('');
  const [cost, setCost] = useState('');
  const confirm = useConfirmCreateChangeRequest(projectId);

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        impact,
        ...(action.targetCommitmentId ? { commitmentId: action.targetCommitmentId } : {}),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        sourceRefs: [buildSourceRefFromAnalysis(source)],
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input label="Tiêu đề yêu cầu thay đổi" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
          label="Chi phí ước tính (VND, không bắt buộc)"
          type="number"
          min={0}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || !impact.trim()}
        isLoading={confirm.isPending}
      >
        Xác nhận tạo yêu cầu thay đổi
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: `ConfirmCreateTaskForm.tsx`**

```tsx
// src/features/chat/components/messages/analysis/ConfirmCreateTaskForm.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import { useConfirmCreateTask } from '@/features/chat/hooks/useConfirmSuggestion';
import type { MessageAnalysis } from '@/features/chat/types';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  onDone: () => void;
};

export function ConfirmCreateTaskForm({ projectId, action, onDone }: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description);
  const [columnId, setColumnId] = useState('');
  const board = useQuery({
    queryKey: ['tasks', projectId, 'board'],
    queryFn: () => tasksApi.getBoard(projectId),
  });
  const confirm = useConfirmCreateTask(projectId);

  const columnOptions = (board.data?.columns ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        description,
        columnId,
        ...(action.targetCommitmentId ? { commitmentId: action.targetCommitmentId } : {}),
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input label="Tiêu đề task" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
      <ComboBox
        label="Cột trên board"
        value={columnId}
        options={columnOptions}
        onValueChange={(v) => setColumnId(Array.isArray(v) ? (v[0] ?? '') : v)}
        placeholder={board.isPending ? 'Đang tải...' : 'Chọn cột'}
        emptyText="Chưa có cột nào trên board."
      />
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || !columnId}
        isLoading={confirm.isPending}
      >
        Xác nhận tạo task
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: `ConfirmLinkExistingCommitmentForm.tsx`**

```tsx
// src/features/chat/components/messages/analysis/ConfirmLinkExistingCommitmentForm.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';
import { useConfirmLinkExistingCommitment } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmLinkExistingCommitmentForm({ projectId, action, source, onDone }: Props) {
  const [commitmentId, setCommitmentId] = useState(action.targetCommitmentId ?? '');
  const list = useQuery({
    queryKey: ['tasks', projectId, 'commitments', 'list'],
    queryFn: () => commitmentsApi.list(projectId),
  });
  const confirm = useConfirmLinkExistingCommitment();

  const options = (list.data?.data ?? []).map((c) => ({ value: c.id, label: c.title }));

  function handleSubmit() {
    confirm.mutate(
      { commitmentId, sourceRef: buildSourceRefFromAnalysis(source) },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <ComboBox
        label="Chọn cam kết có sẵn"
        value={commitmentId}
        options={options}
        onValueChange={(v) => setCommitmentId(Array.isArray(v) ? (v[0] ?? '') : v)}
        placeholder={list.isPending ? 'Đang tải...' : 'Tìm cam kết'}
        emptyText="Không có cam kết nào trong project."
      />
      <Button onClick={handleSubmit} disabled={!commitmentId} isLoading={confirm.isPending}>
        Xác nhận gắn vào cam kết
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Wiring — sửa `MessageAnalysisPreview.tsx`**

Thay khối `<ul>` liệt `suggestedActions` hiện tại (đọc-only) bằng bản có state chọn action + render
form tương ứng. Giữ nguyên phần trên (badge classification/scope/confidence, tóm tắt, nhận định,
clarifyingQuestion) không đổi.

```tsx
// src/features/chat/components/messages/MessageAnalysisPreview.tsx
'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { MessageAnalysis } from '@/features/chat/types';
import { ConfirmCreateCommitmentForm } from './analysis/ConfirmCreateCommitmentForm';
import { ConfirmCreateChangeRequestForm } from './analysis/ConfirmCreateChangeRequestForm';
import { ConfirmCreateTaskForm } from './analysis/ConfirmCreateTaskForm';
import { ConfirmLinkExistingCommitmentForm } from './analysis/ConfirmLinkExistingCommitmentForm';

// ...giữ nguyên classificationLabels, scopeLabels...

const SUPPORTED_ACTION_TYPES = new Set([
  'CREATE_COMMITMENT',
  'CREATE_CHANGE_REQUEST',
  'CREATE_TASK',
  'LINK_EXISTING_COMMITMENT',
]);

export function MessageAnalysisPreview({
  analysis,
  projectId,
}: {
  analysis: MessageAnalysis;
  projectId: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [doneIndexes, setDoneIndexes] = useState<Set<number>>(new Set());

  return (
    <section aria-label="Kết quả phân tích" className="space-y-4 rounded-xl bg-muted/50 p-4">
      {/* ...giữ nguyên phần badge/summary/reasoning/clarifyingQuestion... */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Đề xuất tiếp theo</h3>
        {analysis.suggestedActions.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Chưa có hành động phù hợp.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {analysis.suggestedActions.map((action, index) => {
              const supported = SUPPORTED_ACTION_TYPES.has(action.type);
              const done = doneIndexes.has(index);
              return (
                <li key={`${action.type}-${index}`} className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <span className="flex-1">
                      <strong className="font-semibold text-foreground">{action.title}</strong>
                      <span className="text-muted-foreground"> — {action.description}</span>
                    </span>
                    {done ? (
                      <span className="shrink-0 text-xs font-medium text-success">Đã tạo</span>
                    ) : supported ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-primary underline"
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                      >
                        {openIndex === index ? 'Đóng' : 'Chọn phương án này'}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Sắp có
                      </span>
                    )}
                  </div>
                  {openIndex === index && (
                    <ActionForm
                      action={action}
                      analysis={analysis}
                      projectId={projectId}
                      onDone={() => {
                        setDoneIndexes((prev) => new Set(prev).add(index));
                        setOpenIndex(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActionForm({
  action,
  analysis,
  projectId,
  onDone,
}: {
  action: MessageAnalysis['suggestedActions'][number];
  analysis: MessageAnalysis;
  projectId: string;
  onDone: () => void;
}) {
  switch (action.type) {
    case 'CREATE_COMMITMENT':
      return (
        <ConfirmCreateCommitmentForm
          projectId={projectId}
          action={action}
          scopeStatus={analysis.scopeStatus}
          source={analysis.source}
          onDone={onDone}
        />
      );
    case 'CREATE_CHANGE_REQUEST':
      return (
        <ConfirmCreateChangeRequestForm
          projectId={projectId}
          action={action}
          source={analysis.source}
          onDone={onDone}
        />
      );
    case 'CREATE_TASK':
      return <ConfirmCreateTaskForm projectId={projectId} action={action} onDone={onDone} />;
    case 'LINK_EXISTING_COMMITMENT':
      return (
        <ConfirmLinkExistingCommitmentForm
          projectId={projectId}
          action={action}
          source={analysis.source}
          onDone={onDone}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 6: Truyền `projectId` từ `MessageAnalysisDialog.tsx`**

Trong `src/features/chat/components/messages/MessageAnalysisDialog.tsx`, sửa dòng render
`MessageAnalysisPreview`:

```tsx
{analysis.data && (
  <MessageAnalysisPreview analysis={analysis.data} projectId={resolvedProjectId} />
)}
```

- [ ] **Step 7: Viết test cho từng form (happy path + validation)**

Ví dụ `ConfirmCreateCommitmentForm.test.tsx` (3 form còn lại theo đúng pattern này — validation
khác nhau theo field bắt buộc của từng form: `ConfirmCreateChangeRequestForm` bắt buộc
title+impact; `ConfirmCreateTaskForm` bắt buộc title+columnId; `ConfirmLinkExistingCommitmentForm`
bắt buộc chọn 1 commitment):

```tsx
// src/features/chat/components/messages/analysis/ConfirmCreateCommitmentForm.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmCreateCommitmentForm } from './ConfirmCreateCommitmentForm';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';
import { useMembers } from '@/features/tasks/hooks/useMembers';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: { create: vi.fn() },
}));
vi.mock('@/features/tasks/hooks/useMembers', () => ({ useMembers: vi.fn() }));

const ACTION = {
  type: 'CREATE_COMMITMENT' as const,
  title: 'Cam kết X',
  description: 'Mô tả X',
  targetCommitmentId: null,
};
const SOURCE = { conversationId: 'conv-1', messageIds: ['m1'] };

function renderForm(onDone = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConfirmCreateCommitmentForm
        projectId="proj-1"
        action={ACTION}
        scopeStatus="UNCLEAR"
        source={SOURCE}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMembers).mockReturnValue({ data: [] } as never);
});

describe('ConfirmCreateCommitmentForm', () => {
  it('prefill title/description từ action', () => {
    renderForm();
    expect(screen.getByDisplayValue('Cam kết X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mô tả X')).toBeInTheDocument();
  });

  it('gọi commitmentsApi.create kèm sourceRefs khi bấm xác nhận', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({
      id: 'c1',
      title: 'Cam kết X',
      deliveryStatus: 'PLANNED',
    });
    const onDone = vi.fn();
    renderForm(onDone);

    fireEvent.click(screen.getByRole('button', { name: /xác nhận tạo cam kết/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        title: 'Cam kết X',
        scopeStatus: 'UNCLEAR',
        sourceRefs: [
          { type: 'CHAT_MESSAGE', conversationId: 'conv-1', messageIds: ['m1'] },
        ],
      }),
      expect.any(String),
    );
  });

  it('disable nút xác nhận khi title rỗng', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/tiêu đề cam kết/i), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /xác nhận tạo cam kết/i })).toBeDisabled();
  });
});
```

- [ ] **Step 8: Viết 3 test còn lại theo pattern Step 7** (mock đúng hook/API mỗi form dùng —
  `ConfirmCreateChangeRequestForm` mock `changeRequestsApi.create`; `ConfirmCreateTaskForm` mock
  `tasksApi.createTask`+`tasksApi.getBoard`; `ConfirmLinkExistingCommitmentForm` mock
  `commitmentsApi.list`+`commitmentsApi.linkSourceRef`). Assert riêng cho từng form:
  - `ConfirmCreateChangeRequestForm`: disable khi thiếu `impact`; gửi đúng `commitmentId` khi
    `action.targetCommitmentId` có giá trị.
  - `ConfirmCreateTaskForm`: disable khi chưa chọn `columnId`; gọi `commitmentsApi.linkTask` sau
    khi tạo task nếu `action.targetCommitmentId` có giá trị (mock cả `tasksApi.createTask` và
    `commitmentsApi.linkTask` — import thêm `commitmentsApi` vào mock).
  - `ConfirmLinkExistingCommitmentForm`: prefill `commitmentId` từ `action.targetCommitmentId` khi
    có; disable nút khi chưa chọn commitment nào.

- [ ] **Step 9: Run toàn bộ test mới + test cũ của `MessageAnalysisPreview`/`MessageAnalysisDialog`**

Run: `npx vitest run src/features/chat/components/messages`
Expected: PASS toàn bộ — bao gồm test cũ của `MessageAnalysisPreview.test.tsx` (nếu assert cấu trúc
DOM cũ, có thể cần cập nhật cho khớp thay đổi ở Step 5 — sửa tại chỗ, không xoá test).

- [ ] **Step 10: Build + lint + full suite**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/chat/components/messages`
Run: `npx vitest run`
Expected: build sạch, lint sạch, toàn bộ test suite (bao gồm test cũ không liên quan) vẫn PASS.

- [ ] **Step 11: Commit**

```bash
git add src/features/chat/components/messages/analysis src/features/chat/components/messages/MessageAnalysisPreview.tsx src/features/chat/components/messages/MessageAnalysisDialog.tsx
git commit -m "feat(chat): form xác nhận đề xuất AI thành Commitment/CR/Task/liên kết"
```
