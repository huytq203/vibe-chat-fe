# Hành động trong chi tiết Commitment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `CommitmentDetailModal` (hiện read-only) thành đầy đủ hành động: sửa, link/unlink
task, thêm evidence, chuyển trạng thái theo state machine, gỡ source ref.

**Architecture:** Mở rộng `commitments.api.ts`/`useCommitments.ts` đã có (không tạo file trùng).
`linkTask` đã có sẵn từ milestone trước — tái dùng. Mọi dialog mới đặt trong
`CommitmentDetailModal.tsx` (file đã có), theo đúng pattern dialog/mutation đã dùng ở `ClientTab`/
`ScopeTab`/`CommitmentsTab`.

**Tech Stack:** React, TanStack Query, Vitest + Testing Library, sonner.

**Spec:** `docs/superpowers/specs/2026-09-21-commitment-graph-admin-commitment-actions-design.md`

## Global Constraints

- KHÔNG dùng `any`. Định danh tiếng Anh, UI text/comment nghiệp vụ tiếng Việt.
- FE KHÔNG replicate ma trận chuyển trạng thái hợp lệ — chỉ replicate field-level nào bắt buộc theo
  `to` đã chọn (evidence khi DELIVERED/ACCEPTED, onBehalfOf khi ACCEPTED, reason khi
  CHANGES_REQUESTED/CANCELLED). Backend tự trả lỗi cho bước chuyển không hợp lệ.
- Mọi mutation dùng `version` từ `detail.data.version` MỚI NHẤT tại thời điểm submit, không cache
  cục bộ.
- KHÔNG thêm UI xoá Commitment, KHÔNG thêm UI tạo source ref mới từ modal chi tiết. Xem spec §6.

---

## Task 1: API client + hooks — 5 method mới, 6 hook mới

**Files:**
- Modify: `src/features/tasks/services/commitments.api.ts` (thêm `update`/`unlinkTask`/
  `addEvidence`/`transition`/`removeSourceRef` — `linkTask` ĐÃ CÓ, không đổi)
- Test: `src/features/tasks/services/commitments.api.test.ts` (thêm case, file đã có)
- Modify: `src/features/tasks/hooks/useCommitments.ts` (thêm 6 hook)
- Test: `src/features/tasks/hooks/useCommitments.test.ts` (thêm case, file đã có)

**Interfaces:**
- Produces: `commitmentsApi.update/unlinkTask/addEvidence/transition/removeSourceRef`;
  `useUpdateCommitment/useLinkExistingTask/useUnlinkTask/useAddEvidence/useTransitionCommitment/
  useRemoveSourceRef` — Task 2/3 dùng trực tiếp.

- [ ] **Step 1: Viết test trước cho 5 API mới (thêm vào `commitments.api.test.ts` đã có)**

```ts
// Thêm vào cuối describe('commitmentsApi', ...) đã có
it('update() gửi PATCH với đúng path/body', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
  await commitmentsApi.update('c1', { title: 'X mới', version: 3 });
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/commitments/c1');
  expect(init.method).toBe('PATCH');
  expect(JSON.parse(init.body as string)).toEqual({ title: 'X mới', version: 3 });
});

it('unlinkTask() gửi DELETE với đúng path', async () => {
  mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
  await commitmentsApi.unlinkTask('c1', 't1');
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/commitments/c1/tasks/t1');
  expect(init.method).toBe('DELETE');
});

it('addEvidence() gửi đúng path/body', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'e1' }));
  await commitmentsApi.addEvidence('c1', { milestone: 'TESTED', type: 'NOTE', note: 'ok' });
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/commitments/c1/evidence');
  expect(JSON.parse(init.body as string)).toEqual({
    milestone: 'TESTED',
    type: 'NOTE',
    note: 'ok',
  });
});

it('transition() gửi POST với đúng path/body', async () => {
  mockFetch.mockResolvedValue(okResponse({ id: 'c1' }));
  await commitmentsApi.transition('c1', { to: 'DELIVERED', evidenceId: 'e1', version: 3 });
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/commitments/c1/transition');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({
    to: 'DELIVERED',
    evidenceId: 'e1',
    version: 3,
  });
});

it('removeSourceRef() gửi DELETE với đúng path', async () => {
  mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
  await commitmentsApi.removeSourceRef('c1', 'ref1');
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/commitments/c1/source-refs/ref1');
  expect(init.method).toBe('DELETE');
});
```

