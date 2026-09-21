# Giao diện quản trị Commitment Graph — Hành động trong chi tiết Cam kết (sub-project 2b/2)

> Phần cuối của sub-project "Commitment". `CommitmentDetailModal` (sub-project 2a) hiện tại
> read-only — milestone này thêm: sửa thông tin, link/unlink task, thêm bằng chứng, chuyển trạng
> thái (theo state machine backend), gỡ nguồn tham chiếu. KHÔNG thêm nguồn tham chiếu mới từ modal
> này (xem §7 lý do) và KHÔNG xoá Commitment (rủi ro cao, để lại cho thao tác thủ công qua API/DB
> nếu thật sự cần, ngoài phạm vi milestone quản trị này).

## 1. State machine chuyển trạng thái — đã đọc code thật

`commitment-transition.rules.ts` (task-service):

```text
PLANNED → IN_PROGRESS → READY → DELIVERED → ACCEPTED
                    ↑                ↓
                    └── CHANGES_REQUESTED
(CANCELLED: từ bất kỳ trạng thái không-terminal nào, chỉ OWNER)
```

Điều kiện theo đích (`to`):
- `DELIVERED`/`ACCEPTED`: bắt buộc `evidenceId` — evidence đó phải có `milestone` **khớp chính xác**
  với `to` (vd chuyển sang `DELIVERED` cần 1 evidence có `milestone: DELIVERED`, không phải
  `TESTED` hay milestone khác dù đã tồn tại).
- `ACCEPTED`: thêm bắt buộc `onBehalfOf` (tên người phía khách xác nhận).
- `CHANGES_REQUESTED`/`CANCELLED`: bắt buộc `reason`.
- Quyền: transition thường cần `OWNER`/`ADMIN` project; `CANCELLED` chỉ `OWNER`. FE KHÔNG tự kiểm
  quyền (không có thông tin role đủ tin cậy ở client) — cứ gọi API, hiển thị lỗi 403 trả về nếu có
  (message tiếng Việt sẵn từ backend).

**Quyết định thiết kế:** FE KHÔNG replicate toàn bộ ma trận chuyển trạng thái hợp lệ (rủi ro lệch
logic 2 nơi). Dropdown "Chuyển đến" liệt **cả 7 trạng thái** (trừ trạng thái hiện tại) — nếu chọn 1
bước không hợp lệ, backend trả `422 COMMITMENT_INVALID_TRANSITION` kèm message tiếng Việt, hiển thị
qua toast. Chỉ 2 điều kiện field-level (evidence/onBehalfOf/reason) được replicate ở FE vì chúng
quyết định **field nào hiện ra trong form**, không phải tính hợp lệ của bước chuyển.

## 2. API client — mở rộng `commitments.api.ts`

`linkTask` đã có sẵn (milestone trước, dùng cho luồng xác nhận đề xuất AI) — TÁI DÙNG, không viết
lại. Thêm các method còn lại:

```ts
update: (
  commitmentId: string,
  input: {
    title?: string;
    description?: string | null;
    ownerId?: string | null;
    requestedByContactId?: string | null;
    dueAt?: string | null;
    promisedAt?: string | null;
    scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
    scopeItemId?: string | null;
    version: number;
  },
) =>
  taskClient.patch<CommitmentDetail>(`/api/v1/commitments/${commitmentId}`, input),

unlinkTask: (commitmentId: string, taskId: string) =>
  taskClient.delete<void>(`/api/v1/commitments/${commitmentId}/tasks/${taskId}`),

addEvidence: (
  commitmentId: string,
  input: {
    milestone: EvidenceMilestone;
    type: EvidenceType;
    url?: string;
    note?: string;
  },
) =>
  taskClient.post<CommitmentEvidence>(
    `/api/v1/commitments/${commitmentId}/evidence`,
    input,
  ),

transition: (
  commitmentId: string,
  input: {
    to: DeliveryStatus;
    evidenceId?: string;
    onBehalfOf?: string;
    reason?: string;
    version: number;
  },
) =>
  taskClient.post<CommitmentDetail>(
    `/api/v1/commitments/${commitmentId}/transition`,
    input,
  ),

removeSourceRef: (commitmentId: string, refId: string) =>
  taskClient.delete<void>(
    `/api/v1/commitments/${commitmentId}/source-refs/${refId}`,
  ),
```

