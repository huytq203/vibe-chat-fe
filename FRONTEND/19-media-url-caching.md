# 19 — Media URL Caching (đề xuất BE — chống tải lại file nặng)

> **Mục tiêu:** ảnh/video (nhất là mp4 nặng) trong chat **không bị tải lại** mỗi khi
> FE refetch danh sách tin nhắn hoặc người dùng mở lại conversation.
> Tài liệu này mô tả vấn đề, nguyên nhân, và **yêu cầu BE** để trình duyệt cache được media.

Liên quan: [14-media-upload.md](./14-media-upload.md) (flow upload + `downloadUrl` hiện tại), [04-messages.md](./04-messages.md).

---

## 1. Vấn đề đang gặp

- `<video>` / `<img>` trong chat lấy `src = attachment.downloadUrl` — là **signed URL ký sẵn nhúng trong message**.
- Mỗi lần FE gọi lại `GET /conversations/:id/messages` (refetch, mở lại conversation, reconnect…), BE **ký lại một signed URL MỚI** cho **cùng một file** (khác `X-Amz-Signature` / `X-Amz-Date` / expiry).
- Chuỗi URL đổi → trình duyệt coi là **resource khác** → **tải lại toàn bộ file** dù nội dung y hệt. Với mp4 nặng, người dùng phải chờ tải lại liên tục → trải nghiệm kém.

> FE đã giảm tần suất refetch (tăng cache tin nhắn) và khoá `src` theo `mediaId` để
> không tự đổi URL khi refetch. Nhưng để **cache xuyên suốt reload trang / nhiều thiết bị /
> URL hết hạn**, cần BE trả URL **cache được**.

---

## 2. Nguyên nhân gốc (phía storage/BE)

Signed URL (S3/MinIO presigned GET) **không cache-friendly** vì 2 lý do:

1. **URL đổi mỗi lần ký** → cache key của trình duyệt (theo URL đầy đủ) luôn miss.
2. TTL ngắn (hiện ~vài phút) → kể cả giữ nguyên URL cũng nhanh hết hạn, buộc refresh.

---

## 3. Yêu cầu BE — chọn 1 trong 2 hướng

### Hướng A (ưu tiên) — Signed URL **ổn định trong một cửa sổ thời gian**

Ký URL **deterministic**: với cùng `mediaId`, trong cùng một time-window, BE trả **đúng một chuỗi URL giống hệt** (kể cả qua nhiều request / nhiều lần refetch).

Cách làm: **làm tròn thời điểm hết hạn** về mốc cố định thay vì `now + ttl`.

```
// Thay vì: expiresAt = now + 15m   (mỗi request ra URL khác)
// Dùng:    expiresAt = ceil(now / 1h) * 1h + 1h   (cùng 1 giờ → cùng URL)
```

- Khuyến nghị window/TTL: **≥ 1–2 giờ** (khớp với thời gian FE giữ cache tin nhắn).
- Hệ quả: trong cùng window, `downloadUrl` của 1 file **bất biến** → trình duyệt cache hit, không tải lại.
- Khi sang window mới, URL đổi 1 lần (chấp nhận được), file được tải lại đúng 1 lần/giờ thay vì mỗi refetch.
- Áp dụng cho **cả** `downloadUrl` nhúng trong `message.attachments[]` **và** endpoint refresh
  `GET /conversations/:id/attachments/:mediaId/url`.

### Hướng B — Endpoint proxy stream URL **cố định** + HTTP cache header

Thêm endpoint trả thẳng bytes (BE stream từ storage), URL **không có chữ ký đổi**:

```http
GET /api/v1/conversations/:conversationId/attachments/:mediaId/raw
Authorization: Bearer <accessToken>
```

Header response **bắt buộc** để trình duyệt cache:

```
Cache-Control: private, max-age=86400, immutable
ETag: "<hash nội dung / mediaId>"
Accept-Ranges: bytes          # PHẢI có — cho phép seek/tua video, tải từng phần
Content-Type: video/mp4
```

- `immutable` + `ETag`: nội dung media bất biến (file không sửa) → trình duyệt cache lâu, không revalidate thừa.
- `Accept-Ranges: bytes` + xử lý `Range` request: `<video>` tua/seek và load dần thay vì tải hết.
- AuthZ: kiểm tra member của conversation (như endpoint refresh hiện tại).
- Đánh đổi: bytes đi qua BE (tốn băng thông server). Phù hợp nếu muốn URL ổn định tuyệt đối, không phụ thuộc time-window.

---

## 4. Bổ sung mong muốn (cả 2 hướng)

- **TTL dài hơn cho signed URL** dùng trong chat: tối thiểu **1–2 giờ** (hiện đang ngắn → hay phải refresh).
- Trả kèm **`expiresIn` (giây)** ở mọi nơi cấp `downloadUrl` (đã có ở endpoint refresh — bổ sung cho cả `message.attachments[]` nếu chưa) để FE biết khi nào nên chủ động refresh, tránh đợi `onError`.
- Đảm bảo object trên storage có `Cache-Control` hợp lý khi set lúc upload (với hướng A, Cache-Control nằm ở response của storage — set `Cache-Control: private, max-age=...` lúc PUT/presign).

---

## 5. Tiêu chí nghiệm thu

- [ ] Gọi `GET /conversations/:id/messages` **2 lần liên tiếp** → `downloadUrl` của cùng `mediaId` **giống hệt nhau** (hướng A) hoặc URL vốn cố định (hướng B).
- [ ] Mở video mp4, rời conversation, quay lại trong vòng 1–2h → **không phát sinh request tải lại** file (DevTools → Network: từ disk/memory cache, không phải 200 tải mới).
- [ ] Response media có `Cache-Control` + `ETag` (hướng B) hoặc URL bất biến trong window (hướng A).
- [ ] `<video>` tua được (Range request hoạt động — hướng B).
- [ ] URL hết hạn → refresh qua `…/attachments/:mediaId/url` vẫn hoạt động như cũ.

---

## 6. Phần FE đã làm (tham chiếu, không cần BE xử lý)

- Tăng cache tin nhắn FE lên ~2h (`staleTime` + `gcTime`) — dựa vào realtime WS để cập nhật tin mới, giảm refetch REST.
- `useRefreshableUrl` khoá `src` theo `mediaId`, không đổi `src` khi refetch trả signed URL mới cho cùng file; chỉ refresh khi media thật sự lỗi (`onError`).

> Hai việc trên giảm ~90% hiện tượng reload trong phiên. Để cache **bền qua reload trang /
> đa thiết bị / khi URL hết hạn**, cần BE thực hiện Hướng A hoặc B ở trên.