- [ ] **Step 2: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: FAIL — 5 method chưa tồn tại.

- [ ] **Step 3: Thêm 5 method vào `commitmentsApi`** (copy nguyên code ở spec §2 — đặt sau
  `linkTask` đã có, trước `list`)

Thêm import cần thiết vào đầu file (nếu chưa có): `EvidenceMilestone`, `EvidenceType`,
`CommitmentEvidence` từ `../types`.

- [ ] **Step 4: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/services/commitments.api.test.ts`
Expected: PASS toàn bộ (test cũ + 5 test mới).

- [ ] **Step 5: Viết test trước cho hook mới (thêm vào `useCommitments.test.ts` đã có)**

```ts
// Thêm vào cuối file useCommitments.test.ts đã có, cùng describe block hoặc describe mới
describe('useUpdateCommitment', () => {
  it('nên gọi commitmentsApi.update với đúng tham số', async () => {
    vi.mocked(commitmentsApi.update).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useUpdateCommitment('proj-1', 'c1'),
      { wrapper },
    );

    result.current.mutate({ title: 'X mới', version: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.update).toHaveBeenCalledWith('c1', {
      title: 'X mới',
      version: 3,
    });
  });
});

describe('useTransitionCommitment', () => {
  it('nên gọi commitmentsApi.transition với đúng tham số', async () => {
    vi.mocked(commitmentsApi.transition).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useTransitionCommitment('proj-1', 'c1'),
      { wrapper },
    );

    result.current.mutate({ to: 'READY', version: 2 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.transition).toHaveBeenCalledWith('c1', {
      to: 'READY',
      version: 2,
    });
  });
});
```

Thêm `update: vi.fn()`, `transition: vi.fn()` vào `vi.mock('../services/commitments.api', ...)` đã
có ở đầu file (giữ nguyên `listPaged`/`getDetail`/`create` đã mock).

- [ ] **Step 6: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/tasks/hooks/useCommitments.test.ts`
Expected: FAIL — 2 hook chưa tồn tại.

- [ ] **Step 7: Thêm 6 hook vào `useCommitments.ts`** (copy nguyên code ở spec §3, đặt sau
  `useCreateCommitment` đã có)

- [ ] **Step 8: Run test, xác nhận PASS**

Run: `npx vitest run src/features/tasks/hooks/useCommitments.test.ts`
Expected: PASS toàn bộ (test cũ + 2 test mới — 4 hook còn lại không có test riêng theo plan, cùng
pattern đã verify nên chấp nhận được, đúng mức Task 1 các sub-project trước).

- [ ] **Step 9: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/hooks/useCommitments.ts src/features/tasks/hooks/useCommitments.test.ts`
Expected: sạch.

- [ ] **Step 10: Commit**

```bash
git add src/features/tasks/services/commitments.api.ts src/features/tasks/services/commitments.api.test.ts src/features/tasks/hooks/useCommitments.ts src/features/tasks/hooks/useCommitments.test.ts
git commit -m "feat(tasks): API/hook cho sửa, evidence, transition, gỡ task/source-ref của Commitment"
```

---

## Task 2: Sửa Commitment + Thêm bằng chứng + Gỡ source ref

**Files:**
- Modify: `src/features/tasks/components/commitments/CommitmentDetailModal.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`

**Interfaces:**
- Consumes: `useUpdateCommitment/useAddEvidence/useRemoveSourceRef` (Task 1); `useProjectClient`/
  `useProjectScope` (sub-project 1, đã có).

- [ ] **Step 1: Đọc file `CommitmentDetailModal.tsx` thật hiện tại (đã có sẵn cấu trúc từ
  sub-project 2a)** — nắm đúng vị trí `DialogHeader`/`DialogTitle` (dòng ~53-63) và section "Bằng
  chứng"/"Nguồn tham chiếu" (dòng ~133-171) để chèn đúng chỗ, không viết lại toàn bộ file.

- [ ] **Step 2: Thêm nút "Sửa" + `EditCommitmentDialog`**

Thêm import: `Pencil`, `Plus`, `X` từ `lucide-react`; `Button` (`@/components/ui/button/Button`);
`Dialog`/`DialogContent`/`DialogDescription`/`DialogFooter`/`DialogHeader`/`DialogTitle` (đã import
1 phần, bổ sung `DialogDescription`/`DialogFooter`); `Input`/`Textarea`/`ComboBox`/`DatePicker`;
`useUpdateCommitment`/`useAddEvidence`/`useRemoveSourceRef` từ `../../hooks/useCommitments`;
`useProjectClient` từ `../../hooks/useClient`; `useProjectScope` từ `../../hooks/useScope`.

Sửa `DialogTitle` (dòng ~54-62), thêm nút "Sửa" ngay sau badge cuối:

```tsx
<DialogTitle className="flex flex-wrap items-center gap-2">
  {detail.data.title}
  <Badge variant="secondary" size="sm">
    {DELIVERY_STATUS_LABELS[detail.data.deliveryStatus]}
  </Badge>
  <Badge variant="soft-primary" size="sm">
    {SCOPE_STATUS_LABELS[detail.data.scopeStatus]}
  </Badge>
  <Button
    variant="ghost"
    size="icon-sm"
    aria-label="Sửa cam kết"
    className="ml-auto"
    onClick={() => setEditOpen(true)}
  >
    <Pencil className="h-4 w-4" />
  </Button>
