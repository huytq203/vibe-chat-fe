# Message List Virtualization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Virtualize AiMessageList và MessageList bằng @tanstack/react-virtual để tránh lag khi list dài.

**Architecture:** Dynamic height virtualization với measureElement — chỉ render items trong viewport + overscan. AiMessageList rewrite trực tiếp. MessageList tách scroll/virtual logic sang hook `useVirtualChatScroll` để giữ component < 200 dòng.

**Tech Stack:** @tanstack/react-virtual v3.13.24 (đã có trong package.json), React 19, TypeScript strict.

## Global Constraints

- Không `any`, không `@ts-ignore`, không `eslint-disable` (trừ khi có comment giải thích).
- Component < 200 dòng, function < 50 dòng, hook < 80 dòng — quá thì tách.
- Không thêm lib mới — chỉ dùng `@tanstack/react-virtual` đã có.
- Dynamic height dùng `measureElement` (không fixed height).
- `estimateSize: () => 72` làm default, `overscan: 5`.
- Không sửa file trong `src/components/ui/`.
- Dùng `cn()` từ `@/lib/utils/cn` cho Tailwind class.

---

## File Map

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/features/chat/components/layout/AiMessageList.tsx` | Sửa | Thêm virtualizer, thay messages.map bằng virtual items |
| `src/features/chat/hooks/useVirtualChatScroll.ts` | Tạo mới | Hook tách scroll/virtual/jump logic cho MessageList |
| `src/features/chat/components/messages/MessageList.tsx` | Sửa | Dùng hook, thay messages.map bằng virtual items |

---

## Task A: Virtualize AiMessageList

**Files:**
- Modify: `src/features/chat/components/layout/AiMessageList.tsx`

**Interfaces:**
- Consumes: `AiMessage`, `AiAttachmentMeta` từ `@/features/chat/hooks/useAiSessions` (không đổi)
- Props `AiMessageListProps` giữ nguyên: `{ messages: AiMessage[]; loading: boolean; error: string | null }`

- [ ] **Step A-1: Đọc file hiện tại**

```bash
cat src/features/chat/components/layout/AiMessageList.tsx
```

- [ ] **Step A-2: Thêm import useVirtualizer**

Thêm vào đầu file sau các imports hiện tại:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
```

- [ ] **Step A-3: Thay toàn bộ nội dung AiMessageList**

Thay toàn bộ export function AiMessageList thành:

```tsx
export function AiMessageList({ messages, loading, error }: AiMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    if (messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages.length, virtualizer]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }

  function scrollToBottom() {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollBtn(false);
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Bắt đầu cuộc trò chuyện với AI</p>
          </div>
        )}

        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const msg = messages[virtualItem.index];
            if (!msg) return null;
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '12px',
                }}
              >
                <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-1.5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {msg.attachments.map((a, i) => (
                              <AttachmentDisplay key={i} attachment={a} />
                            ))}
                          </div>
                        )}
                        {msg.content && (
                          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                        )}
                      </div>
                    ) : (
                      <AiMessageContent content={msg.content} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-start pt-1">
            <div className="rounded-2xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              <span className="animate-pulse">Đang trả lời...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>
        )}
      </div>

      {showScrollBtn && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground shadow-md"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Xuống cuối
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step A-4: Kiểm tra TypeScript**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | grep AiMessageList
```
Expected: không có output.

- [ ] **Step A-5: Kiểm tra số dòng**

```bash
wc -l src/features/chat/components/layout/AiMessageList.tsx
```
Expected: ≤ 150 dòng.

- [ ] **Step A-6: Commit**

```bash
git add src/features/chat/components/layout/AiMessageList.tsx
git commit -m "feat(chat): virtualize AiMessageList với @tanstack/react-virtual dynamic height"
```

---

## Task B: Hook `useVirtualChatScroll`

**Files:**
- Create: `src/features/chat/hooks/useVirtualChatScroll.ts`

