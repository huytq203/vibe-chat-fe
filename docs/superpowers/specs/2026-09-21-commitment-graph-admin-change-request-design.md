# Giao diện quản trị Commitment Graph — Yêu cầu thay đổi (sub-project 3/3)

> Sub-project cuối của "Giao diện quản trị Commitment Graph". Thay `SettingsPlaceholder` ở tab
> "Yêu cầu thay đổi" (`CommitmentGraphView`) bằng danh sách + tạo mới + chi tiết (xem, sửa, chuyển
> trạng thái theo luồng duyệt, gắn/gỡ nguồn tham chiếu). Domain nhỏ hơn Commitment — không có
> evidence/task liên kết, response list và detail dùng CHUNG 1 shape (`ChangeRequestResponseDto`,
> đã gồm sẵn `sourceRefs`) nên không cần tách `Summary`/`Detail` phức tạp như Commitment.

## 1. Luồng duyệt — đã đọc code thật (`change-requests.service.ts`)

```text
DRAFT → INTERNAL_APPROVED → SENT → CLIENT_APPROVED
                    ↓          ↓
                REJECTED ← ----┘
```

(`TRANSITIONS` map: `DRAFT→[INTERNAL_APPROVED]`, `INTERNAL_APPROVED→[SENT, CLIENT_APPROVED,
REJECTED]`, `SENT→[CLIENT_APPROVED, REJECTED]`, `CLIENT_APPROVED`/`REJECTED` terminal — mảng rỗng.)

Điều kiện theo đích:
- `CLIENT_APPROVED`: bắt buộc `onBehalfOf` (tên người phía khách phê duyệt); có thể kèm optional
  `sourceRef` (nguồn tham chiếu bổ sung khi khách duyệt — vd đường link email/tin nhắn xác nhận).
- `REJECTED`: bắt buộc `reason`.
- Cùng nguyên tắc đã áp dụng cho Commitment: FE KHÔNG replicate ma trận hợp lệ, chỉ ẩn nút "Chuyển
  trạng thái" khi status đã `CLIENT_APPROVED`/`REJECTED` (terminal, mảng rỗng — chắc chắn không có
  bước nào hợp lệ), dropdown liệt 4 trạng thái còn lại, field bắt buộc hiện theo `to` đã chọn,
  backend tự trả lỗi cho bước không hợp lệ.

## 2. Type — thêm/mở rộng `types.ts`

`ChangeRequestSummary` hiện có (`{id, title, status}`) quá hẹp — response thật
(`ChangeRequestResponseDto`) giàu hơn nhiều VÀ dùng chung cho cả list lẫn detail. Mở rộng (giữ tên,
thêm field — backward-compatible với `useConfirmCreateChangeRequest` đang dùng):

```ts
export type ChangeRequestStatusValue =
  | 'DRAFT'
  | 'INTERNAL_APPROVED'
  | 'SENT'
  | 'CLIENT_APPROVED'
  | 'REJECTED';

export interface ChangeRequestSummary {
  id: string;
  projectId: string;
  commitmentId: string | null;
  title: string;
  impact: string;
  estimateHours: number | null;
  cost: string | null;
  currency: string;
  timelineShiftDays: number | null;
  status: ChangeRequestStatusValue;
  internalApprovedByUserId: string | null;
  internalApprovedAt: string | null;
  sentAt: string | null;
  clientApprovedByUserId: string | null;
  clientApprovedOnBehalfOf: string | null;
  clientApprovedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  sourceRefs: SourceRef[];
}
```

(`cost` kiểu `string | null` — Prisma `Decimal` serialize thành string qua JSON, không phải
`number`, tránh mất độ chính xác thập phân. `SourceRef` type đã có từ sub-project Commitment, tái
dùng nguyên.)

## 3. API client — mở rộng `commitments.api.ts` (object `changeRequestsApi` đã có, chỉ có `create`)

