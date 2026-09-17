# Định hướng tổng — Halo Client Delivery OS cho team 5–50 người

> Trạng thái: tài liệu định hướng sản phẩm và kiến trúc, chưa phải đặc tả triển khai.
>
> Phạm vi: agency/software house sử dụng tiếng Việt, cần quản lý cam kết với khách hàng
> từ yêu cầu, phạm vi, công việc, bàn giao đến nghiệm thu mà không biến AI thành điểm lỗi
> hoặc nguồn chi phí mất kiểm soát.

## 1. Tóm tắt quyết định

Halo nên phát triển theo hướng **Client Delivery OS có AI phân tích nghiệp vụ**, không phải
một chatbot được cấp toàn bộ dữ liệu của công ty và cũng không phải một bộ ứng dụng
“có mọi tính năng”.

Lời hứa sản phẩm đề xuất:

> Halo giúp agency không thất lạc cam kết với khách hàng, không nhận thêm việc ngoài phạm vi
> một cách vô thức và chứng minh được từng hạng mục đã bàn giao đến đâu.

Thông điệp bán hàng ngắn nhất:

> **Không thất lạc cam kết. Không làm thêm miễn phí.**

Các quyết định nền tảng:

1. Core chat, task, notes và call phải hoạt động độc lập với AI.
2. AI mặc định chạy khi người dùng yêu cầu; tự động hóa nền chỉ bổ sung sau khi đã đo được giá trị.
3. Không gửi toàn bộ workspace hoặc project history vào mỗi prompt.
4. Dữ liệu có cấu trúc và tool/API là nguồn sự thật; LLM chủ yếu hiểu ngôn ngữ và diễn đạt.
5. Context được truy xuất theo ý định, có giới hạn token và quyền truy cập.
6. Xử lý nền dùng queue, retry và eventual consistency; không chặn thao tác chính.
7. Mọi hành động ghi dữ liệu của AI phải có preview, xác nhận và audit trail.

### 1.1. Halo đặc biệt ở đâu?

`Chat → Task` là tính năng phổ biến và không đủ tạo lợi thế. Điểm khác biệt của Halo là
**phân tích điều gì đang thực sự xảy ra trong quan hệ giao hàng với khách hàng**.

Khi người dùng chọn một đoạn hội thoại và bấm `Phân tích và xử lý`, Halo phải phân biệt được:

- Đây là task nằm trong phạm vi đã duyệt.
- Đây là yêu cầu thay đổi phạm vi và có thể cần tính thêm phí.
- Đây là một cam kết về deadline nhưng chưa có task bảo đảm.
- Đây là quyết định cần lưu lại, không phải task.
- Đây là blocker đang chờ khách hàng.
- Đây là yêu cầu mơ hồ, cần hỏi lại trước khi nhận việc.

Ba năng lực tạo bản sắc sản phẩm:

1. **Commitment Tracker:** theo dõi team đã hứa gì, với ai, hạn nào và lời hứa đó đã được
   bảo đảm bởi task hay chưa.
2. **Scope Guardian:** so sánh yêu cầu mới với phạm vi đã duyệt, cảnh báo scope creep và
   hỗ trợ tạo Change Request thay vì âm thầm nhận thêm việc.
3. **Verified Delivery:** liên kết yêu cầu với task, sản phẩm bàn giao và nghiệm thu để báo
   cáo chỉ nói “hoàn thành” khi có bằng chứng.

### 1.2. Đối tượng trung tâm là Cam kết, không phải Task

Task chỉ mô tả việc team cần làm. `Commitment` mô tả điều team đã hứa với khách hàng và
theo dõi toàn bộ vòng đời kinh doanh của lời hứa đó.

```text
Yêu cầu khách hàng
    ↓
Cam kết / thay đổi phạm vi / câu hỏi cần làm rõ
    ↓
Task và người chịu trách nhiệm
    ↓
Sản phẩm bàn giao: PR / thiết kế / tài liệu / staging
    ↓
Gửi khách hàng
    ↓
Khách hàng nghiệm thu
```

Một cam kết phải trả lời được:

- Ai yêu cầu và yêu cầu qua tin nhắn nào?
- Team đã đồng ý làm gì và khi nào?
- Yêu cầu có thuộc phạm vi hiện tại không?
- Ai chịu trách nhiệm và task nào bảo đảm lời hứa?
- Đã code/test/deploy/bàn giao đến bước nào?
- Khách hàng đã nghiệm thu chưa?
- Có phát sinh chi phí hoặc ảnh hưởng timeline không?

### 1.3. Ví dụ thể hiện sự khác biệt

Khách hàng nhắn:

> Thêm đăng nhập Google giúp anh nhé, nhưng vẫn giữ lịch bàn giao thứ Sáu.

Workspace thông thường tạo một task: `Thêm đăng nhập Google — hạn thứ Sáu`.

Halo phải trả về bản phân tích:

```text
Loại: Yêu cầu thay đổi phạm vi
Kết luận: Chưa tìm thấy đăng nhập Google trong scope đã duyệt
Ảnh hưởng: Backend OAuth + giao diện + cấu hình Google Cloud + test
Rủi ro: Khó giữ lịch bàn giao thứ Sáu với nguồn lực hiện tại

Phương án:
1. Tạo Change Request và điều chỉnh timeline
2. Giữ deadline, đưa đăng nhập Google sang phase 2
3. Thay thế một hạng mục khác trong scope
4. PM xác nhận yêu cầu này thực tế đã thuộc scope
```

AI không quyết định thay PM. AI chịu trách nhiệm **hiểu và tư vấn**; con người chịu trách
nhiệm **quyết định**; hệ thống chịu trách nhiệm **thực thi và lưu bằng chứng**.

### 1.4. So sánh nhanh

| Workspace thông thường | Halo định hướng |
|---|---|
| Tạo task từ message | Phân loại task, decision, blocker, yêu cầu mơ hồ hoặc scope change |
| Quản lý task | Quản lý cam kết với khách hàng |
| Task chuyển sang Done | Theo dõi code → test → deploy → bàn giao → nghiệm thu |
| AI summary | Phân tích tác động và đề xuất phương án xử lý |
| Báo cáo do AI viết | Báo cáo có source và bằng chứng bàn giao |
| Một context chung | Tách dữ liệu nội bộ và dữ liệu được phép gửi khách hàng |

Điểm khác biệt không nằm ở model AI. Lợi thế tích lũy nằm ở `Commitment Graph`: dữ liệu
liên kết yêu cầu → scope → quyết định → task → deliverable → nghiệm thu, cùng workflow
chuyên biệt cho agency/software house.

---

## 2. Người dùng và vấn đề cần giải quyết

### 2.1. Nhóm người dùng đầu tiên

- Team agency hoặc phát triển phần mềm có 5–50 người.
- Có nhiều trao đổi nằm trong chat nhưng quản lý công việc ở nơi khác hoặc cập nhật không đều.
- Trưởng nhóm phải tự đọc lại hội thoại để biết tiến độ, blocker và thay đổi phạm vi.
- Nhân viên phải chuyển qua lại giữa chat, task, notes và báo cáo.
- Báo cáo tuần thường được viết thủ công, thiếu nguồn hoặc khác dữ liệu thực tế.

### 2.2. Các vấn đề cốt lõi

1. **Cam kết bị thất lạc:** team hứa với khách hàng nhưng không có task/người chịu trách nhiệm.
2. **Scope creep:** yêu cầu mới âm thầm trở thành task dù nằm ngoài phạm vi hoặc ảnh hưởng deadline.
3. **Không chứng minh được bàn giao:** task `Done` chưa có nghĩa đã deploy, gửi và được nghiệm thu.
4. **Mất ngữ cảnh:** task tồn tại nhưng không biết yêu cầu bắt nguồn từ đâu hoặc vì sao có quyết định đó.
5. **Báo cáo tốn công:** PM phải ghép task, tin nhắn, meeting note và trí nhớ cá nhân.

### 2.3. Điều Halo không cố giải quyết ở giai đoạn đầu