</DialogTitle>
```

Thêm state `const [editOpen, setEditOpen] = useState(false);` đầu component `CommitmentDetailModal`
(cạnh khai báo `selectedId`/`close`/`detail`/`members` đã có).

Thêm component mới cuối file (trước hoặc sau `SourceRefContent`):

```tsx
function EditCommitmentDialog({
  projectId,
  commitment,
  open,
  onOpenChange,
}: {
  projectId: string;
  commitment: CommitmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(commitment.title);
  const [description, setDescription] = useState(commitment.description ?? '');
  const [ownerId, setOwnerId] = useState(commitment.ownerId ?? '');
  const [contactId, setContactId] = useState(commitment.contact?.id ?? '');
  const [dueAt, setDueAt] = useState<Date | undefined>(
    commitment.dueAt ? new Date(commitment.dueAt) : undefined,
  );
  const [promisedAt, setPromisedAt] = useState<Date | undefined>(
    commitment.promisedAt ? new Date(commitment.promisedAt) : undefined,
  );
  const [scopeStatus, setScopeStatus] = useState(commitment.scopeStatus);
  const [scopeItemId, setScopeItemId] = useState(commitment.scopeItemId ?? '');

  const members = useMembers(projectId);
  const client = useProjectClient(projectId);
  const scope = useProjectScope(projectId);
  const update = useUpdateCommitment(projectId, commitment.id);

  const memberOptions = (members.data ?? []).map((m) => ({ value: m.userId, label: m.displayName }));
  const contactOptions = (client.data?.contacts ?? []).map((c) => ({ value: c.id, label: c.name }));
  const scopeItemOptions = (scope.data?.items ?? []).map((i) => ({ value: i.id, label: i.title }));

  function handleSubmit() {
    update.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        ownerId: ownerId || null,
        requestedByContactId: contactId || null,
        dueAt: dueAt ? dueAt.toISOString() : null,
        promisedAt: promisedAt ? promisedAt.toISOString() : null,
        scopeStatus,
        scopeItemId: scopeItemId || null,
        version: commitment.version,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa cam kết</DialogTitle>
          <DialogDescription>Cập nhật thông tin cam kết.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
          <ComboBox
            label="Người chịu trách nhiệm"
            value={ownerId}
            options={memberOptions}
            onValueChange={(v) => setOwnerId(Array.isArray(v) ? (v[0] ?? '') : v)}
            placeholder="Chọn thành viên"
            emptyText="Không có thành viên."
          />
          <ComboBox
            label="Người yêu cầu phía khách"
            value={contactId}
            options={contactOptions}
            onValueChange={(v) => setContactId(Array.isArray(v) ? (v[0] ?? '') : v)}
            placeholder="Chọn người liên hệ"
            emptyText="Chưa có người liên hệ nào."
          />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              mode="single"
              editable
              label="Đã hứa lúc"
              placeholder="dd/mm/yyyy"
              value={promisedAt}
              onChange={(d) => setPromisedAt(d instanceof Date ? d : undefined)}
            />
            <DatePicker
              mode="single"
              editable
              label="Hạn hoàn thành"
              placeholder="dd/mm/yyyy"
              value={dueAt}
              onChange={(d) => setDueAt(d instanceof Date ? d : undefined)}
            />
          </div>
          <ComboBox
            label="Trạng thái phạm vi"
            value={scopeStatus}
            options={Object.entries(SCOPE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            onValueChange={(v) =>
              setScopeStatus((Array.isArray(v) ? v[0] : v) as CommitmentDetail['scopeStatus'])
            }
          />
          <ComboBox
            label="Hạng mục scope liên quan"
            value={scopeItemId}
            options={scopeItemOptions}
            onValueChange={(v) => setScopeItemId(Array.isArray(v) ? (v[0] ?? '') : v)}
            placeholder="Chọn hạng mục"
            emptyText="Chưa có hạng mục scope nào."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} isLoading={update.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Mount ở cuối JSX chính của `CommitmentDetailModal` (trong nhánh `detail.data ?`, sau `</div>` đóng
nội dung cuộn, trước `</>`):

```tsx
<EditCommitmentDialog
  projectId={projectId}
  commitment={detail.data}
  open={editOpen}
  onOpenChange={setEditOpen}
/>
```

Import `CommitmentDetail` type nếu chưa có: thêm vào dòng `import type { SourceRef } from
'../../types';` → `import type { CommitmentDetail, SourceRef } from '../../types';`.

- [ ] **Step 3: Thêm nút "+ Thêm bằng chứng" + `AddEvidenceDialog`**

Sửa `<Section title="Bằng chứng">` — thêm nút bên cạnh title (Section component hiện chỉ nhận
`title`/`children`, cần thêm prop `action?: ReactNode` để đặt nút, HOẶC đơn giản hơn: bọc tiêu đề +
nút trong 1 `<div className="flex items-center justify-between">` ngay trong chỗ gọi `<Section>`
thay vì sửa component `Section` — chọn cách 2, ít thay đổi hơn):

```tsx
<div>
  <div className="mb-1.5 flex items-center justify-between">
    <h3 className="text-sm font-semibold text-foreground">Bằng chứng</h3>
    <Button variant="ghost" size="sm" onClick={() => setAddEvidenceOpen(true)}>
      <Plus className="h-3.5 w-3.5" />
      Thêm
    </Button>
  </div>
  {detail.data.evidence.length === 0 ? (
    <EmptyText>Chưa có bằng chứng.</EmptyText>
  ) : (
    /* giữ nguyên <ul> đã có */
  )}
</div>
```

(Thay thế toàn bộ khối `<Section title="Bằng chứng">...</Section>` hiện có bằng cấu trúc trên, giữ
nguyên phần `<ul>` bên trong không đổi.)

Thêm state `const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);` cạnh `editOpen`.

Thêm component `AddEvidenceDialog`:

```tsx
function AddEvidenceDialog({
  commitmentId,
  open,
  onOpenChange,
}: {
  commitmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [milestone, setMilestone] = useState<keyof typeof EVIDENCE_MILESTONE_LABELS>('IMPLEMENTED');
  const [type, setType] = useState<'URL' | 'NOTE'>('URL');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const addEvidence = useAddEvidence(commitmentId);

  function reset() {
    setMilestone('IMPLEMENTED');
    setType('URL');
    setUrl('');
    setNote('');
  }

  function handleSubmit() {
    addEvidence.mutate(
      {
        milestone,
        type,
        ...(type === 'URL' ? { url: url.trim() } : { note: note.trim() }),
      },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );
  }

  const canSubmit = type === 'URL' ? url.trim().startsWith('http') : note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm bằng chứng</DialogTitle>
          <DialogDescription>Bằng chứng cho 1 mốc thực hiện cụ thể.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Mốc thực hiện"
            value={milestone}
            options={Object.entries(EVIDENCE_MILESTONE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onValueChange={(v) =>
              setMilestone((Array.isArray(v) ? v[0] : v) as typeof milestone)
            }
          />
          <ComboBox
            label="Loại"
            value={type}
            options={[
              { value: 'URL', label: 'Đường dẫn' },
              { value: 'NOTE', label: 'Ghi chú' },
            ]}
            onValueChange={(v) => setType((Array.isArray(v) ? v[0] : v) as 'URL' | 'NOTE')}
          />
          {type === 'URL' ? (
            <Input
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          ) : (
            <Textarea label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} isLoading={addEvidence.isPending}>
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Mount cạnh `EditCommitmentDialog`:

```tsx
<AddEvidenceDialog
  commitmentId={detail.data.id}
  open={addEvidenceOpen}
  onOpenChange={setAddEvidenceOpen}
/>
```

- [ ] **Step 4: Thêm nút "Gỡ" ở mỗi source ref**

Sửa `SourceRefList` (nhận thêm không cần prop mới — `useRemoveSourceRef` gọi ngay trong component
này với `commitmentId` đã có sẵn qua prop):

```tsx
function SourceRefList({
  commitmentId,
  refs,
}: {
  commitmentId: string;
  refs: SourceRef[];
}) {
  const [openRefId, setOpenRefId] = useState<string | null>(null);
  const removeSourceRef = useRemoveSourceRef(commitmentId);

  return (
    <ul className="space-y-1.5">
      {refs.map((sourceRef) => (
        <li key={sourceRef.id} className="text-sm">
          <div className="flex items-center gap-2">
            <span>
              {sourceRef.type === 'CHAT_MESSAGE' ? 'Tin nhắn chat' : sourceRef.type}
            </span>
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
            <SourceRefContent commitmentId={commitmentId} refId={sourceRef.id} />
          )}
        </li>
      ))}
    </ul>
  );
}
```

(Thay thế nguyên hàm `SourceRefList` hiện có bằng bản trên — chỉ thêm `useRemoveSourceRef` +
button "Gỡ", giữ nguyên phần còn lại.)

- [ ] **Step 5: Viết test cho 3 hành động mới (thêm vào `CommitmentDetailModal.test.tsx` đã có)**

Case: bấm "Sửa" → mở dialog prefill đúng field từ `detail.data` → sửa title → submit → gọi
`useUpdateCommitment().mutate` với đúng input + `version` từ data. Bấm "Thêm" ở section Bằng chứng →
điền → submit → gọi `useAddEvidence().mutate` đúng input. Bấm "Gỡ" ở 1 source ref → gọi
`useRemoveSourceRef().mutate` với đúng `refId`.

Mock thêm `useUpdateCommitment`/`useAddEvidence`/`useRemoveSourceRef` (từ `../../hooks/
useCommitments`) và `useProjectClient`/`useProjectScope` (từ `../../hooks/useClient`/`useScope`) —
đọc mock đã có trong file test để bổ sung đúng cấu trúc `vi.mock`.

- [ ] **Step 6: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`

- [ ] **Step 7: Build + lint + full scope test**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Expected: sạch, PASS toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add src/features/tasks/components/commitments/CommitmentDetailModal.tsx src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx
git commit -m "feat(tasks): sửa Commitment, thêm bằng chứng, gỡ nguồn tham chiếu trong modal chi tiết"
```

---

## Task 3: Link/unlink task + Chuyển trạng thái

**Files:**
- Modify: `src/features/tasks/components/commitments/CommitmentDetailModal.tsx`
- Modify: `src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`

**Interfaces:**
- Consumes: `useLinkExistingTask/useUnlinkTask/useTransitionCommitment` (Task 1); `tasksApi.getBoard`
  (có sẵn).

- [ ] **Step 1: Thêm link/unlink task**

Sửa `<Section title="Task liên kết">` — cùng cách Task 2 Step 3 (bọc header + nội dung, KHÔNG cần
nút ở header vì combobox nằm CUỐI danh sách theo spec §4.2, không phải nút mở dialog):

```tsx
<div>
  <h3 className="mb-1.5 text-sm font-semibold text-foreground">Task liên kết</h3>
  {detail.data.tasks.length === 0 ? (
    <EmptyText>Chưa liên kết task nào.</EmptyText>
  ) : (
    <ul className="space-y-1">
      {detail.data.tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-2 text-sm">
          <span>{task.title}</span>
          {task.completedAt && (
            <Badge variant="soft-success" size="sm">Hoàn thành</Badge>
          )}
          <button
            type="button"
            aria-label={`Gỡ ${task.title}`}
            className="text-muted-foreground hover:text-danger"
            onClick={() => unlinkTask.mutate(task.id)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )}
  <LinkTaskPicker projectId={projectId} commitment={detail.data} />
</div>
```

Thêm `const unlinkTask = useUnlinkTask(projectId, detail.data.id);` trong nhánh `detail.data ?` của
`CommitmentDetailModal` (đặt cạnh chỗ khai báo các hook khác — LƯU Ý: hook chỉ được gọi khi
`detail.data` chắc chắn tồn tại, đặt sau điều kiện `detail.data ?` KHÔNG hợp lệ với Rules of Hooks
nếu đặt trong nhánh JSX — phải đặt hook ở TOP-LEVEL của component, không điều kiện. Sửa đúng: khai
báo `useUnlinkTask(projectId, selectedId ?? '')` cùng chỗ với `useCommitmentDetail`/`useMembers` ở
đầu component, TRƯỚC mọi return/JSX, dùng được `selectedId ?? ''` như đã làm cho `useCommitmentDetail`).

Thêm component `LinkTaskPicker`:

```tsx
function LinkTaskPicker({
  projectId,
  commitment,
}: {
  projectId: string;
  commitment: CommitmentDetail;
}) {
  const [taskId, setTaskId] = useState('');
  const board = useQuery({
    queryKey: ['tasks', projectId, 'board'],
    queryFn: () => tasksApi.getBoard(projectId),
  });
  const linkTask = useLinkExistingTask(projectId, commitment.id);

  const linkedIds = new Set(commitment.tasks.map((t) => t.id));
  const options = (board.data?.columns ?? [])
    .flatMap((c) => c.tasks)
    .filter((t) => !linkedIds.has(t.id))
    .map((t) => ({ value: t.id, label: t.title }));

  if (!board.isPending && options.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Không còn task nào để gắn.</p>
    );
  }

  return (
    <div className="mt-2 flex items-end gap-2">
      <ComboBox
        label="Gắn task có sẵn"
        value={taskId}
        options={options}
        onValueChange={(v) => setTaskId(Array.isArray(v) ? (v[0] ?? '') : v)}
        placeholder={board.isPending ? 'Đang tải...' : 'Chọn task'}
        emptyText="Không còn task nào để gắn."
        className="flex-1"
      />
      <Button
        size="sm"
        disabled={!taskId}
        isLoading={linkTask.isPending}
        onClick={() => {
          linkTask.mutate(taskId, { onSuccess: () => setTaskId('') });
        }}
      >
        Gắn
      </Button>
    </div>
  );
}
```

> **Kiểm tra `BoardTask`/`board.data.columns[].tasks[]` thật có field `title`/`id` đúng như trên
> không** — đọc `tasksApi.getBoard` return type (`Board { project, columns: BoardColumn[] }`,
> `BoardColumn { ...; tasks: BoardTask[] }`) trước khi dùng, đã xác nhận ở milestone trước nhưng
> double-check field name `title` chính xác trên `BoardTask`.

Thêm import: `tasksApi` từ `../../services/tasks.api`; `useQuery` đã import sẵn (dùng cho
`SourceRefContent`).

- [ ] **Step 2: Thêm nút "Chuyển trạng thái" + `TransitionDialog`**

Sửa badge `deliveryStatus` ở `DialogTitle` — thêm nút NGAY SAU badge đó (trước nút "Sửa" đã thêm ở
Task 2), chỉ hiện khi status chưa terminal:

```tsx
{detail.data.deliveryStatus !== 'ACCEPTED' && detail.data.deliveryStatus !== 'CANCELLED' && (
  <Button variant="outline" size="sm" onClick={() => setTransitionOpen(true)}>
    Chuyển trạng thái
  </Button>
)}
```

Thêm state `const [transitionOpen, setTransitionOpen] = useState(false);` cạnh `editOpen`/
`addEvidenceOpen`.

Thêm component `TransitionDialog`:

```tsx
function TransitionDialog({
  projectId,
  commitment,
  open,
  onOpenChange,
}: {
  projectId: string;
  commitment: CommitmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState<DeliveryStatus>(
    (Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[]).find(
      (s) => s !== commitment.deliveryStatus,
    )!,
  );
  const [evidenceId, setEvidenceId] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [reason, setReason] = useState('');
  const transition = useTransitionCommitment(projectId, commitment.id);

  const needsEvidence = to === 'DELIVERED' || to === 'ACCEPTED';
  const needsOnBehalfOf = to === 'ACCEPTED';
  const needsReason = to === 'CHANGES_REQUESTED' || to === 'CANCELLED';
  const matchingEvidence = commitment.evidence.filter((e) => e.milestone === to);

  const canSubmit =
    (!needsEvidence || !!evidenceId) &&
    (!needsOnBehalfOf || onBehalfOf.trim().length > 0) &&
    (!needsReason || reason.trim().length > 0);

  function handleSubmit() {
    transition.mutate(
      {
        to,
        version: commitment.version,
        ...(needsEvidence && evidenceId ? { evidenceId } : {}),
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
          <DialogTitle>Chuyển trạng thái cam kết</DialogTitle>
          <DialogDescription>
            Đang ở "{DELIVERY_STATUS_LABELS[commitment.deliveryStatus]}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ComboBox
            label="Chuyển đến"
            value={to}
            options={Object.entries(DELIVERY_STATUS_LABELS)
              .filter(([value]) => value !== commitment.deliveryStatus)
              .map(([value, label]) => ({ value, label }))}
            onValueChange={(v) => setTo((Array.isArray(v) ? v[0] : v) as DeliveryStatus)}
          />
          {needsEvidence && (
            matchingEvidence.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có bằng chứng phù hợp — thêm bằng chứng có mốc "
                {EVIDENCE_MILESTONE_LABELS[to as keyof typeof EVIDENCE_MILESTONE_LABELS]}" trước.
              </p>
            ) : (
              <ComboBox
                label="Bằng chứng"
                value={evidenceId}
                options={matchingEvidence.map((e) => ({
                  value: e.id,
                  label: e.type === 'URL' ? (e.url ?? e.id) : (e.note ?? e.id),
                }))}
                onValueChange={(v) => setEvidenceId(Array.isArray(v) ? (v[0] ?? '') : v)}
                placeholder="Chọn bằng chứng"
                emptyText="Không có bằng chứng phù hợp."
              />
            )
          )}
          {needsOnBehalfOf && (
            <Input
              label="Người xác nhận phía khách"
              value={onBehalfOf}
              onChange={(e) => setOnBehalfOf(e.target.value)}
              required
            />
          )}
          {needsReason && (
            <Textarea
              label="Lý do"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
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

Import `DeliveryStatus` type vào dòng `import type { CommitmentDetail, SourceRef } from
'../../types';` → thêm `DeliveryStatus`.

Mount `TransitionDialog` cạnh `EditCommitmentDialog`/`AddEvidenceDialog`.

- [ ] **Step 3: Viết test cho link/unlink + transition**

Case: `LinkTaskPicker` hiện đúng task chưa liên kết (lọc bỏ đã liên kết) → chọn → bấm "Gắn" → gọi
`useLinkExistingTask().mutate` đúng `taskId`. Bấm "Gỡ" ở 1 task → gọi `useUnlinkTask().mutate` đúng
`taskId`. `TransitionDialog`: đổi `to` sang `DELIVERED` → hiện ComboBox evidence lọc đúng theo
milestone; đổi `to` sang `ACCEPTED` → hiện thêm field "Người xác nhận"; đổi `to` sang
`CHANGES_REQUESTED` → hiện field "Lý do", ẩn evidence; submit → gọi `useTransitionCommitment().mutate`
đúng payload theo từng trường hợp. Nút "Chuyển trạng thái" ẩn khi `deliveryStatus` là `ACCEPTED`
hoặc `CANCELLED`.

Mock thêm `useLinkExistingTask`/`useUnlinkTask`/`useTransitionCommitment` (từ `../../hooks/
useCommitments`) và `tasksApi.getBoard` (từ `../../services/tasks.api`).

- [ ] **Step 4: Run test, sửa tới khi PASS**

Run: `npx vitest run src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx`

- [ ] **Step 5: Build + lint + full scope test + full suite (1 lần, không song song việc khác)**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/tasks/components/commitments`
Run: `npx vitest run src/features/tasks`
Run: `npx vitest run`
Expected: sạch toàn bộ, không regression. Sub-project "Commitment" (2a + 2b) hoàn tất sau task này.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/commitments/CommitmentDetailModal.tsx src/features/tasks/components/commitments/CommitmentDetailModal.test.tsx
git commit -m "feat(tasks): link/unlink task và chuyển trạng thái trong modal chi tiết Commitment"
```