## 3. Hooks — thêm vào `useCommitments.ts` (file đã có)

Mỗi hook nhận `commitmentId` (và `projectId` khi cần invalidate list). Pattern nhất quán với hook
đã có: `onSuccess` invalidate `taskKeys.commitmentDetail(commitmentId)` (luôn — data đổi) +
`taskKeys.commitments(projectId)` (khi field ảnh hưởng hiển thị ở list: status/risk/owner/dueAt —
tức mọi hook TRỪ `useAddEvidence`/`useRemoveSourceRef`, 2 hành động không đổi field hiện ở list
item), `onError` toast lỗi (ưu tiên `error.message` — backend đã trả tiếng Việt sẵn cho mọi lỗi
transition/version-conflict/not-found).

```ts
export function useUpdateCommitment(projectId: string, commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.update>[1]) =>
      commitmentsApi.update(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      void qc.invalidateQueries({ queryKey: taskKeys.commitments(projectId) });
      toast.success('Đã cập nhật cam kết');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật cam kết'),
  });
}

export function useLinkExistingTask(projectId: string, commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => commitmentsApi.linkTask(commitmentId, taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      void qc.invalidateQueries({ queryKey: taskKeys.commitments(projectId) });
      toast.success('Đã gắn task vào cam kết');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể gắn task'),
  });
}

export function useUnlinkTask(projectId: string, commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => commitmentsApi.unlinkTask(commitmentId, taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      void qc.invalidateQueries({ queryKey: taskKeys.commitments(projectId) });
      toast.success('Đã gỡ task khỏi cam kết');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể gỡ task'),
  });
}

export function useAddEvidence(commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.addEvidence>[1]) =>
      commitmentsApi.addEvidence(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      toast.success('Đã thêm bằng chứng');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể thêm bằng chứng'),
  });
}

export function useTransitionCommitment(projectId: string, commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.transition>[1]) =>
      commitmentsApi.transition(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      void qc.invalidateQueries({ queryKey: taskKeys.commitments(projectId) });
      toast.success('Đã chuyển trạng thái cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể chuyển trạng thái cam kết',
      ),
  });
}

export function useRemoveSourceRef(commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId: string) => commitmentsApi.removeSourceRef(commitmentId, refId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.commitmentDetail(commitmentId) });
      toast.success('Đã gỡ nguồn tham chiếu');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Không thể gỡ nguồn tham chiếu'),
  });
}
```

## 4. UI — `CommitmentDetailModal.tsx` (sửa file đã có)

### 4.1 Nút "Sửa" ở header → `EditCommitmentDialog`

Cạnh title trong `DialogHeader`, thêm nút icon `Pencil` mở `EditCommitmentDialog` — form:
title/description/ownerId (ComboBox `useMembers`)/requestedByContactId (ComboBox từ
`useProjectClient(projectId).data?.contacts`, tái dùng hook đã có ở sub-project 1)/dueAt/promisedAt
(2 `DatePicker`)/scopeStatus (ComboBox 3 giá trị)/scopeItemId (ComboBox từ
`useProjectScope(projectId).data?.items`, tái dùng hook sub-project 1). Prefill từ `detail.data`,
`version` lấy trực tiếp từ `detail.data.version` lúc submit (không cache cục bộ — cùng nguyên tắc
đã áp dụng ở `ScopeTab` sub-project 1).

### 4.2 Section "Task liên kết" — thêm link/unlink

- Mỗi task đã liên kết: thêm nút "Gỡ" (icon `X`, size nhỏ) cạnh badge trạng thái → gọi
  `useUnlinkTask`, không cần confirm dialog (hành động nhẹ, có thể gắn lại ngay nếu nhầm).
- Cuối danh sách: `ComboBox` chọn task CHƯA liên kết (lấy từ `tasksApi.getBoard(projectId)`, flatten
  `columns[].tasks[]`, lọc bỏ id đã có trong `detail.data.tasks`) + nút "Gắn" → `useLinkExistingTask`.
  Board rỗng/hết task để gắn → ẩn cả combobox, hiện text "Không còn task nào để gắn."

### 4.3 Section "Bằng chứng" — thêm nút "+ Thêm bằng chứng"

