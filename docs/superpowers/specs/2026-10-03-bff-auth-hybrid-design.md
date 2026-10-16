# Thiết kế: BFF auth + Hybrid TanStack Query

Ngày: 2026-10-03 (cập nhật 2026-10-04: cookie httpOnly + CSRF nhiều lớp + phiên theo thiết bị, giữ access/refresh) · Trạng thái: chờ duyệt · Phạm vi: toàn dự án (chia 4 giai đoạn)

## 1. Mục tiêu

- Tải trang đầu nhanh: bỏ chuỗi `tải JS → refresh → bootstrap → API` ở trình duyệt; dữ liệu đầu có sẵn khi render.
- Bảo mật: access token và refresh token không còn nằm trong bộ nhớ JS; chỉ ở cookie `httpOnly`.
- Dùng đúng năng lực Next 16 (`proxy.ts`, Server Component, `cookies()`, rewrites, hydration) thay vì SPA thuần.

Tiêu chí thành công:
1. Mở `/chat/[id]` khi đã đăng nhập: HTML đầu đã chứa dữ liệu hội thoại; không còn request `POST /auth/refresh` từ trình duyệt.
2. `grep` không còn `accessToken` được giữ ở biến module/store phía client.
3. Chưa đăng nhập → redirect ở server (không nháy trang bảo vệ).
4. Web và Electron dùng cùng một cơ chế auth.

## 2. Hiện trạng (đã xác minh trong code)

- `src/lib/api/client.ts`: `accessToken` là biến module; `refreshAccessToken()` gọi `POST /api/v1/auth/refresh` bằng `credentials: 'include'`.
- `AuthBootstrap` (client) chạy `refresh` → `bootstrap` rồi seed cache; mọi hook chat có `enabled: isAuthed`.
- Cookie `refresh_token` do BE đặt: `httpOnly`, `path=/api`, 90 ngày sliding (`docs/fe-auth-otp-guide.md`). `path=/api` nên request tới `/chat/...` không mang cookie này.
- Chưa có `proxy.ts`. `app/api/` chỉ có `giphy`.
- Web: `rewrites` chuyển `/api/v1/*` tới backend. Electron: `output: 'standalone'`, `electron/main.js` spawn `server.js` và `loadURL(127.0.0.1)`; `rewrites` đang tắt (`!isElectron`) và FE gọi thẳng `NEXT_PUBLIC_*_URL`. Comment "static export" ở đầu `next.config.ts` đã lỗi thời.
- Token còn được dùng ở: `lib/ws/socket.ts`, `lib/ws/call-socket.ts`, `features/tasks/lib/task-socket.ts`, `features/tasks/hooks/useSharing.ts`, `lib/api/sse.ts`.

## 3. Kiến trúc đích

```
Trình duyệt ──cookie httpOnly (path=/)──▶ proxy.ts ──▶ Server Component / rewrites ──▶ Backend
                                          │ refresh khi access hết hạn (1 nơi duy nhất)
                                          └ gắn Authorization: Bearer cho /api/v1/*
```

### 3.1 Cookie
| Cookie | Do ai đặt | Thuộc tính | Sống |
|---|---|---|---|
| `__Host-refresh_token` | Next (`proxy.ts`/route handler) lấy từ BE | httpOnly, Secure, SameSite=Lax, path=/ | theo `clientType` (§3.6), sliding + hạn tuyệt đối |
| `__Host-access_token` | Next (`proxy.ts`/route handler) | httpOnly, Secure, SameSite=Lax, path=/ | = `expiresIn` của access token |

Tiền tố `__Host-` bắt buộc `Secure`, `path=/`, không có `Domain` nên subdomain khác không ghi đè được. Trên `http://127.0.0.1` (Electron, dev) trình duyệt bỏ qua yêu cầu `Secure` cho localhost; nếu không, dùng tên không tiền tố ở môi trường đó qua một hằng số duy nhất trong `lib/auth/cookies.ts`.

Chống CSRF (nhiều lớp):
1. SameSite=Lax cho mọi cookie.
2. `proxy.ts` kiểm `Sec-Fetch-Site` và `Origin` cho mọi request ghi (POST/PUT/PATCH/DELETE) vào `/api/*`: chỉ nhận `same-origin` hoặc `Origin` nằm trong danh sách cho phép từ `config/env.ts`.
3. Thao tác nhạy cảm (đổi mật khẩu, xoá tài khoản, thu hồi thiết bị) thêm double-submit CSRF token (cookie không httpOnly `__Host-csrf` + header `X-CSRF-Token`), kèm xác nhận lại mật khẩu.
4. Server Action dùng CSRF built-in của Next.

