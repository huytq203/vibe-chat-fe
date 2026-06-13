# TEMPLATE — Component

## Server Component (mặc định)
```tsx
// features/chat/components/ConversationHeader.tsx
import { cn } from "@/lib/utils";

interface ConversationHeaderProps {
  title: string;
  memberCount: number;
  className?: string;
}

export function ConversationHeader({ title, memberCount, className }: ConversationHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between px-4 py-3", className)}>
      <h2 className="text-[22px] font-semibold text-[#101114]">{title}</h2>
      <span className="text-sm text-[#9497a9]">{memberCount} thành viên</span>
    </header>
  );
}
```

## Client Component (khi cần tương tác)
```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReactionBarProps {
  messageId: string;
  onReact: (emoji: string) => void;
}

export function ReactionBar({ messageId, onReact }: ReactionBarProps) {
  const [open, setOpen] = useState(false);
  // ... đủ 4 trạng thái nếu có data; early return cho điều kiện lỗi
  return (
    <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-label="Thả cảm xúc">
      😀
    </Button>
  );
}
```

## Nhắc
- `interface XxxProps` ngay trên component · named export · `'use client'` chỉ ở lá cần.
- Token màu/spacing theo `Design/DESIGN.md` (ví dụ trên hardcode để minh hoạ — thực tế ưu tiên biến token).
- < 200 dòng. Test cạnh file: `ConversationHeader.test.tsx`.
