# Hướng dẫn FE — Luồng đăng ký & xác thực email bằng OTP

> Tài liệu cho Frontend tích hợp luồng: **Đăng ký → Nhận OTP qua email → Xác thực → Đăng nhập**.
> Swagger UI (dev): `http://localhost:3001/api/docs`

---

## 1. Thông tin chung

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Refresh token:** BE set qua **HttpOnly cookie** (`refresh_token`, path `/api`, sống 90 ngày, sliding). FE **không bao giờ** thấy hoặc tự lưu refresh token — chỉ cần gọi fetch/axios với `credentials: 'include'` (axios: `withCredentials: true`).
- **Access token:** trả trong body, FE giữ trong memory (không localStorage nếu tránh được), gửi kèm header `Authorization: Bearer <accessToken>`. Hết hạn sau `expiresIn` giây (~15 phút).

### Response envelope thống nhất

Mọi response đều được bọc envelope:

```jsonc
// Thành công
{
  "success": true,
  "data": { ... },                          // payload thật nằm ở đây
  "timestamp": "2026-06-12T10:00:00.000Z"
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "AUTH_OTP_INVALID",             // FE xử lý theo code, KHÔNG parse message
    "message": "Mã xác thực không đúng",    // tiếng Việt, hiển thị trực tiếp được
    "details": { "email": "Email không hợp lệ" }  // chỉ có khi VALIDATION_ERROR
  },
  "timestamp": "2026-06-12T10:00:00.000Z",
  "path": "/api/v1/auth/verify-email"
}
```

> Với lỗi `VALIDATION_ERROR` (400), `details` là object `{ tênField: "thông báo lỗi" }` — FE map thẳng vào form field.

---

## 2. Luồng tổng quan

```
┌──────────────┐    201     ┌────────────────┐    200     ┌─────────────┐
│ POST         │ ─────────► │ Màn hình nhập  │ ─────────► │ POST        │
│ /auth/register│  OTP gửi   │ OTP (6 số)     │  verify OK │ /auth/login │
└──────────────┘  qua email └────────────────┘            └─────────────┘
                                   │ không nhận được mã?
                                   ▼
                            POST /auth/resend-otp
                            (cooldown 60s, tối đa 5 lần/giờ)
```

Tài khoản mới tạo ở trạng thái **INACTIVE** — login trước khi verify sẽ bị **403 `AUTH_EMAIL_NOT_VERIFIED`**.

---

## 3. Chi tiết endpoint

### 3.1. `POST /api/v1/auth/register` — Đăng ký

Rate limit: **5 request/phút/IP**.

**Request body:**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `username` | string | ✅ | 3–50 ký tự, chỉ chữ/số/`_` `.` `-`, tự lowercase |
| `email` | string | ✅ | email hợp lệ, tự lowercase + trim |
| `password` | string | ✅ | 6–72 ký tự, ≥ 1 chữ hoa và ≥ 1 số |
| `phone` | string | ✅ | 10–20 ký tự, chỉ số (cho phép `+` đầu) |
| `dateOfBirth` | string | ✅ | `yyyy-mm-dd`, đủ 13 tuổi |
| `displayName` | string | ❌ | tối đa 100 ký tự |

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "0901234567",
  "dateOfBirth": "2000-01-31",
  "displayName": "John Doe"
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "message": "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác thực",
    "email": "john@example.com"
  }
}
```

→ FE chuyển sang **màn hình nhập OTP**, giữ lại `email` để gọi verify.

**Lỗi:**

| Status | Code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Dữ liệu sai — xem `details` từng field |
| 409 | `USER_USERNAME_TAKEN` / `USER_EMAIL_TAKEN` / `USER_PHONE_TAKEN` | Trùng dữ liệu |
| 429 | — | Quá rate limit, thử lại sau |

> ⚠️ Trường hợp hiếm: đăng ký thành công nhưng email OTP gửi fail (mail server lỗi) — BE vẫn trả `201`. FE cứ hiển thị màn OTP; user bấm "Gửi lại mã" là nhận được.

---

### 3.2. `POST /api/v1/auth/verify-email` — Xác thực OTP

Rate limit: **5 request/phút/IP**.

**Request body:**

```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

- `otp`: chuỗi **đúng 6 chữ số** (gửi dạng string, giữ số 0 đầu — ví dụ `"012345"`).

**Response `200`:**

```json
{
  "success": true,
  "data": { "message": "Xác thực email thành công, bạn có thể đăng nhập" }
}
```

→ FE chuyển sang **màn đăng nhập** (verify KHÔNG tự đăng nhập, không trả token).

**Lỗi (đều `400`):**

