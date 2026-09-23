# S1.1c — FE: UX role CLIENT + evidence FILE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLIENT chỉ thấy Commitment Graph ở chế độ chỉ xem; OWNER mời contact làm CLIENT; PM tải file bằng chứng lên, mọi người tải về được.

**Architecture:** Một hook trung tâm `useProjectRole` quyết định `isClient`/`canManage`; trang project và 4 tab Commitment Graph đọc hook này để ẩn/hiện. Evidence FILE đi luồng presign → PUT S3 → confirm, gói trong 1 hook mutation.

**Tech Stack:** Next.js/React, TanStack Query, Zustand (`tasks-ui.store`), Vitest + Testing Library, sonner.

**Spec:** `docs/superpowers/specs/2026-09-23-commitment-graph-s1.1c-client-ux-design.md` — người thực thi PHẢI đọc spec trước (hành vi chi tiết ở spec §3, plan này không lặp lại).

**Cách viết plan:** plan cố ý KHÔNG chép sẵn code. Mỗi task nêu file, interface bắt buộc, và danh sách test (tên + hành vi). Người thực thi tự đọc code hiện có, theo đúng pattern của các file lân cận (ví dụ `CommitmentsTab.tsx`, `useChangeRequests.ts`, các `*.test.tsx` cùng thư mục), viết test trước rồi code.

## Global Constraints

