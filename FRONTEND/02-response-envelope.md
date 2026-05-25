# 02 — Response Envelope

> Format chuẩn cho mọi response REST của BE. FE dựa vào shape này để parse.

## Success

```json
{
  "success": true,
  "data": { ... },                                       // payload chính
  "meta": { "page": 1, "limit": 20, "total": 100 },      // chỉ khi list/paginate
  "timestamp": "2026-05-15T10:00:00.000Z"
}
```

- `data` là payload chính. Có thể là object hoặc array tuỳ endpoint.
- `meta` chỉ xuất hiện ở list endpoint (page/limit/total hoặc cursor-based).
- `timestamp` ISO 8601 — dùng để debug skew thời gian client/server.

## Error

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",                  // FE bắt theo code này
    "message": "Không tìm thấy người dùng",     // tiếng Việt — có thể hiển thị toast
    "details": null                             // optional: list field validation lỗi
  },
  "timestamp": "2026-05-15T10:00:00.000Z",
  "path": "/api/v1/...",
  "requestId": null
}
```

- **`code`** là contract — FE so sánh `code` để rẽ nhánh logic. KHÔNG so sánh `message` (có thể đổi i18n).
- **`message`** tiếng Việt, đã thân thiện với user — có thể show trực tiếp ở toast.
- **`details`** dùng khi cần thông tin thêm. Ví dụ với `VALIDATION_ERROR`:
  ```json
  {
    "details": [
      { "field": "email", "issue": "phải là email hợp lệ" },
      { "field": "password", "issue": "tối thiểu 6 ký tự" }
    ]
  }
  ```

## Helper FE chuẩn

```ts
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; nextCursor?: string | null };
  timestamp: string;
}

interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  timestamp: string;
  path: string;
  requestId: string | null;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

async function apiJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw Object.assign(new Error(body.error.message), { code: body.error.code, details: body.error.details });
  }
  return body.data;
}
```

---

📋 Bảng đầy đủ các `code`: [12-error-codes.md](./12-error-codes.md).
