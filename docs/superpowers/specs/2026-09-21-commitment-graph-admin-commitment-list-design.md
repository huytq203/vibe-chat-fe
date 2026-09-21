# Giao diện quản trị Commitment Graph — Danh sách & chi tiết Cam kết (sub-project 2a/2)

> Phần đầu của sub-project "Commitment" (backlog mục 2, phần 2/3 sau Client & Scope). Dựng danh
> sách Commitment (filter + infinite scroll), dialog tạo mới, và modal xem chi tiết **read-only**
> (chưa có hành động sửa/link task/evidence/transition/source-ref — đó là sub-project 2b, làm sau).

## 1. Vị trí — thay `SettingsPlaceholder` ở tab "commitments"

`CommitmentGraphView.tsx` (đã có, milestone trước) — tab thứ 3 hiện `<SettingsPlaceholder
title="Danh sách cam kết" />`, thay bằng `<CommitmentsTab projectId={projectId} />` mới.

## 2. Mở rộng type — khớp đúng response thật của backend

`CommitmentSummary` hiện có (`types.ts`) quá hẹp (`{id, title, deliveryStatus}`) — response thật của
`GET projects/:id/commitments` (`CommitmentListItemResponseDto`) giàu hơn nhiều. Mở rộng
`CommitmentSummary` (KHÔNG đổi tên — `ConfirmLinkExistingCommitmentForm.tsx` từ milestone trước đã
dùng, thêm field là backward-compatible) + thêm type mới cho chi tiết:

```ts
// Thêm/sửa ở cuối types.ts

export type DeliveryStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'CANCELLED';

export type CommitmentRiskCode =
  | 'NO_TASK'
  | 'NO_OWNER'
  | 'DUE_SOON_INACTIVE'
  | 'OVERDUE'
  | 'DONE_NOT_DELIVERED'
  | 'DELIVERED_NOT_ACCEPTED'
  | 'WAITING_CLIENT';

// SỬA CommitmentSummary hiện có — thêm field, giữ nguyên tên:
export interface CommitmentSummary {
  id: string;
  title: string;
  deliveryStatus: DeliveryStatus;
  scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
  ownerId: string | null;
  dueAt: string | null;
  deliveredAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  contact: ProjectContact | null;
  risks: CommitmentRiskCode[];
  isReadyToDeliver: boolean;
}

export interface CommitmentTaskLink {
  id: string;
  title: string;
  columnId: string;
  completedAt: string | null;
}

export type EvidenceMilestone = 'IMPLEMENTED' | 'TESTED' | 'DEPLOYED' | 'DELIVERED' | 'ACCEPTED' | 'OTHER';
export type EvidenceType = 'URL' | 'NOTE';

export interface CommitmentEvidence {
  id: string;
  commitmentId: string;
  milestone: EvidenceMilestone;
  type: EvidenceType;
  url: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SourceRef {
  id: string;
  targetType: 'COMMITMENT' | 'CHANGE_REQUEST' | 'DECISION';
  targetId: string;
  type: 'CHAT_MESSAGE' | 'MEETING' | 'NOTE';
  conversationId: string | null;
  messageIds: string[];
  meetingId: string | null;
  noteId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CommitmentDetail extends CommitmentSummary {
  description: string | null;
  requestedByContactId: string | null;
  promisedAt: string | null;
  scopeItemId: string | null;
  tasks: CommitmentTaskLink[];
  evidence: CommitmentEvidence[];
  sourceRefs: SourceRef[];
  openSentChangeRequests: number;
}
```

> `ResolvedMessage` (dùng cho xem nội dung source ref chat) ĐÃ CÓ ở `types/message-analysis.ts`
> (milestone trước, `{ uuid, senderId, previewText, createdAt }`) — tái dùng, KHÔNG định nghĩa lại.

## 3. API client — mở rộng `commitments.api.ts`

