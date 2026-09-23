> ✗ **ĐÃ HUỶ** — Commitment Graph bị gỡ theo quyết định 2026-09-24

# Thiết kế lại Commitment Graph thành "không gian cam kết" — Brief + Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc superpowers:executing-plans. Plan cố ý KHÔNG chép sẵn code — người thực thi tự đọc code hiện có, theo pattern lân cận, test trước (fail) rồi code (pass).

**Ngày:** 2026-09-24 · **Repo:** `task-service` (Task 1), `vibe-chat-fe` (Task 2–5)

## Đọc bắt buộc trước khi code UI (Task 2–5)

- `DESIGN.md`, `PRODUCT.md` ở gốc repo FE — nguồn chuẩn màu, typography, component; giữ nguyên thế giới hình ảnh hiện có (đây là tái cấu trúc, không đổi nhận diện).
- `/home/huytq/.claude-personal/plugins/cache/impeccable/impeccable/4.1.1/skills/impeccable/reference/craft-floor.md` — sàn chất lượng + điều cấm; tuân thủ toàn bộ.
- `/home/huytq/.claude-personal/plugins/cache/impeccable/impeccable/4.1.1/skills/impeccable/reference/operate.md` — màn hình dạng Operate (người dùng làm việc): quét nhanh, nhất quán, không trang trí thừa.
- Component UI có sẵn trong `src/components/ui/` — dùng lại, không tự chế component trùng.

## Brief (đã được user xác nhận)

**Vấn đề:** Commitment Graph hiện là 4 tab rời (Khách hàng / Scope / Cam kết / Yêu cầu thay đổi), danh sách + modal + dialog chồng dialog. Ba điểm đau user chọn: (1) không thấy tổng quan — không biết ngay cái gì rủi ro/sắp hạn/chờ khách; (2) chuyển trạng thái khó hiểu — không rõ bước tiếp, cần bằng chứng gì, vì sao bị chặn; (3) 4 tab rời rạc — khó thấy cam kết gắn hạng mục scope/CR nào.

**Người dùng:** PM (mở vài lần/ngày để xử lý và đẩy trạng thái) và khách hàng CLIENT (xem tiến độ, biết cái gì chờ họ nghiệm thu) — quan trọng ngang nhau. Chế độ Operate.

**Cấu trúc mới — một không gian làm việc, bỏ 4 tab:**
1. **Header:** tên khách hàng (bấm → popover người liên hệ, sửa/mời CLIENT dành cho người có quyền) + chuyển view: **Bảng** (mặc định) · **Danh sách** · **Phạm vi** · **Yêu cầu thay đổi** + nút tạo cam kết (chỉ `canManage`).
2. **Dải "Cần xử lý":** 4 ô bấm được — *Đang rủi ro*, *Sắp tới hạn*, *Chờ khách nghiệm thu* (DELIVERED), *Yêu cầu thay đổi chờ khách* (CR SENT). Bấm → lọc view hiện tại; bấm lần nữa → bỏ lọc. Số 0 hiển thị dịu, không cảnh báo.
3. **Bảng pipeline:** cột Kế hoạch → Đang làm → Sẵn sàng → Đã bàn giao → Đã nghiệm thu. `CHANGES_REQUESTED` hiển thị trong cột **Đã bàn giao** kèm cờ "Khách yêu cầu sửa" rõ ràng; `CANCELLED` ẩn, hiện khi bật bộ lọc "Hiện đã huỷ". Thẻ: tiêu đề (2 dòng tối đa), hạn chót (đỏ khi quá hạn), người phụ trách, chip rủi ro, huy hiệu phạm vi (trong/ngoài/chưa rõ), số CR, dấu các mốc đã có bằng chứng. Cột cuộn độc lập khi nhiều thẻ. Không kéo-thả để đổi trạng thái (trạng thái đi qua "Bước tiếp theo" có kiểm điều kiện).
4. **Panel chi tiết bên phải** (thay modal; trên mobile là trang/sheet toàn màn theo quy ước PRODUCT.md), giữ bảng phía sau:
   - Thanh tiến trình các bước bàn giao, đánh dấu bước hiện tại (và nhánh "khách yêu cầu sửa" nếu có).
   - **"Bước tiếp theo"**: câu mô tả bước kế + checklist điều kiện (vd "☐ Bằng chứng bàn giao — chưa có [Thêm]"; ACCEPTED cần bằng chứng nghiệm thu + tên người phía khách đồng ý) + nút chính (vd "Đánh dấu đã bàn giao") chỉ bật khi đủ điều kiện, luôn ghi lý do khi khoá. Hành động phụ (Huỷ cam kết, Khách yêu cầu sửa) ở menu phụ, không cạnh tranh nút chính.
   - Liên kết ngay trong panel: hạng mục scope, CR của cam kết (tạo CR từ đây), task, dòng thời gian bằng chứng theo mốc, tin nhắn nguồn. Sửa thông tin cam kết inline hoặc qua dialog có sẵn.