| Code | Ý nghĩa | FE nên làm gì |
|---|---|---|
| `AUTH_OTP_INVALID` | Mã sai, còn lượt thử | Báo "Mã không đúng", cho nhập lại |
| `AUTH_OTP_EXPIRED` | Mã hết hạn (quá **10 phút**) hoặc chưa từng có mã | Báo hết hạn + gợi ý bấm "Gửi lại mã" |
| `AUTH_OTP_TOO_MANY_ATTEMPTS` | Nhập sai **5 lần** — mã hiện tại bị hủy | Bắt buộc bấm "Gửi lại mã" mới |

> Lưu ý bảo mật: email không tồn tại trong hệ thống cũng trả `AUTH_OTP_EXPIRED` (chống dò email) — FE không cần phân biệt, cứ xử lý như mã hết hạn.

---

### 3.3. `POST /api/v1/auth/resend-otp` — Gửi lại mã

Rate limit: **5 request/phút/IP** + cooldown riêng theo email.

**Request body:**

```json
{ "email": "john@example.com" }
```

**Response `200`** (luôn cùng message, kể cả email không tồn tại / đã verify — chống dò email):

```json
{
  "success": true,
  "data": { "message": "Nếu email hợp lệ, mã xác thực đã được gửi" }
}
```

**Lỗi `429` — code `AUTH_OTP_RESEND_COOLDOWN`:**

| Message | Nguyên nhân |
|---|---|
| "Vui lòng đợi 60 giây trước khi yêu cầu mã mới" | Đang trong **cooldown 60 giây** |
| "Bạn đã yêu cầu mã quá nhiều lần, vui lòng thử lại sau 1 giờ" | Vượt **5 lần gửi/giờ** |

**UX khuyến nghị:** disable nút "Gửi lại mã" kèm countdown 60s ngay sau khi register thành công và sau mỗi lần resend. Mã mới sẽ **thay thế** mã cũ và reset bộ đếm nhập sai.

---

### 3.4. `POST /api/v1/auth/login` — Đăng nhập sau khi verify

Rate limit: **5 request/phút/IP**. Gọi với `credentials: 'include'` để nhận cookie.

**Request body:** `{ "username": "john_doe", "password": "Password123" }`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "",          // luôn rỗng — token thật nằm trong HttpOnly cookie
      "expiresIn": 900,
      "tokenType": "Bearer"
    },
    "user": { "id": "...", "username": "john_doe", "email": "john@example.com", ... }
  }
}
```

**Lỗi:**

| Status | Code | Ý nghĩa |
|---|---|---|
| 401 | `AUTH_CREDENTIALS_INVALID` | Sai username/password |
| 403 | `AUTH_EMAIL_NOT_VERIFIED` | Chưa verify email → FE điều hướng về màn nhập OTP (kèm nút resend) |

---

### 3.5. Các endpoint liên quan (tóm tắt)

| Endpoint | Mô tả |
|---|---|
| `POST /api/v1/auth/refresh` | Làm mới access token. Không cần body — refresh token đọc từ cookie. Trả `{ accessToken, expiresIn, tokenType }`. 401 → bắt đăng nhập lại. Gọi khi access token hết hạn (hoặc trước `expiresIn`). |
| `POST /api/v1/auth/logout` | Cần `Authorization: Bearer`. Trả `204`, clear cookie + revoke session. |
| `GET /api/v1/auth/me` | Cần `Authorization: Bearer`. Trả thông tin user hiện tại. |

---

## 4. Tổng hợp giới hạn cần nhớ khi làm UI

| Giới hạn | Giá trị |
|---|---|
| OTP | 6 chữ số, hiệu lực **10 phút** |
| Số lần nhập sai tối đa | **5 lần** → mã bị hủy, phải resend |
| Cooldown gửi lại | **60 giây** giữa 2 lần |
| Quota gửi lại | **5 lần / giờ / email** |
| Rate limit endpoint auth | 5 request / phút / IP |
| Access token | ~15 phút (`expiresIn` giây) |
| Refresh cookie | 90 ngày, sliding (gia hạn mỗi lần refresh) |

## 5. Checklist tích hợp

- [ ] Mọi request auth gọi với `credentials: 'include'` / `withCredentials: true`.
- [ ] Xử lý lỗi theo `error.code`, hiển thị `error.message` (đã là tiếng Việt).
- [ ] Lỗi 400 `VALIDATION_ERROR` → map `error.details` vào từng field của form.
- [ ] OTP input gửi dạng **string** 6 ký tự (giữ số 0 đầu).
- [ ] Countdown 60s cho nút "Gửi lại mã"; xử lý 429 `AUTH_OTP_RESEND_COOLDOWN`.
- [ ] Login 403 `AUTH_EMAIL_NOT_VERIFIED` → điều hướng về màn nhập OTP.
- [ ] Interceptor: access token 401 → gọi `/auth/refresh` 1 lần → retry; refresh fail → logout về màn login.
- [ ] Không lưu access token vào localStorage (giữ trong memory/state); không tự quản lý refresh token.