- Thay thế Slack, Teams, Lark hoặc ClickUp ở mọi phân khúc.
- Tự động đọc và hiểu chính xác 100% mọi tin nhắn.
- Tự vận hành dự án không cần con người xác nhận.
- Trở thành ERP, CRM, HRM hoặc hệ thống kế toán đầy đủ.
- Dùng AI để tính toán số liệu mà backend có thể truy vấn chính xác.

---

## 3. Vòng giá trị chính

```text
Yêu cầu/cam kết trong chat hoặc cuộc họp
        ↓
Người dùng chọn nội dung và bấm Phân tích và xử lý
        ↓
AI phân loại: in-scope / scope change / decision / blocker / chưa rõ
        ↓
AI phân tích tác động và đưa ra phương án
        ↓
PM xem trước và quyết định
        ↓
Tạo Commitment / Change Request / Task / Decision kèm nguồn
        ↓
Theo dõi thực thi → bàn giao → nghiệm thu
        ↓
Báo cáo có bằng chứng; PM duyệt và chia sẻ
```

Đơn vị giá trị không phải “một câu trả lời AI”, mà là **một vòng công việc được khép kín**:

- Yêu cầu có nguồn.
- Có người chịu trách nhiệm.
- Có trạng thái và deadline.
- Có quyết định liên quan.
- Có thể tổng hợp thành báo cáo có dẫn chứng.

---

## 4. Các luồng nghiệp vụ ưu tiên

### 4.1. Phân tích và xử lý nội dung hội thoại

1. Người dùng mở menu của một tin nhắn hoặc chọn một chuỗi tin nhắn.
2. Chọn `Phân tích và xử lý`.
3. Halo chỉ gửi nội dung được chọn cùng project/member context cần thiết.
4. AI phân loại thành task, scope change, decision, blocker hoặc yêu cầu chưa rõ.
5. AI so sánh với scope/commitment/task hiện có và phân tích ảnh hưởng.
6. Halo đưa ra các phương án phù hợp, không mặc định tạo task.
7. PM chọn phương án, chỉnh sửa và xác nhận.
8. Commitment, Change Request, task hoặc decision được tạo kèm `sourceMessageIds`.

Không tự tạo task chỉ vì model đoán một câu có vẻ là yêu cầu. Với yêu cầu mơ hồ, Halo
nên soạn câu hỏi làm rõ trước khi cho phép biến nó thành cam kết chính thức.

### 4.2. Theo dõi cam kết

Halo cần có một danh sách cam kết độc lập với danh sách task, ưu tiên các trường hợp:

- Cam kết chưa có task bảo đảm.
- Có deadline nhưng chưa có owner hoặc estimate.
- Sắp đến hạn nhưng không có activity gần đây.
- Đã hoàn thành nội bộ nhưng chưa gửi khách hàng.
- Đã gửi nhưng chưa được nghiệm thu.
- Đang chờ thông tin hoặc phê duyệt từ khách hàng.

Daily Brief nên tập trung vào cam kết có nguy cơ vỡ, không chỉ liệt kê task quá hạn.

### 4.3. Scope Guardian và Change Request

1. PM nhập hoặc chuẩn hóa scope/deliverable đã được duyệt của project.
2. Khi phân tích yêu cầu, Halo retrieval đúng phần scope liên quan.
3. AI trả về `IN_SCOPE`, `UNCLEAR` hoặc `OUT_OF_SCOPE` cùng nguồn so sánh.
4. Nếu ngoài scope, Halo tạo bản nháp Change Request gồm tác động, estimate, chi phí và timeline.
5. PM duyệt nội bộ trước khi gửi khách hàng.
6. Chỉ sau khi khách hàng/PM chấp thuận, task thực thi mới được tạo hoặc kích hoạt.

### 4.4. Verified Delivery

Mỗi Commitment hiển thị các mốc độc lập:

```text
Đã lên kế hoạch  →  Đã thực hiện  →  Đã test  →  Đã deploy
        →  Đã bàn giao  →  Đã nghiệm thu
```

Task `Done` không tự động đồng nghĩa với Commitment `Accepted`. Báo cáo khách hàng phải
phân biệt các trạng thái này và liên kết bằng chứng tương ứng.

