# Xác nhận & thực thi đề xuất AI — thiết kế (vibe-chat-fe side)

> Phần frontend của milestone "Xác nhận & thực thi đề xuất". Bước tiếp theo sau feature "Phân tích
> và xử lý" (`MessageAnalysisDialog`/`MessageAnalysisPreview` — hiện chỉ hiển thị đề xuất, read-only).
> Milestone này biến đề xuất thành hành động ghi thật: PM chọn 1 `suggestedAction`, chỉnh sửa, xác
> nhận → gọi task-service tạo Commitment/Change Request/Task hoặc gắn nguồn vào Commitment có sẵn.
> Spec song song bên task-service (hạ tầng Idempotency-Key + xác nhận route nào tái dùng):
> `task-service/docs/superpowers/specs/2026-09-21-commitment-confirm-execute-design.md`.

## 1. Phạm vi

Xử lý 4/6 `AnalysisActionType`: `CREATE_COMMITMENT`, `CREATE_CHANGE_REQUEST`, `CREATE_TASK`,
`LINK_EXISTING_COMMITMENT`. **Không xử lý** `CREATE_DECISION` (chưa có entity backend — ẩn nút xác
nhận, hiện badge "Sắp có") và `ASK_CLARIFICATION` (đã hiển thị read-only, không có hành động ghi).

**Ngoài phạm vi milestone này:**

- Trang danh sách/chi tiết Commitment, Change Request (giao diện quản trị Commitment Graph — backlog
  kế tiếp). Sau khi tạo thành công, chỉ hiện toast + không có deep-link (chưa có trang đích).
- Editor đầy đủ mọi field nghiệp vụ (vd `acceptedOnBehalfOf`, `cancelReason`) — chỉ các field cần
  để tạo mới hợp lệ.

## 2. `taskClient` — thêm hỗ trợ custom header

`src/features/tasks/lib/task-client.ts` hiện không cho truyền header tuỳ ý. Cần `Idempotency-Key`
cho 3 API tạo mới (§4). Sửa tối thiểu, giữ nguyên chữ ký cũ (không breaking mọi call site hiện có):

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
  // ...giữ nguyên phần parse response...
}

