# PATTERN — 4 trạng thái UI (loading / error / empty / data)

> BẮT BUỘC cho mọi component hiển thị data lấy từ API. Thiếu 1 trạng thái = chưa "done".

## Thứ tự xử lý (early return)
```tsx
"use client";
interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data, isLoading, isError, refetch } = useMessages(conversationId);

  if (isLoading) return <MessageListSkeleton />;           // 1. loading → skeleton
  if (isError) return <ErrorState onRetry={refetch} />;    // 2. error → fallback + retry
  if (!data || data.length === 0) return <EmptyState />;   // 3. empty
  return (                                                 // 4. data
    <ul>
      {data.map((m) => (
        <MessageItem key={m.id} message={m} />
      ))}
    </ul>
  );
}
```

## Quy tắc
- **Loading** → skeleton khớp layout thật (giảm layout shift), không spinner toàn trang nếu có thể.
- **Error** → thông điệp thân thiện + nút retry (`refetch`). KHÔNG hiện raw error/stack cho user.
- **Empty** → phân biệt rõ với loading; gợi ý hành động (CTA) nếu hợp lý.
- **Data** → render.
- Dùng component dùng chung: `components/common/EmptyState`, `ErrorState`, skeleton riêng theo feature.
- List dài (> 50 item đồng thời) → virtualize (`@tanstack/react-virtual`).

## Server Component
Tách phần fetch ở Server, dùng `loading.tsx` (route) + `error.tsx` (route) cho loading/error cấp route; empty/data xử lý trong component.