### 4.5. Ghi nhận quyết định

1. Người dùng chọn đoạn trao đổi đã chốt phương án.
2. Chọn `Lưu thành quyết định`.
3. AI tạo bản nháp gồm quyết định, lý do, người tham gia và phương án bị loại.
4. Người dùng xác nhận.
5. Decision được lưu như một entity riêng, có nguồn và task liên quan.

### 4.6. Lưu kiến thức vào notes

1. Người dùng chọn nội dung có giá trị dùng lại.
2. AI chuyển nội dung thành note có cấu trúc.
3. Người dùng chọn trang đích hoặc tạo trang mới.
4. Note lưu liên kết về message, task và decision nguồn.

### 4.7. Hỏi đáp trong project

AI Panel xác định ý định rồi chỉ gọi tool cần thiết:

| Câu hỏi | Nguồn context chính |
|---|---|
| Task nào của tôi quá hạn? | `my_tasks` |
| Project đang tiến triển thế nào? | `project_stats` và task rủi ro |
| Vì sao team chọn phương án này? | Decision search và message nguồn |
| Khách hàng nói gì về checkout? | Semantic search trong hội thoại liên quan |
| Viết báo cáo tuần | Task/activity theo kỳ, decision, risk và message đã chọn |

### 4.8. Báo cáo tuần

1. Backend dựng dataset có cấu trúc theo kỳ báo cáo.
2. Dataset gồm completed/open/overdue tasks, activity, decisions và risks đã xác nhận.
3. Retrieval bổ sung một số message hoặc note liên quan nếu cần.
4. LLM viết bản nháp báo cáo, không tự đếm hoặc suy đoán số liệu.
5. PM sửa, duyệt và chọn bản nội bộ hoặc bản gửi khách hàng.
6. Báo cáo lưu snapshot cùng liên kết nguồn để có thể kiểm tra lại.

---

## 5. Chiến lược context và chi phí AI

### 5.1. Nguyên tắc “đúng context, không phải nhiều context”

Mỗi request có một ngân sách context rõ ràng. Context được ghép từ bốn lớp:

```text
System policy nhỏ và ổn định
+ Intent/user request hiện tại
+ Dữ liệu có cấu trúc lấy bằng tool
+ Top-K đoạn chat/note liên quan nếu thực sự cần
```

Không mặc định đưa vào prompt:

- Toàn bộ lịch sử channel.
- Toàn bộ project notes.
- Toàn bộ task hoặc activity.
- Các cuộc hội thoại AI cũ không liên quan.
- Dữ liệu mà người dùng hiện tại không có quyền xem.

### 5.2. Bốn tầng xử lý

#### Tầng 0 — Không dùng model

- Tìm theo ID/tên chính xác.
- Lấy task, stats, activity và member bằng API.
- Phát hiện mention, URL, deadline có cấu trúc.
- Thực thi thao tác sau khi người dùng xác nhận.

#### Tầng 1 — Rule hoặc classifier rẻ

- Loại tin xã giao và nội dung không actionable.
- Nhận biết candidate task, decision, risk hoặc question.
- Không tạo dữ liệu nghiệp vụ ở tầng này.

#### Tầng 2 — Project memory tăng dần

- Chỉ xử lý phần dữ liệu mới kể từ checkpoint.
- Cập nhật summary, active goals, decisions, risks và open questions.
- Chạy theo batch hoặc khi channel yên lặng; không chạy cho từng message.

#### Tầng 3 — Model mạnh theo yêu cầu

- Tổng hợp nhiều nguồn.
- Tạo report hoặc meeting summary.
- Phân tích rủi ro và thay đổi phạm vi.
- Chuẩn hóa yêu cầu phức tạp thành task/note/decision.

### 5.3. Retrieval theo ý định

```text
User prompt
   ↓
Intent router
   ├─ structured intent → gọi tool/API trực tiếp
   ├─ knowledge intent  → semantic search top-K
   ├─ action intent     → dựng preview + yêu cầu xác nhận
   └─ report intent     → report dataset builder
   ↓
Context builder áp budget và permission
   ↓
LLM
```

