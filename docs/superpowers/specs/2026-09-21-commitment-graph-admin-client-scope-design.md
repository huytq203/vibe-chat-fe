# Giao diện quản trị Commitment Graph — Khách hàng & Phạm vi (sub-project 1/3)

> Sub-project đầu tiên của "Giao diện quản trị Commitment Graph" (backlog mục 2, sau milestone xác
> nhận & thực thi đề xuất AI và milestone chọn nhiều tin nhắn). Dựng khung trang chung (shell + tab)
> cho toàn bộ Commitment Graph admin UI, chỉ implement 2 tab đầu (Khách hàng, Phạm vi). 2 tab còn lại
> (Cam kết, Yêu cầu thay đổi) hiện `SettingsPlaceholder` — sub-project 2 và 3 sẽ lấp vào sau.

## 1. Vị trí trong app — không cần route mới

Đã khảo sát `TaskManagementLayout.tsx`: khi `activeView === 'board'` và có `selectedProjectId`, khu
vực chính hiện `BoardHeader` + `KanbanBoard`/`ListView` tuỳ `boardView` (`'board' | 'list'`, state ở
`tasks-ui.store.ts`, switcher UI ở `BoardHeader.tsx`). Đây đúng là điểm neo tự nhiên cho Commitment
Graph — thêm 1 giá trị `boardView` mới, không cần page/route Next.js mới, không cần mục nav top-level
mới (`nav-items.tsx` giữ nguyên).

### 1.1 `tasks-ui.store.ts`

```ts
boardView: 'board' | 'list' | 'commitments';
setBoardView: (v: 'board' | 'list' | 'commitments') => void;
```

(Chữ ký hàm đổi theo, giá trị mặc định `'board'` giữ nguyên — không breaking gì thêm.)

### 1.2 `BoardHeader.tsx` — thêm nút thứ 3 vào segment control

Thêm ngay sau nút "Danh sách" đã có, cùng style (`aria-pressed`, class động theo `boardView ===
'commitments'`), icon `ShieldCheck` (lucide-react, chưa dùng ở đâu trong file này):

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

### 1.3 `TaskManagementLayout.tsx` — render branch mới

Trong khối `activeView === 'board'` (đã có `boardView === 'board' ? <KanbanBoard .../> :
<ListView .../>`), đổi thành 3 nhánh:

```tsx
{boardView === 'board' ? (
  <KanbanBoard key={selectedId} projectId={selectedId} />
) : boardView === 'list' ? (
  <ListView projectId={selectedId} />
) : (
  <CommitmentGraphView projectId={selectedId} />
)}
```

Import `CommitmentGraphView` từ module mới (xem §2). `TaskDetailModal`/`ProjectSettingsModal` giữ
nguyên vị trí render (không phụ thuộc `boardView`).

## 2. Shell — `CommitmentGraphView.tsx`

File mới `src/features/tasks/components/commitments/CommitmentGraphView.tsx` (thư mục mới, cùng
cấp `board/`/`projects/` — 1 domain con đủ lớn để có thư mục riêng, đúng nguyên tắc "file đổi cùng
nhau nằm cùng nhau"). Dùng `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (đã dùng ở
`ProjectSettingsModal.tsx`, cùng import path `@/components/ui/tabs/Tabs`):

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { SettingsPlaceholder } from '../projects/SettingsPlaceholder';
import { ClientTab } from './ClientTab';
import { ScopeTab } from './ScopeTab';

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
            <ClientTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="scope">
            <ScopeTab projectId={projectId} />
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

## 3. API client mới

### 3.1 Types — thêm vào cuối `src/features/tasks/types.ts` (file phẳng có sẵn, đúng convention)

```ts
export interface ProjectContact {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  title: string | null;
  isPrimary: boolean;
  isDeleted: boolean;
}

export interface ProjectClient {
  projectId: string;
  name: string;
  contacts: ProjectContact[];
}

export type ScopeItemStatus = 'APPROVED' | 'PHASE_2' | 'REMOVED';

export interface ScopeItem {
  id: string;
  title: string;
  description: string | null;
  status: ScopeItemStatus;
  position: number;
  originChangeRequestId: string | null;
}

export interface ProjectScope {
  projectId: string;
  rawDocument: string | null;
  version: number;
  items: ScopeItem[];
}
```

### 3.2 `src/features/tasks/services/client.api.ts` (file mới)

