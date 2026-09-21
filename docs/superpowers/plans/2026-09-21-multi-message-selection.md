# Chọn nhiều tin nhắn để phân tích — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chế độ "chọn nhiều tin nhắn" trong chat, cho phép PM chọn 1 chuỗi tin nhắn rồi bấm
"Phân tích đã chọn" để mở `MessageAnalysisDialog` (đã có sẵn, nhận `messageIds: string[]`) với
nhiều id thay vì luôn chỉ 1.

**Architecture:** 1 Zustand store mới (`message-selection.store.ts`, không persist) là nguồn sự thật
duy nhất cho "đang chọn tin nào". `MessageActions`/`MessageActionDrawer` chỉ gọi `enter()` để bật chế
độ chọn. `MessageBubble` render checkbox overlay khi được `MessageList` đánh dấu `selectable`.
`MessageList` mount toolbar bulk-action mới và tái dùng nguyên `MessageAnalysisDialog`.

**Tech Stack:** React, Zustand, Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-21-multi-message-selection-design.md`

## Global Constraints

- KHÔNG dùng `any`. Named export cho hook/store; component React export theo convention từng file
  đã đọc (named export, khớp toàn bộ file liên quan trong plan này).
- UI text tiếng Việt. Mô tả test ưu tiên tiếng Việt (convention đa số trong repo — KHÔNG bắt buộc
  tiền tố "nên", chỉ cần mô tả rõ hành vi bằng tiếng Việt, khác quy tắc chặt của backend).
- Cap 50 tin nhắn/lần chọn — khớp giới hạn `GET .../messages/by-ids` đã có ở backend.
- KHÔNG đổi `MessageAnalysisDialog.tsx`/`MessageAnalysisPreview.tsx`/hook `useConfirmSuggestion` —
  milestone trước đã xong, chỉ tái dùng nguyên trạng.
- Chỉ bật chọn nhiều ở chat chính (`MessageList.tsx`) — KHÔNG bật ở surface "My Store"
  (`MessageBubble` dùng `appearance="store"` ở nơi khác, không truyền `selectable` ở đó).

---

## Task 1: Store `message-selection` + điểm vào menu (desktop + mobile)

**Files:**
- Create: `src/features/chat/stores/message-selection.store.ts`
- Test: `src/features/chat/stores/message-selection.store.test.ts`
- Modify: `src/features/chat/components/messages/MessageActions.tsx`
- Create: `src/features/chat/components/messages/MessageActions.test.tsx`
- Modify: `src/features/chat/components/messages/MessageActionDrawer.tsx`
- Create: `src/features/chat/components/messages/MessageActionDrawer.test.tsx`

**Interfaces:**
- Produces: `useMessageSelectionStore` với state `{ conversationId: string | null; selectedIds:
  Set<string> }` và action `enter(conversationId, firstMessageId)`, `toggle(messageId)`, `exit()` —
  Task 2 (MessageBubble) và Task 3 (MessageList/Toolbar) dùng trực tiếp.

- [ ] **Step 1: Viết test trước cho store (TDD)**

```ts
// src/features/chat/stores/message-selection.store.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageSelectionStore } from './message-selection.store';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() });
});