5. **View Phạm vi:** tài liệu scope + hạng mục; mỗi hạng mục hiện cam kết và CR gắn với nó (bấm → mở panel chi tiết cam kết).
6. **View Yêu cầu thay đổi:** danh sách CR (giữ hành vi hiện có), nhóm theo trạng thái, CR chờ khách lên đầu.
7. **CLIENT (`isClient`):** cùng không gian, chỉ đọc; ô "Chờ khách nghiệm thu" đổi nhãn thành *Chờ bạn nghiệm thu* và đứng đầu; "Bước tiếp theo" viết cho khách ("Hạng mục đã bàn giao — chờ bạn xác nhận với PM"), không có nút thao tác. MEMBER: đọc như hiện tại (không nút ghi).

**Trạng thái & phạm vi dữ liệu:** 10–60 cam kết/project điển hình; empty (chưa có cam kết → hướng dẫn tạo cho `canManage`, câu chờ cho CLIENT); loading skeleton theo layout thật; lỗi có nút thử lại; tiêu đề dài; contact đã xoá; không có scope/khách hàng.

**Không đổi:** API ghi hiện có, hook role `useProjectRole`, quyền (`canManage`/`isClient`), luồng evidence FILE, luồng mời CLIENT, định dạng dữ liệu. **Anti-goal:** không thêm kéo-thả, không đổi màu thương hiệu, không dashboard biểu đồ.

## Global Constraints