### 3.2 `src/proxy.ts`
Chạy Node runtime. Matcher loại `_next/static`, `_next/image`, file tĩnh, `favicon`.
1. Đọc `access_token`. Còn hạn → tiếp tục.
2. Hết hạn/thiếu nhưng có `refresh_token` → gọi `POST AUTH_URL/api/v1/auth/refresh` (server→server, chuyển tiếp cookie), nhận access mới + `Set-Cookie` mới → ghi lại cả hai vào response và vào request đang đi (để Server Component cùng request thấy token mới).
3. Refresh thất bại 401 → xoá cookie; route bảo vệ → `redirect('/login')`.
4. Request `/api/v1/*`: set `Authorization: Bearer <access>` vào request header của đích rewrite. Trình duyệt không gửi/nhận token.
5. Route công khai (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/p/*`, `/i/*`, `/offline`) không ép đăng nhập; đã đăng nhập mà vào `/login` → redirect `/chat`.

Gộp refresh đồng thời: map in-process theo `sid` → Promise; request song song cùng phiên dùng chung một lần refresh. Chỉ đủ với một instance Next; chạy nhiều instance (hoặc web và Electron cùng lúc, nhưng khác phiên nên không tranh nhau) cần ân hạn và họ token ở BE (§3.6, §6).

### 3.3 Server-side session
- `src/lib/auth/session.ts` (server-only): `getSession()` đọc `access_token` qua `cookies()`, trả `{ accessToken, userId } | null`. Mọi Server Component/Action tự kiểm tra, không dựa riêng vào `proxy.ts` (đúng khuyến cáo Next về Server Function).
- `src/lib/http/server-fetch.ts` (server-only): wrapper `fetch` tới backend kèm Bearer từ `getSession()`; trả Result Object, 401 → `redirect`.

### 3.4 Hybrid query
- Query contract dùng chung `queryOptions` đặt ở `src/services/<scope>.queries.ts`, key lấy từ `services/keys.ts` (không đổi key hiện có).
- `src/lib/query/query-client.ts` (`makeQueryClient`), `src/lib/query/prefetch.ts` (`prefetchDehydrated`) đúng như `.claude/patterns/hybrid-query.md`. Server override `queryFn` gọi `server-fetch`; client dùng `apiClient` qua rewrites.
- `apiClient` phía client bỏ toàn bộ logic token/refresh/timer; 401 → điều hướng `/login`.
- `AuthBootstrap` bị thay bằng prefetch `bootstrap` ở `(app)/layout` (Server) + `HydrationBoundary`; `useAuthStore` chỉ giữ thông tin user hiển thị, không giữ token, bỏ cờ `enabled: isAuthed`.

### 3.5 Realtime (WebSocket/SSE)
- `POST /api/auth/ws-ticket` (route handler, `getSession()` bắt buộc, Zod validate scope): xin BE ticket một lần, sống ≈30s, gắn `scope` (`chat|call|task|notion`).
- 4 socket + SSE lấy ticket trước khi kết nối/kết nối lại; BE đổi ticket lấy phiên. Cần BE hỗ trợ (§6).

### 3.6 Phiên theo thiết bị
- Mỗi lần đăng nhập tạo một phiên riêng. Access token JWT mang claim `sid` (id phiên) và `clientType` ∈ `web | electron | mobile-web`. Refresh token thuộc đúng phiên đó.
- Refresh xoay vòng theo họ token (token family): mỗi lần refresh phát refresh token mới trong cùng họ; dùng lại token cũ ngoài cửa sổ ân hạn thì **chỉ thu hồi họ/phiên đó**, không ảnh hưởng thiết bị khác.
- Thu hồi theo `sid`: đăng xuất thiết bị hiện tại, "đăng xuất các thiết bị khác". BE kiểm tra `sid` còn hiệu lực khi refresh; access token ngắn hạn nên chịu trễ tối đa bằng TTL của nó.
- `clientType` do client khai nên chỉ dùng để phân loại hiển thị và đặt TTL (Electron dài hơn, mobile-web ngắn hơn), không dùng để cấp thêm quyền.
- Không ràng buộc cứng phiên vào IP hay user-agent (di động đổi IP liên tục sẽ bị đá oan); chỉ ghi lại để hiển thị danh sách thiết bị và cảnh báo bất thường.
- UI: trang Cài đặt có danh sách thiết bị (tên, `clientType`, lần dùng gần nhất) và nút thu hồi, dùng route handler có CSRF mức nhạy cảm (§3.1 lớp 3).

### 3.7 Electron
- Dùng chung BFF. Bỏ nhánh `!isElectron` của `rewrites`; server cục bộ nhận `AUTH_URL`, `VIBE_URL`, ... qua file cấu hình đóng gói cùng app (không hardcode secret).
- Cookie lưu theo origin `http://127.0.0.1:<port>`; cổng cố định hoặc lưu theo cổng để cookie không mất giữa các lần mở app.
- Sửa comment lỗi thời trong `next.config.ts`.

## 4. Giai đoạn

Điều chỉnh 2026-10-04: `apiAuth.getToken()` có hơn 30 chỗ gọi (socket, task-client, media upload, notion export, collab) và nhiều service được trình duyệt gọi thẳng origin khác, nên token chưa thể gỡ khỏi client ở P0. P0 chạy với BE hiện tại và giữ một cầu nối token tạm; việc gỡ cầu nối chờ ticket socket của BE (P2).

| GĐ | Nội dung | Điều kiện hoàn tất |
|---|---|---|
| P0 | Nền BFF với BE hiện tại, bật bằng `NEXT_PUBLIC_AUTH_MODE=bff`: cookie `httpOnly`, `proxy.ts` (refresh, CSRF, gắn Bearer, bảo vệ route), route `/api/auth/{login,token,logout}`, client chọn endpoint theo chế độ. Plan: `docs/superpowers/plans/2026-10-04-bff-auth-p0-foundation.md` | Đăng nhập/đăng xuất/hết hạn/thu hồi phiên chạy; test xanh; kiểm tra thủ công bằng Chrome |
| P1 | `session.ts`, `server-fetch.ts`, helper hybrid; hybrid cho `chat/layout`, `chat/[id]` (bootstrap, danh sách chat, tin nhắn trang đầu) | Đạt tiêu chí 1 và 3; đo trước/sau bằng Chrome |
| P2 | BE: `sid`, họ refresh token, thu hồi theo thiết bị, ticket WS/SSE. FE: gỡ cầu nối token, socket/SSE dùng ticket, double-submit CSRF, danh sách thiết bị, hybrid cho notes/work/ai/settings/store | Không còn import token ở client |
| P3 | Electron đóng gói BFF, dọn cấu hình cũ | Build Electron đăng nhập được, e2e xanh |

Mỗi giai đoạn có plan riêng sau khi giai đoạn trước hoàn tất.

## 5. Kiểm thử
- Unit (Vitest): `proxy.ts` (còn hạn / hết hạn / refresh lỗi / route công khai / gộp refresh), `session.ts`, `server-fetch.ts`, `ws-ticket` (không session → 401, input sai → 400).
- Integration: luồng Server → Hydration → Query (`hybrid.integration.test.tsx`).
- E2E (Playwright): login → mở `/chat/[id]` không có request refresh từ trình duyệt; để hết hạn access → request kế tiếp vẫn thành công; logout xoá cả hai cookie; phiên bị thu hồi → về `/login`.
- Đo hiệu năng trước P0 làm mốc (TTFB, thời điểm có dữ liệu đầu, số request nối đuôi) và sau mỗi giai đoạn.

## 6. Việc cần phía BE (blocker của P0)
1. Login/refresh trả refresh token trong body cho server Next (server→server) thay vì chỉ `Set-Cookie` path `/api`, để Next đặt cookie `path=/` theo §3.1; hoặc BE đổi `path=/` và Next chuyển tiếp `Set-Cookie`. Chọn một trong hai ở plan P0.
2. Phát `sid` và `clientType` trong JWT; nhận `clientType` khi login (đã có `deviceType`, mở rộng enum).
3. Refresh theo họ token: xoay vòng, ân hạn vài giây cho token vừa dùng, phát hiện dùng lại → thu hồi họ/phiên đó.
4. API danh sách thiết bị và thu hồi theo `sid` (đăng xuất thiết bị khác).
5. Endpoint cấp ticket WS/SSE một lần, ~30s, theo scope, đổi ticket lấy phiên khi kết nối.
6. Xác nhận hiện tại refresh có rotate giá trị token hay chỉ gia hạn hạn dùng (quyết định mức thay đổi của mục 3).

## 7. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Refresh tranh chấp làm đá phiên | Gộp refresh in-process theo `sid` + họ token và ân hạn ở BE; dùng lại token chỉ thu hồi một phiên |
| Cookie bị lộ (malware, mất máy) | Access ngắn hạn, thu hồi theo `sid`, danh sách thiết bị, hạn tuyệt đối cho refresh |
| CSRF vì cookie tự gửi | SameSite + `Origin`/`Sec-Fetch-Site` + double-submit cho thao tác nhạy cảm (§3.1) |
| Mobile web (Safari) rút ngắn cookie | Thử trên thiết bị thật ở P3 trước khi chốt TTL `mobile-web` |
| Trang chứa dữ liệu riêng bị cache nhầm | `Cache-Control: private, no-store` cho trang prefetch |
| Server Component không ghi được cookie | Refresh chỉ ở `proxy.ts`; Server Component chỉ đọc |
| `proxy.ts` không phủ Server Function ở route bị loại khỏi matcher | Mỗi Server Action/route handler tự gọi `getSession()` |
| Hydration payload lớn | Chỉ prefetch trang đầu cần cho viewport (tin nhắn 30 mới nhất, không toàn bộ) |
| Cookie mất giữa các lần mở Electron | Cố định cổng + kiểm tra ở P3 |
| Rollback | Giữ đường cũ sau cờ môi trường `AUTH_MODE=bff|legacy` đến hết P2, rồi xoá |

## 8. Ngoài phạm vi
- Đổi nhà cung cấp auth, đổi mô hình phân quyền, đổi backend ngoài 3 yêu cầu ở §6.
- Viết lại UI chat.

## 9. Quy ước thực hiện
Theo CLAUDE.md: wrap thư viện trong `src/lib/`, Zod ở server boundary, không `any`, file < 300 dòng. Các thay đổi chạm `app/api/`, cookie, CSP và env đã được người dùng duyệt ở mức hướng đi tại phiên này; chi tiết từng thay đổi vẫn xin xác nhận trong plan của từng giai đoạn.
