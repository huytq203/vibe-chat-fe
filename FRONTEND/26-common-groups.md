# 26 — Nhóm chung (common groups)

> Lấy danh sách **nhóm (GROUP) mà bạn và 1 user khác cùng tham gia** — dùng cho tab
> "Nhóm chung" trong màn hình xem profile người khác (xem [24-profile.md](./24-profile.md)).
> Prefix REST `/api/v1`. Cần `Authorization: Bearer`.

---

## Khái niệm

- "Nhóm chung" = conversation `type=GROUP` mà **cả bạn lẫn user kia đều là member ACTIVE**.
  DIRECT/CHANNEL không tính. Nhóm đã giải tán không tính.
- Nhóm bạn đã **archive/ẩn** vẫn được tính (archive chỉ là tuỳ chọn hiển thị cá nhân).
- **Chống dò user:** `userId` không tồn tại → vẫn `200` với danh sách **rỗng** (không 404).
  FE đừng dùng endpoint này để kiểm tra user có tồn tại hay không.
- Phân trang **cursor-based** — không có `total`. FE load thêm bằng `nextCursor`.

---

## Lấy danh sách nhóm chung

```http
GET /api/v1/conversations/common-groups/{userId}?limit=20
Authorization: Bearer ...
```

| Param | Vị trí | Bắt buộc | Ghi chú |
|---|---|---|---|
| `userId` | path | ✅ | UUID (keycloakId) của user muốn xem — chính là `id` trả về từ `/users/:id` hoặc `/users/search` |
| `limit` | query | ❌ | 1..100, mặc định `20` |
| `cursor` | query | ❌ | Lấy từ `nextCursor` của trang trước. Bỏ trống = trang đầu. |

Response `200` — **`CommonGroupsResponseDto`** (trong envelope chuẩn, xem [02-response-envelope.md](./02-response-envelope.md)):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "74a903d4-05d6-4cff-84f4-1d0f5621ab56",
        "name": "Nhóm dev backend",
        "avatarUrl": null,
        "memberCount": 12
      }
    ],
    "nextCursor": "665f1c2b8a3d4e5f6a7b8c9d"
  },
  "timestamp": "2026-06-12T10:00:00.000Z"
}
```

| Field | Ghi chú |
|---|---|
| `items[].id` | UUID của nhóm — dùng mở conversation: `GET /conversations/{id}` (xem [03-conversations.md](./03-conversations.md)) |
| `items[].name` | Tên nhóm, có thể `null` nếu nhóm chưa đặt tên |
| `items[].avatarUrl` | Avatar nhóm, có thể `null` |
| `items[].memberCount` | Tổng số thành viên hiện tại của nhóm |
| `nextCursor` | Truyền vào `?cursor=` để lấy trang sau. **`null` = hết dữ liệu.** |

Lỗi:

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_COMMON_GROUPS_SELF` | 400 | `userId` là chính bạn — FE nên ẩn tab "Nhóm chung" trên profile của chính mình |
| `VALIDATION_ERROR` / Bad Request | 400 | `userId` không phải UUID v4, hoặc `cursor`/`limit` sai format |
| `AUTH_*` | 401 | Token thiếu/hết hạn (xem [01-authentication.md](./01-authentication.md)) |

---

## Flow gợi ý: tab "Nhóm chung" trong profile

1. Mở profile user khác → `GET /users/{id}` (đã có sẵn `friendship`, xem [24-profile.md](./24-profile.md)).
2. Vào tab "Nhóm chung" → gọi endpoint này lần đầu (không `cursor`).
3. Scroll cuối danh sách + `nextCursor != null` → gọi tiếp với `?cursor={nextCursor}`.
4. Bấm vào 1 nhóm → điều hướng vào conversation bằng `items[].id`.

```ts
// hooks/useCommonGroups.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CommonGroupItem {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  memberCount: number;
}

interface CommonGroupsPage {
  items: CommonGroupItem[];
  nextCursor: string | null;
}

export function useCommonGroups(userId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['common-groups', userId],
    enabled, // chỉ bật khi user mở tab "Nhóm chung" và userId != mình
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<{ data: CommonGroupsPage }>(
        `/conversations/common-groups/${userId}`,
        { params: { limit: 20, cursor: pageParam } },
      );
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
```

```tsx
// Tab "Nhóm chung" — ví dụ render
const { data, fetchNextPage, hasNextPage, isFetching } = useCommonGroups(
  profile.id,
  activeTab === 'common-groups' && !profile.isMe,
);

const groups = data?.pages.flatMap((p) => p.items) ?? [];

return (
  <>
    {groups.length === 0 && !isFetching && <Empty text="Chưa có nhóm chung" />}
    {groups.map((g) => (
      <GroupRow
        key={g.id}
        name={g.name ?? 'Nhóm không tên'}
        avatarUrl={g.avatarUrl}
        subtitle={`${g.memberCount} thành viên`}
        onClick={() => router.push(`/chat/${g.id}`)}
      />
    ))}
    {hasNextPage && <LoadMore onClick={() => fetchNextPage()} loading={isFetching} />}
  </>
);
```

Lưu ý UI:
- Profile **của chính mình** (`isMe=true` từ `/users/:id`) → **ẩn tab** này, đừng gọi API (sẽ nhận 400).
- Danh sách rỗng có 2 nghĩa: không có nhóm chung **hoặc** user không tồn tại — UI chỉ cần
  hiển thị "Chưa có nhóm chung", không cần phân biệt.
- `avatarUrl` là URL ký sẵn theo time-window — cache theo hướng dẫn [19-media-url-caching.md](./19-media-url-caching.md).