```ts
import { taskClient } from '../lib/task-client';
import type { ProjectClient, ProjectContact } from '../types';

export const clientApi = {
  get: (projectId: string) =>
    taskClient.get<ProjectClient | null>(`/api/v1/projects/${projectId}/client`),

  upsert: (projectId: string, name: string) =>
    taskClient.put<ProjectClient>(`/api/v1/projects/${projectId}/client`, { name }),

  addContact: (
    projectId: string,
    input: { name: string; email?: string; title?: string; isPrimary?: boolean; userId?: string },
  ) =>
    taskClient.post<ProjectContact>(
      `/api/v1/projects/${projectId}/client/contacts`,
      input,
    ),

  updateContact: (
    projectId: string,
    contactId: string,
    input: Partial<{ name: string; email: string; title: string; isPrimary: boolean; userId: string }>,
  ) =>
    taskClient.patch<ProjectContact>(
      `/api/v1/projects/${projectId}/client/contacts/${contactId}`,
      input,
    ),

  removeContact: (projectId: string, contactId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/client/contacts/${contactId}`),
};
```

> **Lưu ý implement:** `taskClient` hiện CHƯA có method `put` (chỉ `get/getPaged/post/patch/delete`
> — xem `src/features/tasks/lib/task-client.ts`). Thêm `put: <T>(path: string, body?: unknown) =>
> request<T>('PUT', path, body)` vào object `taskClient` — 1 dòng, cùng pattern `patch` đã có ngay
> cạnh.

### 3.3 `src/features/tasks/services/scope.api.ts` (file mới)

```ts
import { taskClient } from '../lib/task-client';
import type { ProjectScope, ScopeItem, ScopeItemStatus } from '../types';

export const scopeApi = {
  get: (projectId: string) =>
    taskClient.get<ProjectScope>(`/api/v1/projects/${projectId}/scope`),

  updateDocument: (projectId: string, rawDocument: string, version: number) =>
    taskClient.put<ProjectScope>(`/api/v1/projects/${projectId}/scope/document`, {
      rawDocument,
      version,
    }),

  addItem: (
    projectId: string,
    input: { title: string; description?: string; position?: number; version: number },
  ) =>
    taskClient.post<ProjectScope>(`/api/v1/projects/${projectId}/scope/items`, input),

  updateItem: (
    projectId: string,
    itemId: string,
    input: Partial<{
      title: string;
      description: string;
      status: ScopeItemStatus;
      position: number;
    }> & { version: number },
  ) =>
    taskClient.patch<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/items/${itemId}`,
      input,
    ),

  removeItem: (projectId: string, itemId: string, version: number) =>
    taskClient.delete<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/items/${itemId}`,
      { version },
    ),
};
```

> **Lưu ý implement:** `taskClient.delete` hiện KHÔNG nhận body (`delete: <T>(path: string) =>
> request<T>('DELETE', path)`), nhưng route xoá scope item cần body `{ version }` (optimistic lock,
> xem `DeleteScopeItemDto` ở task-service). Sửa `taskClient.delete` thêm tham số `body?: unknown`
> tương tự `post`/`patch`: `delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path,
> body)`. Kiểm tra không có call site nào khác của `taskClient.delete` bị ảnh hưởng (tham số optional,
> không breaking).

### 3.4 Query keys — thêm vào `src/features/tasks/services/keys.ts`

```ts
client: (projectId: string) => [...taskKeys.all, 'client', projectId] as const,
scope: (projectId: string) => [...taskKeys.all, 'scope', projectId] as const,
```

## 4. Hooks

### 4.1 `src/features/tasks/hooks/useClient.ts` (file mới)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientApi } from '../services/client.api';
import { taskKeys } from '../services/keys';

export function useProjectClient(projectId: string) {
  return useQuery({
    queryKey: taskKeys.client(projectId),
    queryFn: () => clientApi.get(projectId),
  });
}

export function useUpsertClient(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => clientApi.upsert(projectId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã lưu thông tin khách hàng');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể lưu thông tin khách hàng'),
  });
}

export function useAddContact(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof clientApi.addContact>[1]) =>
      clientApi.addContact(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã thêm người liên hệ');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể thêm người liên hệ'),
  });
}

export function useUpdateContact(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contactId: string; input: Parameters<typeof clientApi.updateContact>[2] }) =>
      clientApi.updateContact(projectId, vars.contactId, vars.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã cập nhật người liên hệ');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật người liên hệ'),
  });
}

export function useRemoveContact(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => clientApi.removeContact(projectId, contactId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.client(projectId) });
      toast.success('Đã xoá người liên hệ');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể xoá người liên hệ'),
  });
}
```

### 4.2 `src/features/tasks/hooks/useScope.ts` (file mới) — cùng pattern, 5 hook

`useProjectScope(projectId)` (query), `useUpdateScopeDocument(projectId)`, `useAddScopeItem
(projectId)`, `useUpdateScopeItem(projectId)`, `useRemoveScopeItem(projectId)` — mọi mutation
`onSuccess` invalidate `taskKeys.scope(projectId)` + toast tiếng Việt tương ứng, `onError` toast lỗi
chung. Viết đúng 1-1 theo pattern §4.1, không lặp lại toàn bộ code ở đây (implementer copy cấu trúc).