Thêm vào object `commitmentsApi` đã có (KHÔNG đổi các method cũ):

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
```

(`PaginationMeta` type đã có sẵn ở `types.ts`, dùng cho `tasksApi.listProjectsPaged` — import thêm
vào `commitments.api.ts`.)

## 4. Query key

Thêm vào `taskKeys`:

```ts
commitments: (projectId: string) => [...taskKeys.all, 'commitments', projectId] as const,
commitmentDetail: (commitmentId: string) => [...taskKeys.all, 'commitment', commitmentId] as const,
```

## 5. Hooks

`src/features/tasks/hooks/useCommitments.ts` (file mới):

- `useCommitmentsInfinite(projectId, filters)` — `useInfiniteQuery`, theo đúng pattern
  `useProjectsInfinite.ts` đã có (`initialPageParam: 1`, `getNextPageParam` dựa `meta.hasNext`),
  `queryKey: [...taskKeys.commitments(projectId), 'infinite', filters] as const`, `PAGE_SIZE = 20`.
- `useCommitmentDetail(commitmentId)` — `useQuery`, key `taskKeys.commitmentDetail(commitmentId)`,
  `enabled: !!commitmentId`.
- `useCreateCommitment(projectId)` — mutation, gọi `commitmentsApi.create` với
  `crypto.randomUUID()` làm idempotency key sinh MỚI mỗi lần gọi `mutate` (KHÁC pattern milestone
  trước — ở đó key sinh 1 lần khi mở form và giữ nguyên qua nhiều lần bấm lại; ở đây dialog tạo mới
  đơn giản hơn, chỉ 1 lần bấm "Tạo" là đóng dialog, không có luồng "sửa rồi bấm lại nhiều lần" nên
  sinh key ngay trong `mutationFn` là đủ và đơn giản hơn). `onSuccess`: invalidate
  `taskKeys.commitments(projectId)` (prefix, khớp mọi biến thể filter đã cache) + toast "Đã tạo cam
  kết".

## 6. UI — `CommitmentsTab.tsx`

`src/features/tasks/components/commitments/CommitmentsTab.tsx` (file mới):

- Thanh filter trên cùng: `ComboBox` cho `deliveryStatus` (7 lựa chọn + "Tất cả"), `scopeStatus` (3 +
  "Tất cả"), `risk` (7 + "Tất cả") — 3 combobox riêng, state cục bộ `useState`. Nút "+ Tạo cam kết"
  ở góc phải.
- Danh sách: mỗi Commitment 1 card/row — title, badge `deliveryStatus` (màu theo nhóm: PLANNED/
  IN_PROGRESS = secondary, READY/DELIVERED = soft-warning, ACCEPTED = soft-success,
  CHANGES_REQUESTED/CANCELLED = soft-danger), badge risk (nếu có, màu danger, hiện tối đa 2 + "+N"),
  contact name (nếu có), dueAt (định dạng `dd/MM/yyyy`, đỏ nếu quá hạn và chưa `ACCEPTED`/
  `CANCELLED`). Click row → `openCommitmentDetail(commitment.id)` (state mới ở `tasks-ui.store.ts`,
  xem §7).
- Infinite scroll: tái dùng NGUYÊN `useInfiniteScroll` hook đã có
  (`src/features/tasks/hooks/useInfiniteScroll.ts`, dùng ở `ProjectList.tsx`) — 1 `scrollRef` cho
  khung cuộn danh sách, `sentinelRef = useInfiniteScroll({ rootRef: scrollRef, hasNextPage,
  isFetchingNextPage, onLoadMore: () => void fetchNextPage() })`, đặt `<div ref={sentinelRef}>` ở
  cuối danh sách (hiện "Đang tải thêm…" khi `isFetchingNextPage`, đúng y pattern `ProjectList.tsx`).
- Rỗng: "Chưa có cam kết nào." + nút "Tạo cam kết đầu tiên".
- `CreateCommitmentDialog` (con, cùng file hoặc file riêng nếu dài) — form title/description/
  scopeStatus (mặc định UNCLEAR)/ownerId (ComboBox từ `useMembers`)/dueAt (DatePicker) → gọi
  `useCreateCommitment`.
- `CommitmentDetailModal` mount ở cuối, luôn render, tự ẩn khi không có `selectedCommitmentId` (xem
  §7-8).

## 7. State — thêm vào `tasks-ui.store.ts`

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

(Độc lập với `selectedTaskId` đã có — 1 người dùng có thể lý thuyết mở cả 2, không cần loại trừ lẫn
nhau ở milestone này vì `CommitmentDetailModal` chỉ mount trong tab "Cam kết", `TaskDetailModal` chỉ
liên quan board — hiếm khi chồng nhau thực tế, không cần guard thêm.)

## 8. `CommitmentDetailModal.tsx` (read-only)

`src/features/tasks/components/commitments/CommitmentDetailModal.tsx` (file mới):

- `Dialog` lớn (`max-w-3xl` hoặc tương tự `MessageAnalysisDialog`), `open={selectedCommitmentId !==
  null}`, đóng gọi `closeCommitmentDetail`.
- Query `useCommitmentDetail(selectedCommitmentId ?? '')` — `enabled` tự false khi id null (React
  Query hook check).
- Loading: `Skeleton`. Nội dung khi có data:
  - Header: title (lớn), badge deliveryStatus + scopeStatus, risk badges đầy đủ (không cắt bớt như
    ở list).
  - `isReadyToDeliver` → banner nhỏ xanh "Đã sẵn sàng bàn giao" nếu true.
  - Mô tả (`description`, nếu có).
  - Lưới thông tin: contact (tên + email nếu có), owner (tên qua `useMembers` tra `ownerId`, hoặc
    "Chưa có người phụ trách"), promisedAt, dueAt, deliveredAt (định dạng ngày, "—" nếu null).
  - Section "Task liên kết" (`tasks[]`): mỗi item title + badge nếu `completedAt` (xanh "Hoàn
    thành"). Rỗng: "Chưa liên kết task nào."
  - Section "Bằng chứng" (`evidence[]`): mỗi item milestone label + type + (url dạng link mở tab mới
    nếu `type=URL`, note text nếu `type=NOTE`) + `createdAt`. Rỗng: "Chưa có bằng chứng."
  - Section "Nguồn tham chiếu" (`sourceRefs[]`): mỗi item hiện `type` (nhãn "Tin nhắn chat" cho
    `CHAT_MESSAGE`, còn lại hiện nguyên `type`) + nút "Xem nội dung" NẾU `type === 'CHAT_MESSAGE'`
    → bấm vào toggle mở rộng ngay dưới item đó (state `useState<string | null>` giữ `refId` đang mở,
    KHÔNG dùng `Popover` — đơn giản hơn, tránh học thêm API mới không cần thiết), gọi
    `GET commitments/:id/source-refs/:refId/content` (thêm hàm mới
    `commitmentsApi.getSourceRefContent(commitmentId, refId)` trả `ResolvedMessage[]`, render mỗi
    message dạng `previewText` + thời gian, `useQuery` với `enabled` theo state đang mở để không gọi
    trước khi bấm). Rỗng: "Chưa gắn nguồn tham chiếu."
  - KHÔNG có nút sửa/xoá/transition/thêm evidence/thêm task/thêm source-ref ở modal này — để trống,
    sub-project 2b thêm sau (ghi rõ trong code bằng comment ngắn, KHÔNG cần TODO format đặc biệt).

## 9. Nhãn tiếng Việt — hằng số dùng chung

Đặt trong `CommitmentsTab.tsx` hoặc file `commitment-labels.ts` riêng nếu dùng ở nhiều component
(2 component `CommitmentsTab`/`CommitmentDetailModal` đều cần → tách file riêng, tránh trùng lặp):

```ts
// src/features/tasks/lib/commitment-labels.ts
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PLANNED: 'Đã lên kế hoạch',
  IN_PROGRESS: 'Đang thực hiện',
  READY: 'Sẵn sàng bàn giao',
  DELIVERED: 'Đã bàn giao',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  ACCEPTED: 'Đã nghiệm thu',
  CANCELLED: 'Đã huỷ',
};