```ts
listPaged: (
  projectId: string,
  params: { page?: number; limit?: number; status?: ChangeRequestStatusValue; commitmentId?: string },
) => {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 20));
  if (params.status) sp.set('status', params.status);
  if (params.commitmentId) sp.set('commitmentId', params.commitmentId);
  return taskClient.getPaged<ChangeRequestSummary[], PaginationMeta>(
    `/api/v1/projects/${projectId}/change-requests?${sp.toString()}`,
  );
},

getDetail: (changeRequestId: string) =>
  taskClient.get<ChangeRequestSummary>(`/api/v1/change-requests/${changeRequestId}`),

update: (
  changeRequestId: string,
  input: {
    title?: string;
    impact?: string;
    estimateHours?: number;
    cost?: number;
    timelineShiftDays?: number;
    commitmentId?: string;
    version: number;
  },
) => taskClient.patch<ChangeRequestSummary>(`/api/v1/change-requests/${changeRequestId}`, input),

transition: (
  changeRequestId: string,
  input: {
    to: ChangeRequestStatusValue;
    onBehalfOf?: string;
    reason?: string;
    sourceRef?: CreateSourceRefInput;
    version: number;
  },
) =>
  taskClient.post<ChangeRequestSummary>(
    `/api/v1/change-requests/${changeRequestId}/transition`,
    input,
  ),

addSourceRef: (changeRequestId: string, input: CreateSourceRefInput) =>
  taskClient.post<void>(`/api/v1/change-requests/${changeRequestId}/source-refs`, input),

removeSourceRef: (changeRequestId: string, refId: string) =>
  taskClient.delete<void>(`/api/v1/change-requests/${changeRequestId}/source-refs/${refId}`),

getSourceRefContent: (changeRequestId: string, refId: string) =>
  taskClient.get<ResolvedMessage[]>(
    `/api/v1/change-requests/${changeRequestId}/source-refs/${refId}/content`,
  ),
```

> `create` giữ nguyên (đã có, dùng `commitmentId` optional — đúng field đã hỗ trợ). KHÔNG thêm
> `addSourceRef` dùng ở UI tạo/sửa thường xuyên — chỉ dùng khi PM muốn gắn thêm nguồn thủ công từ
> modal chi tiết (hiếm, giống lý do đã nêu ở Commitment §7 — chỉ hữu ích khi có nguồn `CHAT_MESSAGE`
> rõ ràng, thường đã gắn sẵn lúc tạo qua luồng AI-confirm).

## 4. Query key + hooks — `keys.ts` + file mới `useChangeRequests.ts`

```ts
// keys.ts — thêm
changeRequests: (projectId: string) => [...taskKeys.all, 'change-requests', projectId] as const,
changeRequestDetail: (id: string) => [...taskKeys.all, 'change-request', id] as const,
```

`src/features/tasks/hooks/useChangeRequests.ts` (file mới, KHÔNG gộp vào `useCommitments.ts` —
domain khác, đúng nguyên tắc 1 file 1 concern đã áp dụng xuyên suốt): `useChangeRequestsInfinite`,
`useChangeRequestDetail`, `useCreateChangeRequest` (bọc `changeRequestsApi.create`, sinh
`crypto.randomUUID()` mỗi lần gọi — cùng pattern `useCreateCommitment`), `useUpdateChangeRequest`,
`useTransitionChangeRequest`, `useRemoveSourceRef` (CR bản riêng, KHÔNG tái dùng hook cùng tên của
Commitment vì tham số đầu khác domain). Mọi mutation `onSuccess` invalidate
`taskKeys.changeRequestDetail`/`taskKeys.changeRequests(projectId)` theo đúng mức ảnh hưởng (giống
bảng quyết định đã áp dụng ở Commitment §3 milestone trước), toast tiếng Việt tương ứng.

## 5. UI