Gợi ý giới hạn ban đầu, cần đo lại bằng telemetry thực tế:

- Lịch sử hội thoại gần nhất: chỉ lấy vài lượt cần thiết.
- Semantic search: khoảng 5–15 đoạn có điểm phù hợp cao.
- Structured result: chỉ giữ field có ích cho câu hỏi.
- Tool output lớn: tóm gọn bằng code trước khi đưa vào prompt.
- Report: chia theo kỳ và project, không chạy toàn workspace.

### 5.4. Project memory khái niệm

```ts
type ProjectMemory = {
  projectId: string;
  summary: string;
  activeGoals: string[];
  confirmedDecisionIds: string[];
  activeRiskIds: string[];
  openQuestionIds: string[];
  lastProcessedMessageId?: string;
  version: number;
  updatedAt: string;
};
```

Memory là chỉ mục/tóm tắt để retrieval nhanh hơn, không thay thế dữ liệu nguồn. Mỗi fact quan trọng
phải có source ID để truy ngược và phải có cơ chế rebuild khi sai hoặc thay đổi schema.

---

## 6. Kiến trúc hoạt động và độ sẵn sàng

### 6.1. AI không nằm trên critical path

```text
Client gửi message
    ↓
Chat service lưu message thành công
    ↓
Phát domain event
    ↓
AI job queue nhận event bất đồng bộ
    ↓
Worker lọc, batch hoặc cập nhật project memory
    ↓
Lưu suggestion; client nhận notification/realtime event
```

Khi AI service lỗi:

- Chat vẫn gửi và nhận bình thường.
- Task, notes và call vẫn hoạt động.
- Job giữ trong queue và retry sau.
- Người dùng vẫn có thể tạo task/note thủ công.
- UI hiển thị trạng thái `AI đang tạm gián đoạn`, không chặn màn hình.

### 6.2. Yêu cầu cho job nền

- Có `idempotencyKey` để tránh tạo suggestion trùng.
- Có timeout và retry với exponential backoff.
- Có trạng thái `PENDING`, `PROCESSING`, `DONE`, `FAILED`.
- Có dead-letter queue hoặc trang theo dõi job lỗi.
- Có checkpoint `lastProcessedMessageId` hoặc sequence number.
- Có per-workspace rate limit và budget.
- Không retry vô hạn lỗi permission hoặc validation.

### 6.3. Không tự động ghi dữ liệu từ background worker

Worker nền chỉ nên tạo `suggestion`. Việc tạo/cập nhật task, decision hoặc note diễn ra sau
khi người có quyền xác nhận, trừ các workflow được workspace admin cấu hình rõ ràng.

---

## 7. Mô hình dữ liệu liên kết

Các entity cần giữ nguồn và quan hệ, không chỉ chứa text AI sinh ra.

```ts
type Commitment = {
  id: string;
  projectId: string;
  title: string;
  requestedBy?: string;
  ownerId?: string;
  promisedAt?: string;
  dueAt?: string;
  scopeStatus: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
  deliveryStatus:
    | 'PLANNED'
    | 'IN_PROGRESS'
    | 'TESTED'
    | 'DEPLOYED'
    | 'DELIVERED'
    | 'ACCEPTED';
  relatedTaskIds: string[];
  sourceRefs: SourceReference[];
};

type SourceReference = {
  type: 'CHAT_MESSAGE' | 'MEETING' | 'NOTE' | 'AI' | 'MANUAL';
  conversationId?: string;
  messageIds?: string[];
  meetingId?: string;
  noteId?: string;
  createdByUserId: string;
};

type Decision = {
  id: string;
  projectId: string;
  title: string;
  reason?: string;
  decidedBy: string[];
  decidedAt: string;
  sourceRefs: SourceReference[];
  relatedTaskIds: string[];
  status: 'ACTIVE' | 'REPLACED';
};

type AiSuggestion = {
  id: string;
  workspaceId: string;
  projectId?: string;
  type: 'TASK' | 'DECISION' | 'NOTE' | 'RISK';
  payload: Record<string, unknown>;
  sourceRefs: SourceReference[];
  confidence?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'EXPIRED';
  createdAt: string;
};
```