export const taskClient = {
  get: <T>(path: string) => request<T>('GET', path),
  getPaged: <T, M>(path: string) => requestPaged<T, M>('GET', path),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
    request<T>('POST', path, body, extraHeaders),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
```

- 409 (`IDEMPOTENCY_KEY_IN_PROGRESS`) đi qua đúng nhánh lỗi hiện có của `request()` (`!res.ok` →
  throw `Error(json.error.message)`) — không cần xử lý đặc biệt, UI hiển thị lỗi chung "đang xử lý,
  thử lại sau" (map theo `error.code`).

## 3. Idempotency key ở component

Sinh 1 `crypto.randomUUID()` **khi mở form xác nhận cho 1 action cụ thể** (không phải khi mở cả
dialog phân tích), lưu trong state của component form. Giữ nguyên key nếu PM sửa field rồi bấm
"Xác nhận" lại (cùng 1 lần thử) — **chỉ sinh key mới khi PM đóng form rồi mở lại** (tránh vô hiệu hoá
bảo vệ double-submit).

```ts
const [idempotencyKey] = useState(() => crypto.randomUUID());
```

(state khởi tạo 1 lần khi component mount — tự nhiên đáp ứng "giữ nguyên trong 1 lần mở form").

## 4. API client mới — `src/features/tasks/services/commitments.api.ts`

Types tối thiểu cần cho luồng confirm (không phải full response shape của task-service — chỉ field
FE thực sự dùng để hiện toast/kiểm tra thành công):

```ts
// src/features/tasks/types/commitment.ts
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

```ts
// src/features/tasks/services/commitments.api.ts
import { taskClient } from '../lib/task-client';
import type { CommitmentSummary, ChangeRequestSummary, CreateSourceRefInput } from '../types/commitment';

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

  // Picker cho LINK_EXISTING_COMMITMENT — tái dùng cho UI quản trị sau này.
  // Đã kiểm tra `QueryCommitmentsDto` (task-service): KHÔNG có param tìm theo tên (`q`), chỉ có
  // filter theo enum/ownerId + phân trang. Lấy 1 trang tối đa (limit=100, giới hạn cứng của
  // `PaginationQueryDto`) rồi filter theo title ở client — đủ dùng khi project < 100 commitment;
  // KHÔNG tự thêm query param `q` vào request (backend sẽ bỏ qua field lạ do `whitelist: true`).
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

`tasksApi.createTask` (đã có sẵn ở `tasks.api.ts`) cần thêm tham số `idempotencyKey` tương tự (sửa
signature, truyền `{ 'Idempotency-Key': idempotencyKey }` vào `taskClient.post` thứ 3).

## 5. UI — `MessageAnalysisActionConfirm` (component mới)

Thay vì list `suggestedActions` chỉ để đọc như hiện tại, mỗi action có nút "Chọn phương án này" →
mở 1 form phù hợp `action.type` (component mới, 1 file/action-type để giữ nhỏ gọn theo nguyên tắc
"mỗi file 1 trách nhiệm"):

- `ConfirmCreateCommitmentForm.tsx` — field: title (prefill `action.title`), description (prefill
  `action.description`), scopeStatus (prefill `analysis.scopeStatus`), ownerId (optional, picker
  thành viên project — tái dùng component picker đã có ở tasks feature nếu có), promisedAt/dueAt
  (optional date input).
- `ConfirmCreateChangeRequestForm.tsx` — field: title, impact (prefill description), estimateHours,
  cost, timelineShiftDays, commitmentId (prefill `action.targetCommitmentId` nếu có, optional picker
  đổi lại).
- `ConfirmCreateTaskForm.tsx` — field: title, description, **columnId bắt buộc** (dropdown load từ
  `tasksApi.getBoard(projectId)`, không có giá trị mặc định hợp lý vì AI không biết cấu trúc board —
  PM phải tự chọn, submit disabled tới khi chọn). Sau khi tạo task, nếu action gốc có
  `targetCommitmentId` → gọi `commitmentsApi.linkTask` tiếp (không rollback nếu bước 2 lỗi — hiện
  toast cảnh báo "Task đã tạo nhưng chưa gắn được vào cam kết, thử gắn lại sau", vì FE hiện chưa có
  trang để gắn lại — chấp nhận được cho v1, ghi rõ trong code comment).
- `ConfirmLinkExistingCommitmentForm.tsx` — combobox tìm/chọn commitment (load 1 lần qua
  `commitmentsApi.list`, filter theo title ở client khi PM gõ tìm; prefill/pre-select nếu
  `action.targetCommitmentId` có giá trị) → xác nhận gọi `commitmentsApi.linkSourceRef`.

Mọi form dùng chung `sourceRefs` build từ `analysis.source` (`{ type: 'CHAT_MESSAGE', conversationId:
analysis.source.conversationId, messageIds: analysis.source.messageIds }`) — 1 helper
`buildSourceRefFromAnalysis(source: AnalysisSourceDto): CreateSourceRefInput` trong
`src/features/chat/lib/message-analysis.ts` (file mới, nhỏ, thuần hàm — dễ test).

### Trạng thái sau xác nhận

- Đang gửi: disable form, hiện spinner trên nút xác nhận (không disable toàn dialog — PM vẫn xem
  được các action khác trong lúc chờ, dù chỉ nên chờ 1 action tại 1 thời điểm theo thiết kế UI:
  chỉ 1 form được mở/xác nhận tại 1 thời điểm, chọn action khác trong lúc đang gửi bị chặn).
- Thành công: đóng form, đổi action đó sang trạng thái "Đã tạo" (icon check + tên entity, không có
  link — xem §1 ngoài phạm vi), toast tiếng Việt xác nhận.
- Lỗi 409 `IDEMPOTENCY_KEY_IN_PROGRESS`: hiện toast "Đang xử lý yêu cầu trước đó, vui lòng đợi vài
  giây rồi thử lại" — KHÔNG tự động retry.
- Lỗi khác (400/403/404/422/503 từ task-service): hiện `error.message` (task-service đã trả tiếng
  Việt thân thiện theo `rules/05-error-handling.md` của repo đó — FE không cần dịch lại).

## 6. Test

- `commitments.api.ts`/`changeRequestsApi`: mock `fetch`, assert đúng path/method/body/header
  `Idempotency-Key` cho 3 API tạo mới; assert `linkSourceRef`/`linkTask`/`list` KHÔNG gửi header
  đó (đúng thiết kế §1 task-service — chỉ 3 route tạo mới cần).
- `buildSourceRefFromAnalysis`: input/output thuần, test map đúng field.
- Mỗi `Confirm*Form`: happy path (điền đủ field hợp lệ → gọi đúng API với đúng payload), validation
  (submit disabled khi thiếu field bắt buộc — vd `ConfirmCreateTaskForm` thiếu `columnId`), lỗi từ
  API hiển thị đúng thông báo.
- `idempotencyKey` giữ nguyên qua nhiều lần bấm "Xác nhận" trong cùng 1 lần mở form (test bằng cách
  mock API lỗi lần 1, retry lần 2, assert cùng 1 giá trị header).

## 7. Không đổi / ngoài phạm vi

- Không xây trang danh sách/chi tiết Commitment/Change Request.
- Không xử lý `CREATE_DECISION` (ẩn nút, badge "Sắp có").
- Không hỗ trợ chọn nhiều message cho 1 lần phân tích (gap đã biết từ trước, không thuộc milestone
  này — theo dõi riêng).
- Không rollback Task đã tạo nếu bước link-vào-commitment thất bại (xem §5, chấp nhận rủi ro nhỏ ở
  v1).
