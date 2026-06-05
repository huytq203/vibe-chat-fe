# 17 — Chuyển chế độ mã hoá ~~(Switch Encryption Mode)~~

> ⛔ **DEPRECATED — Tính năng này đã bị xoá.**
>
> Endpoint `PATCH /conversations/{id}/encryption` **không còn tồn tại**.
> Tính năng bảo mật thay thế: **Conversation Lock** — xem [18-conversation-lock.md](./18-conversation-lock.md).

---

Nếu code FE còn gọi `/encryption` hãy xoá đi. Response sẽ là `404`.

Tính năng E2E (Secret Chat) đã bị loại bỏ. Tất cả conversation hiện tại đều dùng `encryptionType: "SERVER"`.

**Liên quan:**
- 🔒 Khoá conversation bằng password → [18-conversation-lock.md](./18-conversation-lock.md)
- 🔐 Mã hoá SERVER hiện tại → [09-encryption.md](./09-encryption.md)
