# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo semver.
Quy trình phát hành: [docs/release-process.md](./docs/release-process.md).

## [0.2.0] — 2026-10-17

### Thêm
- Quản lý phiên bản: `/version.json`, banner "Halo đã có phiên bản mới" chỉ khi semver tăng, nhớ "Để sau" theo version.
- Desktop: báo bản cập nhật kèm link tải, thông báo OS, màn hình bắt buộc cập nhật khi thấp hơn `DESKTOP_MIN_VERSION`.
- Settings → Chung → Phiên bản: xem version/build và kiểm tra cập nhật thủ công.
- Desktop gửi `deviceType=DESKTOP` khi đăng nhập → không còn đá phiên web (bản 0.1.x không gửi).

### Sửa
- Banner cập nhật web hiện lại sau mỗi lần deploy/reload dù trang đã là bản mới.

## [0.1.1] — 2026-06-14

- Bản desktop đầu tiên (Windows NSIS, Linux deb).
