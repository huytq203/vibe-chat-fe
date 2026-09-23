# S1.1c — FE: UX cho role CLIENT + evidence FILE

**Ngày:** 2026-09-23
**Repo:** `vibe-chat-fe`
**Phụ thuộc BE (đã xong, task-service):** S1.1a (role CLIENT, `POST projects/:id/members { userId, role, contactId }`), S1.1b (`POST commitments/:id/evidence/presign`, `POST commitments/:id/evidence/:evidenceId/confirm`, evidence `file`).

## 1. Mục tiêu

- Khách hàng (role `CLIENT`) mở project chỉ thấy **Commitment Graph** ở chế độ chỉ xem.
- OWNER mời một người liên hệ phía khách thành tài khoản CLIENT.
- PM (OWNER/ADMIN) tải file bằng chứng lên cam kết; mọi người trong project (kể cả CLIENT) tải file về được.

## 2. Quyết định đã chốt

| # | Quyết định |
|---|---|
| Q1 | CLIENT chỉ thấy Commitment Graph; board/list và mọi lối vào cài đặt/chia sẻ/thành viên project bị ẩn. Không làm chế độ chỉ xem cho board/task. |
| Q2 | Có 1 hook trung tâm `useProjectRole(projectId)` → `{ role: ProjectRole \| null; isClient: boolean; canManage: boolean; isLoading: boolean }`, `canManage` = OWNER hoặc ADMIN. Nguồn: danh sách member của project (query có sẵn) + user hiện tại. |
| Q3 | Trong 4 tab Commitment Graph, mọi nút ghi hiện theo `canManage` (không theo `isClient`) — BE chỉ cho OWNER/ADMIN ghi commitment/CR/scope/client, nên MEMBER cũng không nên thấy nút ghi. |
| Q4 | Mời CLIENT: chỉ OWNER; thao tác trên từng contact chưa liên kết tài khoản trong `ClientTab`; tái dùng bộ chọn user Halo đang dùng để thêm thành viên. |
| Q5 | Upload evidence FILE: presign → `PUT` file thẳng lên `uploadUrl` (header `Content-Type` = MIME đã khai báo) → confirm. Giới hạn MIME + 100 MB kiểm ở FE trước khi presign, khớp BE. |

## 3. Hành vi chi tiết

### 3.1 Chế độ CLIENT (`isClient`)

- Trang project render thẳng `CommitmentGraphView`; không hiện nút chuyển board/list, không hiện tab/menu cài đặt, chia sẻ, thành viên của project.
- Nếu store UI đang ở `boardView` khác `'commitments'` (ví dụ nhớ từ phiên trước), CLIENT vẫn chỉ thấy Commitment Graph.
- Trong lúc `useProjectRole` đang tải: hiện skeleton, không render board rồi mới chuyển (tránh nháy lộ board cho CLIENT).

### 3.2 Nút ghi trong Commitment Graph (`!canManage` → ẩn)

- `ClientTab`: sửa tên khách hàng, thêm/sửa/xoá contact, mời CLIENT.
- `ScopeTab`: sửa tài liệu scope, thêm/sửa/xoá hạng mục.
- `CommitmentsTab` + `CommitmentDetailModal`: tạo, sửa, chuyển trạng thái, thêm bằng chứng, liên kết/gỡ task, gỡ nguồn tham chiếu.
- `ChangeRequestsTab` + `ChangeRequestDetailModal`: tạo, sửa, chuyển trạng thái, gỡ nguồn tham chiếu.
- Nút xem nội dung nguồn tham chiếu vẫn hiện cho mọi người; lỗi trả về (CLIENT không ở trong cuộc chat) hiển thị toast tiếng Việt thân thiện, không crash modal.

### 3.3 Mời contact làm CLIENT (`ClientTab`, chỉ OWNER)

- Contact có `userId = null` và chưa xoá: nút "Mời làm khách hàng".
- Mở dialog chọn user Halo → gửi `POST /projects/:projectId/members` body `{ userId, role: 'CLIENT', contactId }`.
- Thành công: toast, invalidate query client + members; contact hiện badge "Đã liên kết tài khoản".
- Lỗi BE ánh xạ sang message tiếng Việt: `CLIENT_CONTACT_ALREADY_LINKED` ("Người liên hệ đã được gắn với tài khoản khác"), `MEMBER_ALREADY_EXISTS` ("Người dùng đã là thành viên project"), `CLIENT_CONTACT_NOT_FOUND`.
- Contact có `userId`: badge "Đã liên kết tài khoản", không có nút mời.

### 3.4 Evidence FILE (`CommitmentDetailModal`)

- Types: `EvidenceType = 'URL' | 'NOTE' | 'FILE'`; `CommitmentEvidence.file: { fileName; mimeType; fileSize; downloadUrl } | null`.
- `AddEvidenceDialog`: thêm lựa chọn loại "File" → input chọn file; kiểm MIME (cùng whitelist BE) và ≤ 100 MB trước khi gửi; nút gửi có trạng thái đang tải; lỗi ở bước nào cũng toast và giữ dialog mở.
- Luồng: `presign(commitmentId, { milestone, fileName, mimeType, fileSize })` → `fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mimeType } })` (không qua `taskClient`, không gắn Authorization) → `confirm(commitmentId, evidenceId)` → invalidate detail.
- Danh sách evidence: FILE hiện tên file, dung lượng dễ đọc (KB/MB), link "Tải xuống" mở `downloadUrl` tab mới (`rel="noopener noreferrer"`).
- Hộp chọn evidence trong `TransitionDialog` nhận cả FILE (lọc theo `milestone === to` như hiện tại), nhãn hiện tên file.

## 4. Ngoài phạm vi

- Chế độ chỉ xem cho board/task (Q1 — CLIENT không vào board).
- Huỷ liên kết CLIENT / đổi role (BE chưa có endpoint).
- Xoá evidence (BE chưa có endpoint).
- Cho CLIENT đọc được nội dung tin nhắn nguồn (cần thay đổi quyền ở vibe-chat).

## 5. Testing (Vitest + Testing Library)

- `useProjectRole`: OWNER/ADMIN → `canManage`; CLIENT → `isClient`, `!canManage`; không phải member → `role: null`.
- Trang project: CLIENT chỉ render Commitment Graph, không có nút board/list; OWNER thấy đủ.
- Mỗi tab: nút ghi ẩn khi `!canManage`, hiện khi `canManage`.
- `ClientTab`: mời CLIENT gửi đúng body; badge khi đã liên kết; map lỗi `CLIENT_CONTACT_ALREADY_LINKED`.
- `AddEvidenceDialog` FILE: gọi presign → PUT → confirm đúng thứ tự; chặn file sai MIME / quá 100 MB mà không gọi API; PUT lỗi thì không gọi confirm.
- Evidence list: FILE hiện tên + link tải.

## 6. Definition of Done

- [ ] `npx tsc --noEmit`, `npx eslint` sạch; `npx vitest run` toàn bộ xanh.
- [ ] Identifier tiếng Anh, chuỗi UI + tên test tiếng Việt.