Mở `AddEvidenceDialog`: ComboBox milestone (6 giá trị `EVIDENCE_MILESTONE_LABELS`), ComboBox type
(URL/NOTE, nhãn "Đường dẫn"/"Ghi chú") → hiện `Input` (nếu URL, validate bắt đầu `http`) hoặc
`Textarea` (nếu NOTE) tương ứng. Submit → `useAddEvidence`.

### 4.4 Header status → nút "Chuyển trạng thái" + `TransitionDialog`

Cạnh badge `deliveryStatus` ở header, thêm nút nhỏ "Chuyển trạng thái" (ẩn nếu status đã
`ACCEPTED`/`CANCELLED` — 2 trạng thái terminal thật sự không còn transition hợp lệ nào theo
`isValidTransition`, trừ... thực ra `CANCELLED` cũng terminal, `ACCEPTED` không có `to` nào hợp lệ
từ nó trong bảng — ẩn nút khi `deliveryStatus` là 1 trong 2 giá trị này, tránh user bấm vào chắc
chắn nhận lỗi).

`TransitionDialog`:
- ComboBox "Chuyển đến" — 7 trạng thái trừ trạng thái hiện tại.
- NẾU `to` là `DELIVERED`/`ACCEPTED`: hiện ComboBox "Bằng chứng" — options là
  `detail.data.evidence.filter(e => e.milestone === to)` (client tự lọc đúng theo §1 — UX tốt hơn
  để user không chọn nhầm evidence sai milestone rồi nhận lỗi). Rỗng → hiện text "Chưa có bằng
  chứng phù hợp — thêm bằng chứng có mốc [nhãn milestone] trước" (không disable cả dialog, user vẫn
  có thể đổi `to` khác).
- NẾU `to === 'ACCEPTED'`: thêm `Input` "Người xác nhận phía khách" (bắt buộc).
- NẾU `to` là `CHANGES_REQUESTED`/`CANCELLED`: thêm `Textarea` "Lý do" (bắt buộc).
- Nút "Xác nhận" disabled khi thiếu field bắt buộc theo `to` đã chọn (validate client-side các field
  ĐÃ BIẾT bắt buộc — không chặn các trường hợp INVALID transition, để backend tự trả lỗi).
- Submit → `useTransitionCommitment`, `version` từ `detail.data.version` tại thời điểm bấm.

### 4.5 Section "Nguồn tham chiếu" — thêm nút "Gỡ"

Mỗi item thêm nút icon `X` nhỏ cạnh nút "Xem nội dung" (nếu có) → `useRemoveSourceRef`, không cần
confirm (hành động khôi phục được bằng cách gắn lại qua luồng AI-confirm nếu cần, rủi ro thấp).

## 5. Test

- `commitments.api.ts`: thêm case cho 5 method mới vào `commitments.api.test.ts` đã có.
- `useCommitments.ts`: thêm case cho 6 hook mới vào `useCommitments.test.ts` đã có — ưu tiên
  `useTransitionCommitment` (logic phức tạp nhất) và `useUpdateCommitment`.
- `CommitmentDetailModal.tsx`: thêm case cho từng hành động mới — sửa (mở dialog, prefill đúng,
  submit gọi đúng input+version), link/unlink task, thêm evidence, transition (đổi `to` → field
  điều kiện hiện/ẩn đúng; ComboBox evidence lọc đúng milestone; submit gọi đúng payload theo từng
  `to`), gỡ source ref.

## 6. Ngoài phạm vi

- Xoá Commitment (`DELETE commitments/:id`) — hành động phá huỷ, không đưa vào UI quản trị này.
- Thêm nguồn tham chiếu mới từ modal chi tiết — `CreateSourceRefDto` cần `type` (CHAT_MESSAGE/
  MEETING/NOTE) + id tương ứng; app hiện chưa có UI chọn "cuộc họp" hay "trang ghi chú" nào để làm
  nguồn — chỉ luồng AI-confirm (đã xong, gắn tự động `CHAT_MESSAGE`) mới có nguồn hợp lý để gắn.
  Xây picker cho MEETING/NOTE khi các module đó có API liên kết rõ ràng, không đoán trước ở đây.
- Không tự động làm mới danh sách "task chưa liên kết" theo realtime (nếu member khác vừa tạo task
  mới, PM cần đóng/mở lại dialog để thấy — chấp nhận được, `useQuery` cache 30s+ không phải vấn đề
  lớn cho luồng quản trị không tần suất cao này).