**Interfaces:**
- Produces:
```ts
export interface VirtualChatScrollOptions {
  messages: Message[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  sendError: string | undefined;
  otherTypingCount: number;
  onAtBottom?: () => void;
}

export interface VirtualChatScrollResult {
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  showScrollDown: boolean;
  highlightId: string | null;
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string, allMessages: Message[]) => void;
  handleScroll: () => void;
  setHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
}
```

- [ ] **Step B-1: Tạo file hook**

Tạo `src/features/chat/hooks/useVirtualChatScroll.ts`:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/features/chat/types';

export interface VirtualChatScrollOptions {
  messages: Message[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  sendError: string | undefined;
  otherTypingCount: number;
  onAtBottom?: () => void;
}

export interface VirtualChatScrollResult {
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  showScrollDown: boolean;
  highlightId: string | null;
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string, allMessages: Message[]) => void;
  handleScroll: () => void;
  setHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useVirtualChatScroll({
  messages,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  sendError,
  otherTypingCount,
  onAtBottom,
}: VirtualChatScrollOptions): VirtualChatScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const wasScrolledDownRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const scrollToBottom = useCallback((): void => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    setShowScrollDown(false);
  }, [virtualizer, messages.length]);

  const scrollToMessage = useCallback(
    (messageId: string, allMessages: Message[]): void => {
      const idx = allMessages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
      setHighlightId(messageId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
    },
    [virtualizer],
  );

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrolledDown = distanceFromBottom > 240;
    if (wasScrolledDownRef.current && !isScrolledDown) onAtBottom?.();
    wasScrolledDownRef.current = isScrolledDown;
    setShowScrollDown(isScrolledDown);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, onAtBottom]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages, virtualizer]);

  useEffect(() => {
    if (!sendError) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [sendError, virtualizer, messages.length]);

  useEffect(() => {
    if (otherTypingCount === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [otherTypingCount, virtualizer, messages.length]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  return { scrollRef, virtualizer, showScrollDown, highlightId, scrollToBottom, scrollToMessage, handleScroll, setHighlightId };
}
```

- [ ] **Step B-2: Kiểm tra TypeScript**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | grep useVirtualChatScroll
```
Expected: không có output.

- [ ] **Step B-3: Kiểm tra số dòng**

```bash
wc -l src/features/chat/hooks/useVirtualChatScroll.ts
```
Expected: ≤ 90 dòng (có thể hơn 80 một chút vì interface definitions — acceptable).

- [ ] **Step B-4: Commit**

```bash
git add src/features/chat/hooks/useVirtualChatScroll.ts
git commit -m "feat(chat): hook useVirtualChatScroll — virtual + scroll + highlight tách khỏi MessageList"
```

---

## Task C: Virtualize MessageList

**Files:**
- Modify: `src/features/chat/components/messages/MessageList.tsx`

**Interfaces:**
- Consumes (mới): `useVirtualChatScroll` từ `@/features/chat/hooks/useVirtualChatScroll`
- Props `MessageListProps` giữ nguyên

**Quan trọng:** Đọc file `MessageList.tsx` kỹ trước khi sửa. Các dòng số trong plan là approximate — tìm theo pattern/content, không theo số dòng cứng.

- [ ] **Step C-1: Đọc file hiện tại**

```bash
cat src/features/chat/components/messages/MessageList.tsx
```

- [ ] **Step C-2: Thêm import**

Thêm vào imports:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useVirtualChatScroll } from '@/features/chat/hooks/useVirtualChatScroll';
```

- [ ] **Step C-3: Thay thế scroll state + refs + callbacks bằng hook**

Xóa các khai báo sau trong body component (tìm theo content):
```tsx
// XÓA các dòng này:
const scrollRef = useRef<HTMLDivElement>(null);
const lastIdRef = useRef<string | null>(null);
const wasScrolledDownRef = useRef(false);
const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [highlightId, setHighlightId] = useState<string | null>(null);
const [showScrollDown, setShowScrollDown] = useState(false);
```

Xóa các hàm callback (scrollToBottom, scrollToMessage, handleScroll) và các useEffect liên quan đến scroll/auto-scroll.

Thêm sau `otherTypingIds` useMemo:
```tsx
const {
  scrollRef,
  virtualizer,
  showScrollDown,
  highlightId,
  scrollToBottom,
  scrollToMessage,
  handleScroll,
} = useVirtualChatScroll({
  messages,
  hasNextPage: hasNextPage ?? false,
  isFetchingNextPage,
  fetchNextPage,
  sendError,
  otherTypingCount: otherTypingIds.length,
  onAtBottom,
});
```

- [ ] **Step C-4: Cập nhật scrollToMessage call sites**

Tìm và sửa tất cả nơi gọi `scrollToMessage`:
```tsx
// Cũ:
scrollToMessage(jumpTarget.id)
// Mới:
scrollToMessage(jumpTarget.id, messages)

// Cũ:
onQuoteClick={scrollToMessage}
// Mới:
onQuoteClick={(id) => scrollToMessage(id, messages)}
```

- [ ] **Step C-5: Thay phần render messages bằng virtual items**

Thay toàn bộ phần `messages.map(...)` bên trong scroll container:

```tsx
{/* Thêm loading state khi fetch more */}
{isFetchingNextPage && (
  <div className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</div>
)}

{/* Virtual scroller container */}
<div
  style={{
    height: virtualizer.getTotalSize(),
    width: '100%',
    position: 'relative',
  }}
>
  {virtualizer.getVirtualItems().map((virtualItem) => {
    const m = messages[virtualItem.index];
    if (!m) return null;
    const prev = messages[virtualItem.index - 1];
    const showAvatar = m.senderId !== meId && (!prev || prev.senderId !== m.senderId);
    const repliedTo = m.replyToMessageId
      ? (messageById.get(m.replyToMessageId) ?? null)
      : null;
    const repliedToName = repliedTo
      ? repliedTo.senderId === meId
        ? 'Bạn'
        : (memberNames[repliedTo.senderId] ?? null)
      : null;
    return (
      <div
        key={m.id}
        data-index={virtualItem.index}
        ref={virtualizer.measureElement}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualItem.start}px)`,
          paddingBottom: '4px',
        }}
      >
        <MessageBubble
          message={m}
          meId={meId}
          showAvatar={showAvatar}
          senderName={memberNames[m.senderId] ?? null}
          showSenderName={showSenderNames && showAvatar}
          senderAvatarUrl={memberAvatars[m.senderId] ?? null}
          senderSeed={m.senderId}
          repliedTo={repliedTo}
          repliedToName={repliedToName}
          onQuoteClick={(id) => scrollToMessage(id, messages)}
          isHighlighted={highlightId === m.id}
          canPin={canPin}
          isPinned={pinnedIds.has(m.id)}
          leaderLabel={showLeaderBadges ? getLeaderLabel(memberRoles[m.senderId]) : null}
        />
      </div>
    );
  })}
</div>
```

- [ ] **Step C-6: Kiểm tra TypeScript**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step C-7: Kiểm tra số dòng**

```bash
wc -l src/features/chat/components/messages/MessageList.tsx src/features/chat/hooks/useVirtualChatScroll.ts
```
Expected: MessageList ≤ 200 dòng.

- [ ] **Step C-8: Build check**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npm run build 2>&1 | tail -20
```
Expected: build thành công.

- [ ] **Step C-9: Commit**

```bash
git add src/features/chat/components/messages/MessageList.tsx
git commit -m "feat(chat): virtualize MessageList với useVirtualChatScroll — dynamic height, overscan 5"
```

---

## Verification cuối

- [ ] **Step V-1: TypeScript toàn codebase**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step V-2: Không có any/ts-ignore**

```bash
grep -rn "any\|@ts-ignore" \
  src/features/chat/components/layout/AiMessageList.tsx \
  src/features/chat/components/messages/MessageList.tsx \
  src/features/chat/hooks/useVirtualChatScroll.ts
```
Expected: không có kết quả.

- [ ] **Step V-3: Xác nhận commits**

```bash
git log --oneline -5
```
Expected: thấy 3 commits:
- feat(chat): virtualize MessageList với useVirtualChatScroll
- feat(chat): hook useVirtualChatScroll
- feat(chat): virtualize AiMessageList với @tanstack/react-virtual
