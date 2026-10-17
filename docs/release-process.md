# Quy trình phát hành & cập nhật (web + desktop)

## 1. Nguồn phiên bản duy nhất

- `version` trong `package.json` (semver `MAJOR.MINOR.PATCH`) là phiên bản của **cả web lẫn desktop** — cùng một codebase.
- `next.config.ts` inline vào `NEXT_PUBLIC_APP_VERSION`; Settings → Chung → **Phiên bản** hiển thị nó.
- `BUILD_ID` (hash git) chỉ để bust cache service worker. **KHÔNG** dùng để báo "có bản mới" — trước đây mỗi commit sinh banner, gây nhắc liên tục.

| Loại thay đổi | Lệnh | Ví dụ |
|---|---|---|
| Sửa lỗi, không đổi hành vi | `npm run release:patch` | 0.2.0 → 0.2.1 |
| Tính năng mới, tương thích ngược | `npm run release:minor` | 0.2.1 → 0.3.0 |
| Phá vỡ tương thích (BE đổi contract, phải bắt cập nhật) | `npm run release:major` | 0.3.0 → 1.0.0 |

Sau khi bump: ghi `CHANGELOG.md`, commit `chore(release): vX.Y.Z`, tag `git tag vX.Y.Z`.

## 2. `/version.json` — manifest cập nhật

Bản web đang deploy phục vụ `GET /version.json` (CORS `*`, `no-store`):

```json
{
  "version": "0.2.0",
  "buildId": "halo-…",
  "desktop": {
    "latestVersion": "0.2.0",
    "minSupportedVersion": "0.2.0",
    "releaseNotes": "Sửa lỗi đăng nhập web/desktop đá nhau",
    "downloads": { "win32": "https://…/Halo-Setup-0.2.0.exe", "linux": "https://…/halo-chat_0.2.0_amd64.deb" }
  }
}
```

Phần `desktop` đọc từ **env server của bản web** (đổi env + restart, không cần build lại):

| Env | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DESKTOP_LATEST_VERSION` | ✅ (thiếu → không quảng bá bản desktop) | Bản desktop mới nhất đã upload bộ cài |
| `DESKTOP_MIN_VERSION` | | Desktop thấp hơn → màn hình **bắt buộc cập nhật** |
| `DESKTOP_DOWNLOAD_URL_WIN32` / `_LINUX` / `_DARWIN` | | Link tải theo OS; OS không có link sẽ không được nhắc (trừ khi bắt buộc) |
| `DESKTOP_RELEASE_NOTES` | | Ghi chú ngắn hiển thị ở màn bắt buộc cập nhật |

## 3. Client xử lý thế nào

- **Web:** so `version` của `/version.json` với bản đang chạy, kiểm tra mỗi 30 phút + khi quay lại tab. Chỉ báo khi semver **tăng**. Nút "Tải lại" kích hoạt service worker đang chờ rồi reload.
- **Desktop:** gọi `NEXT_PUBLIC_UPDATE_MANIFEST_URL` (URL tuyệt đối tới `/version.json` của bản web — **bắt buộc set khi build desktop**). Có bản mới → banner "Tải về" (mở trình duyệt) + thông báo OS 1 lần. Thấp hơn `DESKTOP_MIN_VERSION` → chặn toàn màn hình.
- "Để sau" được nhớ **theo từng version** — không nhắc lại tới bản kế tiếp.

## 4. Checklist phát hành bản desktop

1. `npm run release:patch|minor|major`, cập nhật `CHANGELOG.md`.
2. Đảm bảo env build có `NEXT_PUBLIC_UPDATE_MANIFEST_URL=https://<domain-web>/version.json`.
3. `npm run typecheck && npm run lint && npm test`.
4. `npm run electron:pack:all` → `dist-electron/Halo-Setup-X.Y.Z.exe`, `dist-electron/halo-chat_X.Y.Z_amd64.deb`.
5. Upload bộ cài (vd MinIO `s3.halotech.io.vn`), lấy link công khai.
6. Deploy bản web cùng version, set env `DESKTOP_LATEST_VERSION`, `DESKTOP_DOWNLOAD_URL_*` (và `DESKTOP_MIN_VERSION` nếu BE đã đổi contract).
7. Kiểm tra `curl https://<domain-web>/version.json`.

> Bản desktop ≤ 0.1.1 **không có** bộ kiểm tra cập nhật — phải gửi link cài 0.2.0 thủ công cho user đang dùng bản cũ.