export const RISK_LABELS: Record<CommitmentRiskCode, string> = {
  NO_TASK: 'Chưa có task',
  NO_OWNER: 'Chưa có người phụ trách',
  DUE_SOON_INACTIVE: 'Sắp đến hạn, không hoạt động',
  OVERDUE: 'Quá hạn',
  DONE_NOT_DELIVERED: 'Xong nhưng chưa bàn giao',
  DELIVERED_NOT_ACCEPTED: 'Đã gửi, chưa nghiệm thu',
  WAITING_CLIENT: 'Chờ khách phản hồi',
};

export const SCOPE_STATUS_LABELS: Record<'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE', string> = {
  IN_SCOPE: 'Trong phạm vi',
  OUT_OF_SCOPE: 'Ngoài phạm vi',
  UNCLEAR: 'Chưa xác định phạm vi',
};

export const EVIDENCE_MILESTONE_LABELS: Record<EvidenceMilestone, string> = {
  IMPLEMENTED: 'Đã code',
  TESTED: 'Đã test',
  DEPLOYED: 'Đã deploy',
  DELIVERED: 'Đã bàn giao',
  ACCEPTED: 'Đã nghiệm thu',
  OTHER: 'Khác',
};
```

> `SCOPE_STATUS_LABELS` giá trị GIỐNG HỆT `scopeLabels` đã có trong `MessageAnalysisPreview.tsx`
> (milestone trước) — KHÔNG import chéo từ `features/chat` sang `features/tasks` (2 Bounded Context
> khác nhau theo `rules/11-bounded-context.md` của backend, áp dụng tinh thần tương tự ở FE: mỗi
> feature tự có bản nhãn của mình dù trùng nội dung — chấp nhận lặp 3 dòng, không tạo shared kernel
> chỉ vì 1 chỗ trùng).

## 10. Test

- `commitments.api.ts` (thêm case cho `listPaged`/`getDetail`/`getSourceRefContent` vào
  `commitments.api.test.ts` đã có — KHÔNG tạo file mới).
- `useCommitments.ts`: happy path 3 hook chính (`useCommitmentsInfinite` gọi đúng query key/filter,
  `useCreateCommitment` gọi đúng API + invalidate, `useCommitmentDetail` enabled/disabled đúng theo
  id null/có giá trị).
- `CommitmentsTab.tsx`: hiện đúng danh sách, filter đổi → gọi lại hook với params mới (mock hook,
  assert tham số), tạo mới (mở dialog, điền, submit), rỗng → hiện CTA tạo đầu tiên.
- `CommitmentDetailModal.tsx`: hiện đầy đủ section, rỗng từng section hiện đúng text, "Xem nội
  dung" source ref gọi đúng API.

## 11. Ngoài phạm vi (sub-project 2b xử lý sau)

- Sửa thông tin Commitment (`PATCH commitments/:id`).
- Link/unlink task (`POST/DELETE commitments/:id/tasks`).
- Thêm evidence (`POST commitments/:id/evidence`).
- Chuyển trạng thái (`POST commitments/:id/transition`) — cần UI phức tạp hơn (field điều kiện theo
  `to` được chọn: evidenceId khi DELIVERED/ACCEPTED, onBehalfOf khi ACCEPTED, reason khi
  CHANGES_REQUESTED/CANCELLED).
- Gắn/gỡ source ref mới từ modal chi tiết (tạo Commitment đã hỗ trợ gắn sẵn lúc tạo qua milestone
  "xác nhận đề xuất AI" — đây là gắn THÊM sau khi đã tạo, khác use-case).
- Xoá Commitment (`DELETE commitments/:id`).