Yêu cầu bất biến:

- Task do AI đề xuất phải truy được về nguồn.
- Decision có lịch sử thay thế, không sửa mất dấu quyết định cũ.
- Report lưu snapshot; thay đổi task sau đó không được âm thầm sửa báo cáo đã duyệt.
- Xóa nguồn phải có chính sách rõ ràng cho index, embedding và report liên quan.

---

## 8. Quyền, an toàn và khả năng kiểm tra

### 8.1. Ba mức hành động

| Mức | Ví dụ | Cơ chế |
|---|---|---|
| Tự động đọc | Search, stats, tóm tắt dữ liệu người dùng được phép xem | Không cần xác nhận |
| Có xác nhận | Tạo task, đổi deadline, lưu decision/note, gửi report | Preview trước khi chạy |
| Quyền quản lý | Xóa project, đổi thành viên/quyền, gửi dữ liệu ra ngoài | Admin/manager permission |

### 8.2. Audit trail tối thiểu

Mỗi hành động ghi do AI hỗ trợ cần lưu:

- Ai yêu cầu.
- Model/tool nào đề xuất.
- Người nào xác nhận.
- Dữ liệu nào đã thay đổi.
- Source references.
- Thời điểm và request/job ID.
- Kết quả thành công hoặc thất bại.

### 8.3. Phân quyền context

- Retrieval phải lọc quyền trước khi ranking và dựng prompt.
- Không đưa private DM vào project report nếu người tạo report không có quyền.
- AI không được suy ra hoặc tiết lộ nội dung từ document bị hạn chế.
- Cache/memory phải phân tách theo workspace, user và permission version khi cần.

---

## 9. Trải nghiệm sản phẩm đề xuất

### 9.1. Chat message menu

- Phân tích và xử lý.
- Đánh dấu là cam kết.
- Liên kết với task hiện có.
- Lưu thành quyết định.
- Thêm vào notes.
- Hỏi AI về đoạn này.

Kết quả của `Phân tích và xử lý` có thể là Task, Change Request, Decision, Blocker hoặc
câu hỏi làm rõ. Không mặc định mọi tin nhắn được chọn đều trở thành task.

### 9.2. Commitment detail

- Khách hàng/người đã đưa ra yêu cầu và message nguồn.
- Trạng thái scope: trong phạm vi, chưa rõ hoặc ngoài phạm vi.
- Deadline đã hứa, owner và các task bảo đảm cam kết.
- Tác động timeline/chi phí và Change Request liên quan.
- Trạng thái thực hiện, test, deploy, bàn giao và nghiệm thu.
- Bằng chứng tương ứng với từng mốc.

### 9.3. Task detail

- Nguồn yêu cầu.
- Tin nhắn/meeting liên quan.
- Decision và note liên quan.
- AI tóm tắt tiến độ từ activity thực tế.
- Blocker đã xác nhận.

### 9.4. AI Panel

- Hiển thị rõ context hiện tại: workspace/project/page.
- Cho người dùng bỏ hoặc đổi context.
- Phân biệt câu trả lời đọc dữ liệu với hành động ghi dữ liệu.
- Hành động ghi luôn có preview và nút xác nhận.
- Câu trả lời quan trọng có source links.

### 9.5. Report review

- Chế độ nội bộ và chế độ khách hàng.
- Mỗi section có thể mở nguồn.
- Có cảnh báo dữ liệu thiếu hoặc chưa xác nhận.
- Người duyệt có thể sửa trước khi publish.
- Lưu phiên bản đã duyệt và người duyệt.

---

## 10. Lộ trình đề xuất

### Giai đoạn 0 — Đo baseline

- Xác định một nhóm dùng thử 5–15 người.
- Đo số yêu cầu công việc phát sinh trong chat mỗi tuần.
- Đo thời gian PM viết báo cáo hiện tại.
- Ghi nhận các loại câu hỏi người dùng hỏi AI nhiều nhất.

Không xây auto-scanning trước khi có baseline.

### Giai đoạn 1 — Vòng giá trị thủ công