- Identifier tiếng Anh; chuỗi UI, message, comment business tiếng Việt; không dịch chuỗi có sẵn. Tên test tiếng Anh hoặc Việt đều được.
- Cấm `any`; Rules of Hooks; không optional-call trên mock.
- Không đọc/in `.env`.
- Mỗi task 1 commit mới (không amend), dòng cuối `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- FE: `npx tsc --noEmit`, `npx eslint src/features/tasks`, test liên quan; `npx vitest run` toàn bộ 1 lần cuối mỗi task, không chạy song song lệnh nặng.

## Review Focus

1. Điều kiện "Bước tiếp theo" lệch với luật transition của BE → nút bật nhưng BE trả 422 (Task 3: helper thuần mirror `task-service/src/modules/commitments/commitment-transition.rules.ts` + evidence milestone phải KHỚP ĐÚNG trạng thái đích, có test bảng từng cặp trạng thái).
2. Bấm ô tổng quan khi đang ở view Phạm vi/CR → lọc hợp lý hoặc chuyển về Bảng, không ra màn trống vô nghĩa (Task 2).
3. Số liệu tổng quan cũ sau khi chuyển trạng thái/ thêm bằng chứng → invalidate summary cùng lúc với list/detail (Task 2–3).
4. Mobile: panel chi tiết không bị bàn phím ảo che nút chính, Back đóng panel (Task 3).
5. CLIENT thấy nhãn/ câu chữ viết cho PM hoặc thấy nút thao tác (Task 5).

---

## Task 1: task-service — summary + lọc theo hạng mục scope

**Repo:** `/home/huytq/code/my/be/task-service`.
- `GET /api/v1/projects/:id/commitments/summary` (quyền đọc như list: `assertMember` không `write`) → `{ atRisk: number; dueSoon: number; awaitingAcceptance: number; changeRequestsAwaitingClient: number; byStatus: Record<DeliveryStatus, number> }`. `atRisk` = số cam kết (không huỷ/không nghiệm thu) có ít nhất 1 risk — dùng lại đúng logic risk hiện có (evaluator/SQL `buildRiskWhere`), `dueSoon` = có risk `DUE_SOON` (kiểm tên thật trong `enums/risk-code.enum.ts`), `awaitingAcceptance` = `deliveryStatus = DELIVERED`, `changeRequestsAwaitingClient` = CR `status = SENT` của project. Chỉ dùng count query, không tải toàn bộ bản ghi. Response DTO + Swagger. Route đặt trước `commitments/:id` nếu có xung đột path.
- `QueryCommitmentsDto` thêm `scopeItemId?: string`, repository lọc theo đó.
- Tests: service summary (các con số đúng với dữ liệu mock, CLIENT đọc được), filter `scopeItemId`; thêm route summary vào bảng đọc được của `test/client-read-only.e2e-spec.ts` nếu file có phần kiểm đọc (hoặc 1 test e2e đọc summary bằng CLIENT → 200). Kiểm tra: `npx jest`, `npx tsc --noEmit` (0 lỗi), eslint, e2e liên quan (nạp env bằng `set -a && . ./.env && set +a`).
- Commit: `feat(commitments): endpoint tổng quan và lọc theo hạng mục scope`

## Task 2: FE — khung không gian cam kết + dải tổng quan + bảng pipeline

**Files:** thay `src/features/tasks/components/commitments/CommitmentGraphView.tsx` bằng khung mới (tách file nhỏ trong cùng thư mục: header, overview strip, board, card); API/hook `commitmentsApi.getSummary` + `useCommitmentSummary`; mở rộng filter list cho `scopeItemId`.
- Header + chuyển view (Bảng/Danh sách/Phạm vi/Yêu cầu thay đổi) — view hiện chọn lưu trong `tasks-ui.store` (không dùng localStorage mới). Danh sách = tái dùng `CommitmentsTab` hiện có (chỉnh tối thiểu cho khớp khung); Phạm vi và Yêu cầu thay đổi tạm tái dùng `ScopeTab`/`ChangeRequestsTab` (Task 4 nâng cấp). Popover khách hàng tái dùng nội dung `ClientTab`.
- Dải "Cần xử lý" + bảng pipeline đúng brief §2–3; thẻ bấm → mở panel chi tiết (Task 2 tạm mở `CommitmentDetailModal` hiện có; Task 3 thay bằng panel).
- Tests: render 5 cột đúng thứ tự, thẻ vào đúng cột (CHANGES_REQUESTED vào cột Đã bàn giao có cờ, CANCELLED ẩn trừ khi bật lọc); ô tổng quan hiển thị số từ summary và bấm → lọc, bấm lại → bỏ lọc; view switch; empty/loading/error; nút tạo chỉ khi `canManage`.
- Commit: `feat(tasks): không gian cam kết với tổng quan và bảng pipeline`

## Task 3: FE — panel chi tiết + "Bước tiếp theo"

**Files:** panel mới thay `CommitmentDetailModal` (giữ lại các dialog con có sẵn: sửa, thêm bằng chứng, liên kết task — mở từ panel); helper thuần `src/features/tasks/lib/commitment-next-step.ts`.
- `getNextStep(commitment, evidence)` → `{ target: DeliveryStatus | null; label: string; requirements: Array<{ key; label; met: boolean; actionLabel? }>; blockedReason: string | null; secondary: DeliveryStatus[] }` — mirror luật BE (xem Review Focus 1); không tự bịa luật.
- Panel: thanh tiến trình, khối Bước tiếp theo (nút chính gọi transition hiện có; ACCEPTED hỏi tên người phía khách; huỷ/yêu cầu sửa hỏi lý do), liên kết scope/CR (tạo CR từ panel, CR filter theo `commitmentId`), task, dòng thời gian bằng chứng theo mốc, nguồn. Mobile: sheet/trang toàn màn, Back đóng.
- Tests: bảng test `getNextStep` cho mọi trạng thái (có/không bằng chứng đúng mốc, bằng chứng sai mốc không tính); panel: nút chính khoá + lý do khi thiếu bằng chứng, bật khi đủ; bấm → gọi transition đúng payload; invalidate detail + list + summary sau thành công.
- Commit: `feat(tasks): panel chi tiết cam kết với bước tiếp theo rõ ràng`

## Task 4: FE — view Phạm vi & Yêu cầu thay đổi liên kết

- Phạm vi: mỗi hạng mục hiện cam kết gắn (list filter `scopeItemId`, gọi khi mở hạng mục hoặc gộp theo nhu cầu, không N+1 không giới hạn) + CR gắn; bấm cam kết → mở panel chi tiết.
- Yêu cầu thay đổi: nhóm theo trạng thái, SENT lên đầu; bấm CR có cam kết → mở được panel cam kết liên quan.
- Tests tương ứng. Commit: `feat(tasks): liên kết phạm vi và yêu cầu thay đổi với cam kết`

## Task 5: FE — chế độ CLIENT + trạng thái rỗng/lỗi + dọn code cũ

- CLIENT/MEMBER đúng brief §7; câu chữ cho khách; không nút thao tác.
- Empty/loading/error hoàn chỉnh mọi view.
- Xoá code/tab cũ không còn dùng (4 tab), cập nhật test cũ theo cấu trúc mới (không xoá test hành vi còn giá trị — chuyển sang component mới).
- Tests: CLIENT thấy "Chờ bạn nghiệm thu" đứng đầu, không nút; MEMBER không nút ghi; empty state theo quyền.
- Commit: `feat(tasks): chế độ khách hàng và hoàn thiện trạng thái cho không gian cam kết`