### 5.1 `ChangeRequestsTab.tsx` — thay `SettingsPlaceholder` tab "change-requests"

Cấu trúc GIỐNG HỆT `CommitmentsTab.tsx` (đã có) — filter (ComboBox `status`), danh sách infinite
scroll (`useInfiniteScroll` tái dùng), dialog tạo mới. Badge status màu theo nhóm: `DRAFT` →
`secondary`, `INTERNAL_APPROVED`/`SENT` → `soft-warning`, `CLIENT_APPROVED` → `soft-success`,
`REJECTED` → `soft-danger`.

Form tạo mới: title/impact (bắt buộc)/estimateHours/cost/timelineShiftDays (optional
number input)/commitmentId (ComboBox từ `commitmentsApi.list(projectId)` — API đã có từ milestone
"xác nhận đề xuất AI", trả `{data: CommitmentSummary[]}` qua `getPaged`).

Click row → mở `ChangeRequestDetailModal` (state `selectedChangeRequestId` mới ở `tasks-ui.store.ts`,
cùng pattern `selectedCommitmentId`).

### 5.2 `ChangeRequestDetailModal.tsx` — xem + sửa + chuyển trạng thái + source ref

Header: title + badge status. Nút "Sửa" (icon `Pencil`) mở `EditChangeRequestDialog` (form giống
tạo mới, prefill, version từ data mới nhất). Nút "Chuyển trạng thái" (ẩn khi `CLIENT_APPROVED`/
`REJECTED`) mở `TransitionDialog`.

Nội dung: impact (đoạn văn), lưới thông tin (estimateHours, cost + currency, timelineShiftDays,
commitment liên quan — hiện title nếu có qua tra `commitmentsApi.list` hoặc đơn giản hiện
`commitmentId` dạng rút gọn nếu tra cứu thêm không đáng — QUYẾT ĐỊNH: hiện `commitmentId` thô nếu
có, không tra cứu tên (tránh thêm 1 query chỉ để hiển thị phụ, YAGNI cho v1), người duyệt nội bộ/
thời điểm, thời điểm gửi khách, người khách duyệt (tên `clientApprovedOnBehalfOf`)/thời điểm, lý do
từ chối nếu có.

Section "Nguồn tham chiếu": danh sách + nút "Gỡ" mỗi item + "Xem nội dung" nếu `CHAT_MESSAGE" —
GIỐNG HỆT cách đã làm ở `CommitmentDetailModal` (copy pattern, đổi API endpoint).

`TransitionDialog`: ComboBox "Chuyển đến" (4 trạng thái trừ hiện tại), field điều kiện:
`onBehalfOf` (Input, bắt buộc khi `to === 'CLIENT_APPROVED'`), `reason` (Textarea, bắt buộc khi
`to === 'REJECTED'`). KHÔNG thêm UI cho `sourceRef` optional trong transition (field phụ, hiếm
dùng, PM có thể gắn nguồn riêng qua nút "Gỡ"/tương lai "Thêm" ở section nguồn tham chiếu nếu cần —
giữ dialog transition đơn giản, đúng YAGNI).

## 6. Test

- `commitments.api.ts` (đối tượng `changeRequestsApi`): thêm case cho 6 method mới vào
  `commitments.api.test.ts` đã có.
- `useChangeRequests.ts`: theo mức Task 1 các sub-project trước (2-3 hook có test, còn lại cùng
  pattern).
- `ChangeRequestsTab.tsx`/`ChangeRequestDetailModal.tsx`: theo đúng mức test đã áp dụng cho
  `CommitmentsTab`/`CommitmentDetailModal`.

## 7. Ngoài phạm vi

- Xoá Change Request (`DELETE change-requests/:id`).
- Gắn nguồn tham chiếu mới thủ công từ modal chi tiết (giữ nguyên lý do đã nêu ở Commitment).
- Hiện tên Commitment liên quan (chỉ hiện id thô, xem §5.2).