Mục tiêu: chứng minh người dùng muốn quản lý cam kết, không chỉ tạo task nhanh hơn.

- `Phân tích và xử lý` một/nhiều message được chọn.
- Phân loại task, decision, blocker, yêu cầu mơ hồ và scope change.
- Tạo Commitment kèm source references và deep link về chat.
- Task được tạo dưới Commitment sau khi PM xác nhận.
- Danh sách cam kết chưa có task, sắp trễ hoặc chưa nghiệm thu.
- AI Panel trả lời từ task tools hiện có.
- Report tuần từ Commitment/task/activity data.
- PM duyệt report trước khi chia sẻ.

Tiêu chí hoàn thành:

- Luồng không yêu cầu AI chạy nền 24/7.
- AI lỗi không ảnh hưởng chat/task.
- Không tạo task trùng khi retry.
- Report có thể kiểm tra về nguồn.

### Giai đoạn 2 — Decision và project memory

- Decision entity và Decision Log.
- Lưu note từ message/meeting.
- Semantic search có permission filtering.
- Project memory incremental có checkpoint và rebuild.
- Daily brief theo yêu cầu người dùng.

### Giai đoạn 3 — Gợi ý nền có kiểm soát

- Rule/classifier lọc candidate messages.
- Batch/debounce thay vì một request mỗi message.
- Suggestion inbox thay vì tự ghi dữ liệu.
- Workspace budget, rate limit và observability.
- Cho admin bật/tắt từng loại suggestion.

### Giai đoạn 4 — Tự động hóa chọn lọc

Chỉ triển khai nếu số liệu cho thấy suggestion chính xác và được chấp nhận đủ cao.

- Workflow cụ thể do admin cấu hình.
- Auto-create chỉ với loại dữ liệu ít rủi ro.
- Rollback và audit đầy đủ.
- Không bật mặc định cho mọi workspace.

---

## 11. Chỉ số cần đo

### 11.1. Giá trị sản phẩm

- Tỷ lệ team phân tích ít nhất một yêu cầu khách hàng trong tuần.
- Số Commitment được tạo và có task/owner bảo đảm.
- Số yêu cầu ngoài scope được phát hiện trước khi team bắt đầu làm.
- Giá trị hoặc số giờ Change Request được khách hàng chấp thuận.
- Tỷ lệ cam kết được bàn giao đúng hạn và được nghiệm thu.
- Thời gian từ yêu cầu trong chat đến quyết định xử lý được xác nhận.
- Thời gian PM dùng để tạo và duyệt báo cáo tuần.
- Tỷ lệ report được dùng/chia sẻ sau khi AI tạo bản nháp.
- Retention D7/D30 ở cấp workspace, không chỉ user cá nhân.

### 11.2. Chất lượng AI

- Suggestion acceptance rate theo từng loại.
- Tỷ lệ người dùng sửa title/assignee/deadline trước khi xác nhận.
- Tỷ lệ task trùng hoặc suggestion bị dismiss.
- Retrieval source precision: source được mở/có ích hay không.
- Tool success/error/timeout rate.
- Tỷ lệ câu trả lời không đủ dữ liệu và hallucination được báo cáo.

### 11.3. Chi phí và vận hành

- Input/output tokens trên mỗi active workspace.
- Chi phí trung bình cho một phân tích/Commitment được chấp nhận.
- Chi phí cho một report được duyệt.
- Số background job trên 1.000 messages.
- Queue latency, retry rate và dead-letter rate.
- Context size p50/p95 theo loại intent.

Không tối ưu theo “số lần gọi AI”; tối ưu theo **chi phí trên một kết quả được người dùng chấp nhận**.

---

## 12. Guardrails về ngân sách

Mỗi workspace cần cấu hình hoặc plan limit:

```ts
type AiBudget = {
  dailyInputTokens: number;
  dailyOutputTokens: number;
  maxConcurrentJobs: number;
  maxBackgroundJobsPerDay: number;
  maxReportsPerMonth: number;
};
```

Khi gần hết budget:

1. Dừng suggestion nền trước.
2. Giữ các hành động trực tiếp do người dùng yêu cầu.
3. Giảm top-K hoặc dùng model rẻ hơn cho tác vụ phù hợp.
4. Thông báo rõ ràng, không âm thầm trả kết quả kém chất lượng.

---

## 13. Những anti-pattern phải tránh

- Gọi LLM cho từng message bất kể nội dung.
- Gửi toàn bộ channel history vào mỗi câu hỏi.
- Để model tự tính số task hoặc phần trăm tiến độ thay cho backend.
- Tự tạo task/decision không có xác nhận và không có source.
- Dùng vector search như cơ chế phân quyền.
- Lưu summary nhưng không giữ checkpoint, version và nguồn.
- Retry hành động ghi mà không có idempotency key.
- Để AI service nằm trên đường gửi message hoặc mở task.
- Tạo nhiều tính năng AI trước khi đo acceptance và retention.
- Xem “câu trả lời nghe hay” là thành công dù không dẫn tới hành động hữu ích.

---

## 14. Ánh xạ với Halo hiện tại

Các nền tảng đã có trong frontend:

- Chat, group, message, attachment và realtime.
- Task project/board/list, assignee, priority, checklist, activity và reports.
- Notes với editor và cộng tác realtime.
- AI Panel dùng tool để đọc/tạo/cập nhật task và đọc/search notes.
- Call qua LiveKit, PWA, notification và Electron.

Các mảnh còn thiếu để hình thành vòng giá trị đề xuất:

1. Message selection và hành động `Phân tích và xử lý`.
2. Commitment entity, trạng thái scope và vòng đời bàn giao/nghiệm thu.
3. Project scope/deliverable model và Change Request workflow.
4. Source reference/deep link từ Commitment/task quay lại message.
5. Delivery evidence liên kết PR/design/document/staging khi phù hợp.
6. Decision entity và Decision Log.
7. Report dataset builder có nguồn, thay vì prompt quét toàn bộ dữ liệu.
8. Permission-aware retrieval cho chat/notes.
9. AI job queue, idempotency, budget và observability ở backend.
10. Suggestion inbox và cơ chế accept/dismiss.
11. Product analytics để đo scope protection, acceptance, cost và retention.

---

## 15. Các câu hỏi phải trả lời trước khi tự động hóa sâu

- Người mua chính là agency owner, PM hay engineering manager?
- Một tuần trung bình có bao nhiêu yêu cầu bị thất lạc trong chat?
- Người dùng muốn chọn message thủ công hay chấp nhận suggestion chủ động?
- Tỷ lệ suggestion được chấp nhận bao nhiêu thì đáng chạy nền?
- Dữ liệu nào được phép xuất hiện trong report khách hàng?
- Workspace cần data residency hoặc self-hosted đến mức nào?
- Mức chi phí AI chấp nhận được trên một active user/workspace là bao nhiêu?
- Khi task và chat mâu thuẫn, nguồn nào là nguồn sự thật?
- Quy định lưu/xóa embedding, summary và report snapshot ra sao?

---

## 16. North-star demo

Một demo đủ thuyết phục nên hoàn tất trong vài phút:

1. Khách hàng gửi một yêu cầu mới và muốn giữ nguyên deadline.
2. PM chọn message và bấm `Phân tích và xử lý`.
3. Halo phát hiện yêu cầu chưa có trong scope và phân tích tác động.
4. PM chọn đưa sang phase 2 hoặc tạo Change Request thay vì âm thầm nhận thêm việc.
5. Sau khi được duyệt, Halo tạo Commitment và task có link về message nguồn.
6. Developer liên kết bằng chứng thực hiện/deploy; PM gửi bản bàn giao.
7. Khách hàng nghiệm thu hoặc yêu cầu sửa.
8. Halo tạo báo cáo tuần phân biệt rõ đã làm, đã bàn giao và đã nghiệm thu.

Thông điệp cần chứng minh:

> Từ một yêu cầu trong chat đến quyết định về phạm vi, công việc, bằng chứng bàn giao và
> nghiệm thu — không thất lạc cam kết, không làm thêm miễn phí và không cần AI đọc toàn
> bộ workspace liên tục.