describe('message-selection.store', () => {
  it('enter bật chế độ chọn với 1 tin nhắn ban đầu', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBe('conv-1');
    expect(state.selectedIds).toEqual(new Set(['m1']));
  });

  it('toggle thêm tin nhắn mới vào danh sách đã chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m2');
    expect(useMessageSelectionStore.getState().selectedIds).toEqual(
      new Set(['m1', 'm2']),
    );
  });

  it('toggle bỏ tin nhắn đã chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m2');
    useMessageSelectionStore.getState().toggle('m1');
    expect(useMessageSelectionStore.getState().selectedIds).toEqual(new Set(['m2']));
  });

  it('bỏ chọn hết tin nhắn cuối cùng thì tự thoát chế độ chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m1');
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBeNull();
    expect(state.selectedIds.size).toBe(0);
  });

  it('exit tắt chế độ chọn và xoá hết danh sách', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().exit();
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBeNull();
    expect(state.selectedIds.size).toBe(0);
  });

  it('không thêm quá 50 tin nhắn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm0');
    for (let i = 1; i < 50; i++) {
      useMessageSelectionStore.getState().toggle(`m${i}`);
    }
    expect(useMessageSelectionStore.getState().selectedIds.size).toBe(50);
    useMessageSelectionStore.getState().toggle('m-thu-51');
    expect(useMessageSelectionStore.getState().selectedIds.size).toBe(50);
    expect(
      useMessageSelectionStore.getState().selectedIds.has('m-thu-51'),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/chat/stores/message-selection.store.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết store**

```ts
// src/features/chat/stores/message-selection.store.ts
'use client';

import { create } from 'zustand';
import { toast } from 'sonner';

const MAX_SELECTED = 50;

type MessageSelectionState = {
  conversationId: string | null;
  selectedIds: Set<string>;
  enter: (conversationId: string, firstMessageId: string) => void;
  toggle: (messageId: string) => void;
  exit: () => void;
};

/**
 * Chế độ "chọn nhiều tin nhắn" để phân tích hàng loạt — chia sẻ giữa MessageActions/
 * MessageActionDrawer (nơi bật chế độ chọn), MessageBubble (checkbox overlay) và
 * MessageList/MessageSelectionToolbar (đếm số lượng + hành động). Không persist —
 * chọn nhiều là thao tác tạm thời trong 1 phiên xem hội thoại.
 */
export const useMessageSelectionStore = create<MessageSelectionState>((set, get) => ({
  conversationId: null,
  selectedIds: new Set(),
  enter: (conversationId, firstMessageId) =>
    set({ conversationId, selectedIds: new Set([firstMessageId]) }),
  toggle: (messageId) => {
    const { selectedIds } = get();
    const next = new Set(selectedIds);
    if (next.has(messageId)) {
      next.delete(messageId);
    } else {
      if (next.size >= MAX_SELECTED) {
        toast.error(`Chỉ chọn tối đa ${MAX_SELECTED} tin nhắn`);
        return;
      }
      next.add(messageId);
    }
    if (next.size === 0) {
      set({ conversationId: null, selectedIds: next });
      return;
    }
    set({ selectedIds: next });
  },
  exit: () => set({ conversationId: null, selectedIds: new Set() }),
}));
```

- [ ] **Step 4: Run test, xác nhận PASS**

Run: `npx vitest run src/features/chat/stores/message-selection.store.test.ts`
Expected: PASS, 6/6 test.

- [ ] **Step 5: Thêm điểm vào ở `MessageActions.tsx` (desktop)**

Thêm import:

```ts
import { CheckSquare, Copy, Flag, Forward, MoreVertical, Pencil, Pin, PinOff, Quote, Sparkles, Trash2 } from 'lucide-react';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';
```

Trong component, lấy action từ store (KHÔNG qua `useMessageActions` — action này chỉ set store,
không có mutation/dialog nào liên quan):

```ts
const enterSelection = useMessageSelectionStore((s) => s.enter);
```

Thêm `DropdownMenuItem` mới, đặt ngay dưới mục "Phân tích và xử lý" đã có:

```tsx
<DropdownMenuItem
  onClick={() => enterSelection(message.conversationId, message.id)}
>
  <CheckSquare className="h-4 w-4" />
  Chọn nhiều tin nhắn
</DropdownMenuItem>
```

- [ ] **Step 6: Viết test cho `MessageActions.tsx`**

```tsx
// src/features/chat/components/messages/MessageActions.test.tsx
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { MessageActions } from './MessageActions';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

vi.mock('@/features/chat/hooks/useForwardMessage', () => ({
  useForwardMessage: () => ({ forward: vi.fn() }),
}));

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: 'Hi',
    attachments: [],
    contentPreview: 'Hi',
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: new Date('2026-07-10T08:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('MessageActions', () => {
  it('nên gọi enter với đúng conversationId/messageId khi bấm Chọn nhiều tin nhắn', async () => {
    const user = userEvent.setup();
    const message = buildMessage();
    renderWithProviders(
      <MessageActions message={message} meId="user-1" isMe={false} />,
    );

    await user.click(screen.getByRole('button', { name: 'Tùy chọn tin nhắn' }));
    await user.click(await screen.findByText('Chọn nhiều tin nhắn'));

    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBe('conv-1');
    expect(state.selectedIds.has('msg-1')).toBe(true);
  });
});
```

> Kiểm tra `MessageBubble.test.tsx` đã có sẵn (mock `useForwardMessage`, `use-mutations`, ...) để
> copy đúng mock cần thiết nếu `MessageActions` render lỗi thiếu context — dùng `import { screen }
> from '@testing-library/react'` (thêm vào đầu file nếu thiếu).

- [ ] **Step 7: Run test Step 6, sửa tới khi PASS**

Run: `npx vitest run src/features/chat/components/messages/MessageActions.test.tsx`
Expected: PASS.

- [ ] **Step 8: Thêm điểm vào ở `MessageActionDrawer.tsx` (mobile)**

Thêm import:

```ts
import { CheckSquare, Copy, Flag, Forward, Pencil, Pin, PinOff, Quote, Sparkles, Trash2 } from 'lucide-react';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';
```

Trong component:

```ts
const enterSelection = useMessageSelectionStore((s) => s.enter);
```

Thêm vào mảng `items`, ngay sau mục `analyze`:

```ts
{
  key: 'select',
  icon: <CheckSquare className="h-5 w-5" />,
  label: 'Chọn nhiều tin nhắn',
  onClick: run(() => enterSelection(message.conversationId, message.id)),
  show: true,
},
```

- [ ] **Step 9: Viết test cho `MessageActionDrawer.tsx`**

```tsx
// src/features/chat/components/messages/MessageActionDrawer.test.tsx
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { MessageActionDrawer } from './MessageActionDrawer';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

vi.mock('@/features/chat/hooks/useForwardMessage', () => ({
  useForwardMessage: () => ({ forward: vi.fn() }),
}));

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: 'Hi',
    attachments: [],
    contentPreview: 'Hi',
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: new Date('2026-07-10T08:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('MessageActionDrawer', () => {
  it('nên gọi enter với đúng conversationId/messageId khi bấm Chọn nhiều tin nhắn', async () => {
    const user = userEvent.setup();
    const message = buildMessage();
    renderWithProviders(
      <MessageActionDrawer
        message={message}
        meId="user-1"
        isMe={false}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(await screen.findByText('Chọn nhiều tin nhắn'));

    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBe('conv-1');
    expect(state.selectedIds.has('msg-1')).toBe(true);
  });
});
```

- [ ] **Step 10: Run test Step 9, sửa tới khi PASS**

Run: `npx vitest run src/features/chat/components/messages/MessageActionDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 11: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/chat/stores/message-selection.store.ts src/features/chat/stores/message-selection.store.test.ts src/features/chat/components/messages/MessageActions.tsx src/features/chat/components/messages/MessageActions.test.tsx src/features/chat/components/messages/MessageActionDrawer.tsx src/features/chat/components/messages/MessageActionDrawer.test.tsx`
Expected: không lỗi.

- [ ] **Step 12: Commit**

```bash
git add src/features/chat/stores/message-selection.store.ts src/features/chat/stores/message-selection.store.test.ts src/features/chat/components/messages/MessageActions.tsx src/features/chat/components/messages/MessageActions.test.tsx src/features/chat/components/messages/MessageActionDrawer.tsx src/features/chat/components/messages/MessageActionDrawer.test.tsx
git commit -m "feat(chat): store chọn nhiều tin nhắn + điểm vào menu desktop/mobile"
```

---

## Task 2: Checkbox overlay trên `MessageBubble`

**Files:**
- Modify: `src/features/chat/components/messages/MessageBubble.tsx`
- Modify: `src/features/chat/components/messages/MessageBubble.test.tsx`

**Interfaces:**
- Consumes: `useMessageSelectionStore` (Task 1) — chỉ dùng `getState().toggle(...)` trong handler,
  KHÔNG subscribe (giữ nguyên tối ưu memo hiện có, xem spec §4).
- Produces: `MessageBubble` nhận thêm 2 prop optional `selectable?: boolean; selected?: boolean` —
  Task 3 (MessageList) truyền vào.

- [ ] **Step 1: Đọc `MessageBubble.test.tsx` hiện có, hiểu pattern render/mock**

Không viết test mới độc lập trước — thêm case vào file test đã có (đủ ngữ cảnh render sẵn: mock
`UserProfileDialog`, `use-mutations`, `ImageLightbox`).

- [ ] **Step 2: Viết test cho overlay (thêm vào cuối `describe` phù hợp trong file đã có)**

```tsx
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

// ...trong describe('MessageBubble', ...) đã có, thêm các it() sau:

it('nên hiện checkbox overlay khi selectable=true', () => {
  renderWithProviders(
    <LightboxProvider>
      <MessageBubble
        message={buildMessage()}
        meId="user-1"
        showAvatar
        selectable
        selected={false}
      />
    </LightboxProvider>,
  );
  expect(
    screen.getByRole('button', { name: 'Chọn tin nhắn' }),
  ).toBeInTheDocument();
});

it('nên hiện trạng thái đã chọn khi selected=true', () => {
  renderWithProviders(
    <LightboxProvider>
      <MessageBubble
        message={buildMessage()}
        meId="user-1"
        showAvatar
        selectable
        selected
      />
    </LightboxProvider>,
  );
  expect(
    screen.getByRole('button', { name: 'Bỏ chọn tin nhắn' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

it('nên gọi toggle với đúng messageId khi bấm overlay, không kích hoạt onQuoteClick', async () => {
  const user = userEvent.setup();
  const onQuoteClick = vi.fn();
  const message = buildMessage({ replyToMessageId: 'm0' });
  renderWithProviders(
    <LightboxProvider>
      <MessageBubble
        message={message}
        meId="user-1"
        showAvatar
        selectable
        selected={false}
        onQuoteClick={onQuoteClick}
      />
    </LightboxProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Chọn tin nhắn' }));

  expect(useMessageSelectionStore.getState().selectedIds.has(message.id)).toBe(true);
  expect(onQuoteClick).not.toHaveBeenCalled();
});
```

> Kiểm tra file test hiện có đã import `screen`/`userEvent`/`vi` chưa — nếu thiếu, thêm vào import
> đầu file thay vì import lại trong từng `it`. Reset store giữa các test bằng `beforeEach(() =>
> useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() }))` nếu file
> chưa có `beforeEach` tương tự — đặt cạnh `beforeEach` khác nếu đã có, không tạo 2 khối riêng.

- [ ] **Step 3: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/chat/components/messages/MessageBubble.test.tsx`
Expected: FAIL — thiếu prop `selectable`/`selected` trên `MessageBubbleProps` (lỗi TS) hoặc
`getByRole` không tìm thấy.

- [ ] **Step 4: Thêm prop + render overlay trong `MessageBubble.tsx`**

Thêm vào `MessageBubbleProps` (cạnh các prop optional khác):

```ts
/** Đang ở chế độ chọn nhiều tin nhắn và tin này chọn được (canActions ở MessageList). */
selectable?: boolean;
/** Tin này đang nằm trong danh sách đã chọn. */
selected?: boolean;
```

Thêm vào destructure tham số hàm:

```ts
selectable = false,
selected = false,
```

Thêm import ở đầu file:

```ts
import { Check } from "lucide-react";
import { useMessageSelectionStore } from "@/features/chat/stores/message-selection.store";
```

Trong JSX, bên trong `div[data-message-surface]`, thêm overlay làm **con đầu tiên** (trước
`{actionsMenu}`):

```tsx
{selectable && (
  <button
    type="button"
    aria-label={selected ? "Bỏ chọn tin nhắn" : "Chọn tin nhắn"}
    aria-pressed={selected}
    onClick={(e) => {
      e.stopPropagation();
      useMessageSelectionStore.getState().toggle(message.id);
    }}
    className={cn(
      "absolute inset-0 z-30 rounded-2xl",
      selected ? "bg-primary/15 ring-2 ring-primary" : "bg-transparent",
    )}
  >
    <span
      className={cn(
        "absolute top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2",
        isMe ? "right-1.5" : "left-1.5",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background",
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
    </span>
  </button>
)}
```

- [ ] **Step 5: Run test, xác nhận PASS**

Run: `npx vitest run src/features/chat/components/messages/MessageBubble.test.tsx`
Expected: PASS toàn bộ (test cũ + 3 test mới).

- [ ] **Step 6: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/chat/components/messages/MessageBubble.tsx src/features/chat/components/messages/MessageBubble.test.tsx`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/features/chat/components/messages/MessageBubble.tsx src/features/chat/components/messages/MessageBubble.test.tsx
git commit -m "feat(chat): checkbox overlay chọn tin nhắn trên MessageBubble"
```

---

## Task 3: Toolbar bulk-action + wiring vào `MessageList`

**Files:**
- Create: `src/features/chat/components/messages/MessageSelectionToolbar.tsx`
- Test: `src/features/chat/components/messages/MessageSelectionToolbar.test.tsx`
- Modify: `src/features/chat/components/messages/MessageList.tsx`

**Interfaces:**
- Consumes: `useMessageSelectionStore` (Task 1); `selectable`/`selected` prop của `MessageBubble`
  (Task 2); `MessageAnalysisDialog` (đã có, không đổi).

- [ ] **Step 1: Viết test trước cho `MessageSelectionToolbar` (TDD)**

```tsx
// src/features/chat/components/messages/MessageSelectionToolbar.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MessageSelectionToolbar } from './MessageSelectionToolbar';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

beforeEach(() => {
  useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() });
});

describe('MessageSelectionToolbar', () => {
  it('nên không render gì khi không đang chọn trong conversation này', () => {
    const { container } = render(
      <MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('nên hiện đúng số lượng tin nhắn đã chọn', () => {
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2', 'm3']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />);
    expect(screen.getByText('Đã chọn 3 tin nhắn')).toBeInTheDocument();
  });

  it('nên gọi onAnalyze với mảng id đã chọn rồi thoát chế độ chọn', async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1', 'm2']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={onAnalyze} />);

    await user.click(screen.getByRole('button', { name: 'Phân tích đã chọn' }));

    expect(onAnalyze).toHaveBeenCalledWith(expect.arrayContaining(['m1', 'm2']));
    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });

  it('nên thoát chế độ chọn khi bấm Huỷ', async () => {
    const user = userEvent.setup();
    useMessageSelectionStore.setState({
      conversationId: 'conv-1',
      selectedIds: new Set(['m1']),
    });
    render(<MessageSelectionToolbar conversationId="conv-1" onAnalyze={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(useMessageSelectionStore.getState().conversationId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, xác nhận FAIL**

Run: `npx vitest run src/features/chat/components/messages/MessageSelectionToolbar.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết `MessageSelectionToolbar.tsx`**

```tsx
// src/features/chat/components/messages/MessageSelectionToolbar.tsx
'use client';

import { Button } from '@/components/ui/button/Button';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

type Props = {
  conversationId: string;
  onAnalyze: (messageIds: string[]) => void;
};

export function MessageSelectionToolbar({ conversationId, onAnalyze }: Props) {
  const selection = useMessageSelectionStore();

  if (selection.conversationId !== conversationId) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <span className="text-sm font-medium text-foreground">
        Đã chọn {selection.selectedIds.size} tin nhắn
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={selection.exit}>
          Huỷ
        </Button>
        <Button
          size="sm"
          onClick={() => {
            const ids = [...selection.selectedIds];
            selection.exit();
            onAnalyze(ids);
          }}
        >
          Phân tích đã chọn
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, xác nhận PASS**

Run: `npx vitest run src/features/chat/components/messages/MessageSelectionToolbar.test.tsx`
Expected: PASS, 4/4 test.

- [ ] **Step 5: Wiring vào `MessageList.tsx`**

Thêm import:

```ts
import { useMessageSelectionStore } from "@/features/chat/stores/message-selection.store";
import { MessageAnalysisDialog } from "./MessageAnalysisDialog";
import { MessageSelectionToolbar } from "./MessageSelectionToolbar";
```

Trong component (sau các hook khác, trước `return`):

```ts
const selection = useMessageSelectionStore();
const [analysisMessageIds, setAnalysisMessageIds] = useState<string[] | null>(null);

useEffect(() => {
  return () => {
    if (useMessageSelectionStore.getState().conversationId === conversationId) {
      useMessageSelectionStore.getState().exit();
    }
  };
}, [conversationId]);
```

Sửa vòng lặp render bubble — tính thêm 2 biến trước `return (` của mỗi item (đặt cạnh
`repliedToName`/`isNew` đã có):

```ts
const selectionActiveHere = selection.conversationId === conversationId;
const selectableHere =
  selectionActiveHere &&
  !m.isDeleted &&
  m.metadata?.optimistic !== true &&
  m.metadata?.failed !== true;
const selectedHere = selectionActiveHere && selection.selectedIds.has(m.id);
```

Truyền 2 prop mới vào `<MessageBubble ... />` đã có (thêm cuối danh sách prop):

```tsx
selectable={selectableHere}
selected={selectedHere}
```

Thêm `<MessageSelectionToolbar>` ngay dưới thẻ mở `<div className="animate-in fade-in relative isolate ...">`, **trước** `<div ref={scrollRef} ...>`:

```tsx
<MessageSelectionToolbar
  conversationId={conversationId}
  onAnalyze={setAnalysisMessageIds}
/>
```

Thêm `<MessageAnalysisDialog>` ngay trước thẻ đóng `</LightboxProvider>` cuối file (dialog độc lập
với dialog trong `MessageActionDialogs`, chỉ mở khi `analysisMessageIds !== null`):

```tsx
{analysisMessageIds && (
  <MessageAnalysisDialog
    open
    onOpenChange={(open) => {
      if (!open) setAnalysisMessageIds(null);
    }}
    conversationId={conversationId}
    messageIds={analysisMessageIds}
  />
)}
```

- [ ] **Step 6: Build + lint**

Run: `npx tsc --noEmit`
Run: `npx eslint src/features/chat/components/messages/MessageList.tsx src/features/chat/components/messages/MessageSelectionToolbar.tsx src/features/chat/components/messages/MessageSelectionToolbar.test.tsx`
Expected: không lỗi.

- [ ] **Step 7: Run toàn bộ test liên quan + full suite**

Run: `npx vitest run src/features/chat/components/messages src/features/chat/stores`
Expected: PASS toàn bộ (test cũ + mới của cả 3 task).

Run: `npx vitest run`
Expected: toàn bộ suite (kể cả phần không liên quan) vẫn PASS — không có regression.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/components/messages/MessageSelectionToolbar.tsx src/features/chat/components/messages/MessageSelectionToolbar.test.tsx src/features/chat/components/messages/MessageList.tsx
git commit -m "feat(chat): toolbar phân tích nhiều tin nhắn đã chọn, wiring vào MessageList"
```
