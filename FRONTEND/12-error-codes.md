# 12 — Error Codes

> Bảng tra cứu mã lỗi. FE bắt theo `code` (UPPER_SNAKE) thay vì `message` để tránh phụ thuộc i18n.

Format response error xem [02-response-envelope.md](./02-response-envelope.md#error).

---

## Auth (1xx — Authentication)

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `AUTH_UNAUTHORIZED` | 401 | Không có/sai token | Gọi `/auth/refresh`, fail thì redirect login |
| `AUTH_TOKEN_INVALID` | 401 | Token format sai | Refresh token |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn | Refresh token |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh cookie sai/hết hạn | Redirect login |
| `AUTH_FORBIDDEN` | 403 | Token OK nhưng không đủ quyền | Show "Không có quyền" |

## User

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `USER_NOT_FOUND` | 404 | userId không tồn tại trong MySQL | Show "User không tồn tại" |

## Conversation

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | conversationId sai | Refresh danh sách conv |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | User không phải thành viên | Show "Bạn không có trong conv này" |
| `CONVERSATION_DIRECT_SELF` | 400 | Tự tạo DIRECT với mình | UX: ẩn nút khi click vào avatar mình |
| `CONVERSATION_NOT_OWNER` | 403 | Group/Channel mà không phải owner xoá | Ẩn nút "Xoá nhóm" nếu không phải owner |
| `CONVERSATION_ALREADY_DELETED` | 400 | Gọi DELETE 2 lần | Refresh list, conv đã biến mất |

## Message

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `MESSAGE_NOT_FOUND` | 404 | messageId sai (vd reply tin đã xoá) | — |
| `MESSAGE_NOT_OWNED` | 403 | Sửa/xoá tin của người khác | — |
| `MESSAGE_TOO_LONG` | 400 | Plaintext > 5000 ký tự | Show counter |
| `MESSAGE_CONTENT_REQUIRED` | 400 | `type=TEXT` nhưng thiếu `plaintext` (rỗng/khoảng trắng) | Bắt buộc nhập text |
| `MESSAGE_ATTACHMENT_REQUIRED` | 400 | `type=IMAGE/VIDEO/AUDIO/FILE` nhưng thiếu `attachmentIds` | Upload media trước, gửi kèm `attachmentIds` |

## Encryption

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `ENCRYPTION_KEY_NOT_FOUND` | 500 | Server-side bug — báo BE | — |
| `ENCRYPTION_FAILED` | 500 | Server không decrypt được | Hiện "Lỗi giải mã" + báo BE |

## Friends

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `FRIEND_SELF` | 400 | Tự kết bạn với mình | UX: ẩn nút "Kết bạn" trên profile của chính mình |
| `FRIEND_BLOCKED` | 403 | 1 trong 2 phía đang chặn nhau | Show "Không thể thực hiện thao tác này" (không lộ ai chặn ai) |
| `FRIEND_REQUEST_NOT_FOUND` | 404 | Lời mời không tồn tại | Refresh list, có thể đã bị huỷ |
| `FRIEND_REQUEST_NOT_OWNER` | 403 | Không phải người được phép thao tác | — (logic FE sai, không nên xảy ra) |
| `FRIEND_REQUEST_ALREADY_EXISTS` | 409 | Đã có lời mời chờ | Refresh trạng thái friendship |
| `FRIEND_ALREADY_FRIENDS` | 409 | Đã là bạn | Refresh trạng thái friendship |
| `FRIEND_NOT_FRIENDS` | 404 | Chưa phải bạn (gọi unfriend khi không phải bạn) | — |

## Blocks

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `BLOCK_SELF` | 400 | Tự chặn mình | UX: ẩn nút "Chặn" trên profile của chính mình |
| `BLOCK_ALREADY_EXISTS` | 409 | Đã chặn rồi | Refresh trạng thái |
| `BLOCK_NOT_FOUND` | 404 | Chưa chặn (gọi unblock khi không có block) | Refresh list block |

## Notification

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `NOTIFICATION_NOT_FOUND` | 404 | Notification id sai hoặc không thuộc user | Refresh inbox |
| `FCM_TOKEN_INVALID` | 400 | Token sai format | FE log + re-fetch token từ Firebase |

## Generic

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query sai format | Show field error (đọc `details[]`) |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước | Show "Có lỗi xảy ra" + retry |

---

## Sample handler chung

```ts
function handleApiError(err: { code: string; message: string }) {
  switch (err.code) {
    case 'AUTH_UNAUTHORIZED':
    case 'AUTH_TOKEN_EXPIRED':
    case 'AUTH_TOKEN_INVALID':
      return refreshThenRetry();

    case 'AUTH_REFRESH_TOKEN_INVALID':
      return redirectLogin();

    case 'VALIDATION_ERROR':
      // err có details[] — render field errors
      return showFieldErrors(err);

    case 'FRIEND_BLOCKED':
      return toast.warn('Không thể thực hiện thao tác này');

    case 'INTERNAL_ERROR':
      return toast.error('Có lỗi xảy ra. Thử lại sau.');

    default:
      // hiện message tiếng Việt từ server
      return toast.error(err.message);
  }
}
```