**Xử lý conflict version (409):** không cần logic đặc biệt ở hook — lỗi 409 từ `taskClient` đã ném
`Error` với `message` từ `error.code`/`error.message` server trả về (task-service đã có message tiếng
Việt chuẩn cho `COMMITMENT_VERSION_CONFLICT`-style error), hiển thị qua `toast.error` như lỗi khác.
UI tab (§5.2) tự invalidate + refetch sau lỗi để lấy `version` mới nhất, không cần retry tự động.

## 5. UI 2 tab

### 5.1 `ClientTab.tsx`

- Query `useProjectClient(projectId)`. Nếu `data === null` → hiện form nhập tên khách hàng lần đầu
  (`Input` + `Button "Lưu"`, gọi `useUpsertClient`). Nếu đã có → hiện tên (editable inline, giống
  pattern `ProjectInfoTab` — `key={`${projectId}:${data.name}`}` để remount đúng khi server trả tên
  mới) + danh sách `contacts`.
- Danh sách contact: mỗi item 1 dòng (tên, email, title, badge "Liên hệ chính" nếu `isPrimary`), nút
  sửa (mở dialog) + nút xoá (confirm qua `AlertDialog`, đã dùng ở `ProjectInfoTab.tsx` — copy pattern
  `AlertDialog/AlertDialogContent/...`).
- Nút "+ Thêm người liên hệ" mở `Dialog` (giống `NewProjectModal.tsx`) với form
  name/email/title/isPrimary (`Checkbox` component, `@/components/ui/checkbox/Checkbox` — kiểm tra
  props thật trước khi dùng) → `useAddContact`.
- Dialog sửa contact: form giống trên, prefill từ contact đang sửa → `useUpdateContact`.

### 5.2 `ScopeTab.tsx`

- Query `useProjectScope(projectId)`.
- Khối tài liệu: `Textarea` lớn (nhiều dòng, `rows` cao — SOW/hợp đồng dạng Markdown, không cần
  render Markdown ở milestone này, chỉ plain text editing) + nút "Lưu tài liệu", disabled nếu nội
  dung không đổi so với `data.rawDocument` (so sánh string). Gọi `useUpdateScopeDocument(projectId).
  mutate({ rawDocument, version: data.version })`.
- Danh sách `items`: mỗi item hiện title/description/badge status (map màu:
  `APPROVED` → success, `PHASE_2` → warning/secondary, `REMOVED` → muted + gạch ngang text) + nút sửa
  (dialog title/description/status) + nút xoá (`AlertDialog` confirm, gọi `removeItem` với
  `data.version` hiện tại).
- Nút "+ Thêm hạng mục" mở dialog title/description → `useAddScopeItem(projectId).mutate({ title,
  description, version: data.version })` (không set `position` — để backend tự thêm cuối danh sách,
  đúng mô tả DTO "Bỏ trống để thêm vào cuối danh sách").
- **Quan trọng:** mọi mutation trong tab này (document/item add/update/remove) đều cần `version`
  **hiện tại nhất** từ `data.version` (state React Query, tự động mới nhất sau mỗi lần invalidate) —
  KHÔNG cache version cục bộ trong component riêng, luôn đọc trực tiếp từ `data` để tránh gửi version
  cũ gây 409 giả (lỗi thật chỉ nên xảy ra khi có người khác sửa đồng thời).

## 6. Test

- `client.api.ts`/`scope.api.ts`: mock `fetch`, assert path/method/body đúng cho từng hàm (theo
  pattern `commitments.api.test.ts` đã có ở milestone trước).
- `useClient.ts`/`useScope.ts`: theo pattern `useConfirmSuggestion.test.ts` (mock service, assert
  `mutationFn` gọi đúng tham số, `onSuccess` invalidate đúng key).
- `ClientTab.tsx`/`ScopeTab.tsx`: happy path (hiện đúng data, thêm/sửa/xoá gọi đúng mutation),
  trường hợp `client === null` hiện đúng form tạo mới, validation cơ bản (tên trống không cho lưu).
- `CommitmentGraphView.tsx`: render đủ 4 tab trigger, tab "commitments"/"change-requests" hiện
  `SettingsPlaceholder`.
- `BoardHeader.tsx` (test đã có nếu tồn tại, thêm case mới nếu chưa): bấm nút "Cam kết" gọi
  `setBoardView('commitments')`.

## 7. Ngoài phạm vi (sub-project 2 & 3 xử lý sau)

- Tab "Cam kết" (danh sách + chi tiết Commitment, evidence, risk, transition, link task).
- Tab "Yêu cầu thay đổi" (danh sách + chi tiết + luồng duyệt).
- Lịch sử scope revision (`GET .../scope/revisions`, `GET .../scope/revisions/:version`) — API đã
  có nhưng không cần UI ở sub-project này (xem lại khi làm tab Cam kết, revision thường được xem từ
  context 1 Change Request cụ thể).
- Render Markdown cho tài liệu scope — v1 chỉ plain textarea.