- Identifier tiếng Anh; chuỗi UI, toast, tên test (`nên ... khi ...`) tiếng Việt. Không dịch chuỗi tiếng Việt có sẵn.
- Cấm `any`; không dùng optional-call trên mock để né mock thiếu.
- Rules of Hooks: hook luôn gọi ở top-level component, không gọi trong điều kiện/JSX.
- Upload S3 bằng `fetch` thuần (KHÔNG qua `taskClient`, KHÔNG gắn Authorization); header `Content-Type` = `mimeType` đã presign.
- Whitelist MIME + giới hạn 100 MB phải khớp BE (`task-service/src/modules/attachments/attachment-mime.constants.ts` — sao chép danh sách vào 1 hằng số FE, không import chéo repo).
- Mỗi task: `npx tsc --noEmit`, `npx eslint <thư mục đã sửa>`, `npx vitest run <file test liên quan>` xanh; cuối task chạy `npx vitest run` toàn bộ 1 lần (không chạy song song việc khác). Commit mới, không amend, dòng ghi công `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. CLIENT vào project khi store đang nhớ `boardView: 'board'` → vẫn chỉ thấy Commitment Graph, board không nháy lên trong lúc role đang tải (test ở Task 1).
2. User không phải member (role `null`) hoặc members query lỗi → không được coi là `canManage` (ẩn nút ghi) và không crash (test ở Task 1).
3. PUT S3 thất bại (mạng/403 CORS) → KHÔNG gọi confirm, toast lỗi, dialog giữ nguyên để thử lại (test ở Task 4).
4. File đúng MIME nhưng >100 MB, hoặc MIME ngoài whitelist (vd `text/html`, `image/svg+xml`) → chặn ở FE, không gọi presign (test ở Task 4).
5. Mời CLIENT cho contact đã liên kết (race: người khác vừa mời) → BE trả `CLIENT_CONTACT_ALREADY_LINKED`, FE hiện message tiếng Việt và refetch để badge cập nhật (test ở Task 3).

---

## Task 1: `useProjectRole` + trang project chỉ Commitment Graph cho CLIENT

**Files:**
- Create: `src/features/tasks/hooks/useProjectRole.ts` + `useProjectRole.test.ts(x)`
- Modify: component trang project nơi chọn render board/list/commitments và nơi hiện lối vào cài đặt/chia sẻ/thành viên (tự tìm: grep `boardView` và `CommitmentGraphView` trong `src/features/tasks`; `BoardHeader.tsx` có nút chuyển view)
- Modify: `vitest.config.ts` — commit thay đổi `testTimeout: 15000` đang có sẵn trong working tree (đã tồn tại từ trước, giữ nguyên nội dung)

**Interfaces:**
- Produces: `useProjectRole(projectId: string): { role: ProjectRole | null; isClient: boolean; canManage: boolean; isLoading: boolean }`, với `ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'CLIENT'` (export type từ `src/features/tasks/types.ts` nếu chưa có). Nguồn dữ liệu: query danh sách member project đang dùng ở `TaskDetailHeader.tsx`/`ProjectInfoTab.tsx` + user hiện tại (dùng lại đúng cách các file đó lấy `currentUser`). Không gọi API mới.

**Tests (viết trước, xác nhận fail, rồi code):**
- `useProjectRole`: `nên trả canManage khi user là OWNER`; `... khi user là ADMIN`; `nên trả isClient và không canManage khi user là CLIENT`; `nên trả role null và không canManage khi user không phải member`; `nên trả isLoading khi danh sách member đang tải`.
- Trang project: `nên chỉ hiện Commitment Graph khi user là CLIENT` (kể cả store đang `boardView: 'board'`); `nên ẩn nút chuyển board/list và lối vào cài đặt khi user là CLIENT`; `nên hiện skeleton, không render board khi role đang tải`; `nên giữ nguyên hành vi hiện tại khi user là OWNER`.

- [ ] Viết test → chạy thấy fail → cài đặt → chạy thấy pass
- [ ] tsc + eslint + vitest toàn bộ
- [ ] Commit: `feat(tasks): useProjectRole + CLIENT chỉ thấy Commitment Graph`

---

## Task 2: Ẩn nút ghi trong Commitment Graph theo `canManage`

**Files (Modify, kèm test cùng thư mục):** `ClientTab.tsx`, `ScopeTab.tsx`, `CommitmentsTab.tsx`, `CommitmentDetailModal.tsx`, `ChangeRequestsTab.tsx`, `ChangeRequestDetailModal.tsx` trong `src/features/tasks/components/commitments/`.

**Interfaces:**
- Consumes: `useProjectRole(projectId)` (Task 1). Mỗi component đã nhận `projectId` qua props — gọi hook ở top-level.

**Hành vi:** đúng danh sách spec §3.2. Lỗi khi xem nội dung nguồn tham chiếu (source-ref content) → toast tiếng Việt "Không xem được nội dung tin nhắn nguồn" và modal không crash.

**Tests:** mỗi file test thêm 2 case — `nên ẩn các nút ghi khi user không có quyền quản lý` (mock `useProjectRole` → `canManage: false`, assert các nút tạo/sửa/chuyển trạng thái/thêm bằng chứng/liên kết/gỡ không có trong DOM) và `nên hiện các nút ghi khi user có quyền quản lý`. Thêm cho 2 modal: `nên hiện thông báo lỗi khi không tải được nội dung nguồn`. Các test cũ phải mock `useProjectRole` → `canManage: true` để giữ nguyên hành vi (sửa mock, không xoá test).

- [ ] Viết test → fail → cài đặt → pass
- [ ] tsc + eslint + vitest toàn bộ
- [ ] Commit: `feat(tasks): ẩn thao tác ghi Commitment Graph khi không có quyền quản lý`

---

## Task 3: Mời contact làm CLIENT (`ClientTab`)

**Files:**
- Modify: `src/features/tasks/services/tasks.api.ts` — `addMember(projectId, userId)` mở rộng thành `addMember(projectId: string, userId: string, options?: { role?: 'MEMBER' | 'CLIENT'; contactId?: string })`; không truyền `options` thì body giữ nguyên như cũ (không phá caller hiện có).
- Create: dialog mời CLIENT (đặt cạnh `ClientTab.tsx`) — tái dùng bộ chọn user Halo mà luồng thêm thành viên hiện tại đang dùng (tự tìm nơi gọi `addMember`).
- Modify: `ClientTab.tsx` + test; hook mutation mới `useInviteClientContact(projectId)` (đặt trong file hook client hiện có `useClient.ts`).

**Hành vi:** đúng spec §3.3 — chỉ OWNER (`role === 'OWNER'` từ `useProjectRole`), invalidate query client + members sau thành công, map lỗi `CLIENT_CONTACT_ALREADY_LINKED` / `MEMBER_ALREADY_EXISTS` / `CLIENT_CONTACT_NOT_FOUND` sang message tiếng Việt ở spec.

**Tests:** `nên hiện nút mời cho contact chưa liên kết khi user là OWNER`; `nên ẩn nút mời khi user là ADMIN`; `nên hiện badge đã liên kết khi contact có userId`; `nên gửi addMember với role CLIENT và contactId khi chọn user`; `nên hiện thông báo và tải lại khi contact đã được liên kết` (BE trả `CLIENT_CONTACT_ALREADY_LINKED` → assert toast message + invalidate); test `tasks.api`: `nên giữ body cũ khi không truyền options`.

- [ ] Viết test → fail → cài đặt → pass
- [ ] tsc + eslint + vitest toàn bộ
- [ ] Commit: `feat(tasks): mời người liên hệ làm tài khoản khách hàng`

---

## Task 4: Evidence FILE — upload + hiển thị

**Files:**
- Modify: `src/features/tasks/types.ts` — `EvidenceType` thêm `'FILE'`; `CommitmentEvidence.file: CommitmentEvidenceFile | null` với `CommitmentEvidenceFile = { fileName: string; mimeType: string; fileSize: number; downloadUrl: string }`. Cập nhật mock của các test cũ đang dựng `CommitmentEvidence` (thêm `file: null`).
- Modify: `src/features/tasks/services/commitments.api.ts` — thêm `presignEvidence(commitmentId, { milestone, fileName, mimeType, fileSize }): Promise<{ evidenceId: string; uploadUrl: string }>` và `confirmEvidence(commitmentId, evidenceId): Promise<CommitmentEvidence>`.
- Create: `src/features/tasks/lib/evidence-upload.ts` — hằng `ALLOWED_EVIDENCE_MIME_TYPES` (copy BE), `MAX_EVIDENCE_FILE_BYTES = 100 * 1024 * 1024`, `validateEvidenceFile(file: File): string | null` (trả message lỗi tiếng Việt hoặc null), `formatFileSize(bytes: number): string`.
- Modify: `src/features/tasks/hooks/useCommitments.ts` — thêm `useUploadEvidenceFile(commitmentId)`: mutation chạy tuần tự presign → `fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })` (response không ok → throw, KHÔNG confirm) → confirm → invalidate detail.
- Modify: `CommitmentDetailModal.tsx` (+ test) — `AddEvidenceDialog` thêm loại "File"; danh sách evidence hiển thị FILE; `TransitionDialog` nhãn evidence FILE = tên file.

**Tests:**
- `evidence-upload`: `nên chấp nhận file pdf dưới 100 MB`; `nên từ chối file vượt 100 MB`; `nên từ chối text/html và image/svg+xml`; `formatFileSize` cho KB/MB.
- `useUploadEvidenceFile`: `nên gọi presign rồi PUT rồi confirm theo thứ tự`; `nên không gọi confirm khi PUT thất bại`; `nên PUT không kèm Authorization và đúng Content-Type`.
- `CommitmentDetailModal`: `nên tải file lên khi chọn loại File và bấm thêm`; `nên chặn và báo lỗi khi file sai định dạng mà không gọi API`; `nên giữ dialog mở và báo lỗi khi tải lên thất bại`; `nên hiện tên file, dung lượng và link tải cho bằng chứng FILE` (link có `target="_blank"` và `rel="noopener noreferrer"`); `nên hiện tên file trong danh sách chọn bằng chứng khi chuyển trạng thái`.

- [ ] Viết test → fail → cài đặt → pass
- [ ] tsc + eslint + vitest toàn bộ
- [ ] Commit: `feat(tasks): tải lên và hiển thị bằng chứng dạng file`

---

## Definition of Done (khớp spec §6)

- [ ] 4 commit; `npx tsc --noEmit`, `npx eslint src/features/tasks`, `npx vitest run` toàn bộ xanh.
- [ ] Mọi hành vi ở spec §3 có test tương ứng.
