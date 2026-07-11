# AI Chat Popup Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the docked `AiChatPanel` (which currently replaces `ConversationList` in the sidebar) with a floating, draggable popup window `AiChatWindow` — modeled on the existing `CallWindow`/`CallContainer` pattern — so the conversation list stays visible while the AI chat floats on top.

**Architecture:** A new minimal Zustand store (`ai-window.store.ts`) holds `isOpen` + drag `position`. A new component `AiChatWindow.tsx` ports all business logic from `AiChatPanel.tsx` unchanged (sessions, attachments, Gemini call) but swaps the docked `<aside>` shell for a `fixed` card wrapped in `react-draggable` and rendered via `createPortal(document.body)`, exactly like `CallWindow`. `ChatLayout.tsx` stops branching the sidebar on `activeSection === 'ai'` and instead mounts `<AiChatWindow />` globally (alongside `<CallContainer />`) so it persists across section switches. The trigger in `MessageInput.tsx` opens the popup via the new store instead of switching `NavSection`. The now-dead `'ai'` `NavSection` value is removed.

**Tech Stack:** Next.js 16 (App Router, client components), React 19, Zustand, `react-draggable` (already a dependency, used by `CallWindow`), Vitest + Testing Library.

## Global Constraints

- Không `any`, không `@ts-ignore`/`eslint-disable` không giải thích (CLAUDE.md §0.1).
- Component < 200 dòng, hook < 80 dòng, file < 300 dòng (CLAUDE.md §0.2).
- Named export bắt buộc cho component (không phải Page/Layout) (rules/02-components.md).
- UI primitives lấy từ Basuicn (`@/components/ui/*`) — không tự viết Button (rules/02-components.md).
- `'use client'` ở component lá cần tương tác (rules/02-components.md).
- Đặt tên: `PascalCase.tsx` cho component, `kebab-case.ts` cho store file, `XxxProps` cho props type (rules/06-naming-structure.md).
- Component thuộc feature → `features/<x>/components/`, không tạo `features/<x>/api/` (rules/06-naming-structure.md — không áp dụng trực tiếp ở đây, không có API mới).
- Mọi thay đổi phải giữ `tsc --noEmit` sạch (pre-commit hook đã cấu hình chạy typecheck toàn dự án).

---

### Task 1: `ai-window.store.ts` — store vị trí/trạng thái popup

**Files:**
- Create: `src/features/chat/stores/ai-window.store.ts`
- Test: `src/features/chat/stores/ai-window.store.test.ts`

**Interfaces:**
- Produces: `useAiWindowStore` — Zustand hook exposing `{ isOpen: boolean; position: { x: number; y: number }; open(): void; close(): void; setPosition(x: number, y: number): void }`. Task 2 consumes this exact shape.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/stores/ai-window.store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useAiWindowStore } from './ai-window.store';

describe('ai-window.store', () => {
  beforeEach(() => useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } }));

  it('starts closed at origin', () => {
    const s = useAiWindowStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.position).toEqual({ x: 0, y: 0 });
  });

  it('open sets isOpen to true', () => {
    useAiWindowStore.getState().open();
    expect(useAiWindowStore.getState().isOpen).toBe(true);
  });

  it('close sets isOpen to false', () => {
    useAiWindowStore.getState().open();
    useAiWindowStore.getState().close();
    expect(useAiWindowStore.getState().isOpen).toBe(false);
  });

  it('setPosition updates position', () => {
    useAiWindowStore.getState().setPosition(15, 25);
    expect(useAiWindowStore.getState().position).toEqual({ x: 15, y: 25 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/chat/stores/ai-window.store.test.ts`
Expected: FAIL — `Cannot find module './ai-window.store'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/features/chat/stores/ai-window.store.ts`:

```ts
'use client';

import { create } from 'zustand';

type AiWindowPosition = { x: number; y: number };

type AiWindowState = {
  isOpen: boolean;
  position: AiWindowPosition;
  open: () => void;
  close: () => void;
  setPosition: (x: number, y: number) => void;
};

const INITIAL_POSITION: AiWindowPosition = { x: 0, y: 0 };

export const useAiWindowStore = create<AiWindowState>((set) => ({
  isOpen: false,
  position: INITIAL_POSITION,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPosition: (x, y) => set({ position: { x, y } }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/chat/stores/ai-window.store.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/stores/ai-window.store.ts src/features/chat/stores/ai-window.store.test.ts
git commit -m "feat(chat): add ai-window store for AI chat popup position/open state"
```

---

### Task 2: `AiChatWindow.tsx` — popup nổi kéo thả (thay `AiChatPanel`)

**Files:**
- Create: `src/features/chat/components/layout/AiChatWindow.tsx`
- Test: `src/features/chat/components/layout/AiChatWindow.test.tsx`

**Interfaces:**
- Consumes: `useAiWindowStore` (Task 1) — `isOpen`, `position`, `close()`, `setPosition(x, y)`. Also consumes existing `useAiSessions()`, `useAiAttachments()`, `useAutoResizeTextarea()`, `callGemini()`, `AiHistoryPanel`, `AiMessageList`, `AiChatInput` (all unchanged, already exist).
- Produces: `AiChatWindow` — named export, zero props (`export function AiChatWindow(): ...`). Task 3 renders `<AiChatWindow />` with no props.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/components/layout/AiChatWindow.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatWindow } from './AiChatWindow';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useParams: () => ({}),
}));

const callGemini = vi.fn();
vi.mock('@/lib/gemini', () => ({
  callGemini: (...args: unknown[]) => callGemini(...args),
}));

describe('AiChatWindow', () => {
  beforeEach(() => {
    localStorage.clear();
    useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } });
    callGemini.mockReset();
  });

  it('renders nothing when the store is closed', () => {
    render(<AiChatWindow />);
    expect(screen.queryByText('Halo AI')).not.toBeInTheDocument();
  });

  it('renders the popup when the store is open', () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    expect(screen.getByText('Halo AI')).toBeInTheDocument();
  });

  it('close button closes the store without a "back" navigation', async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText('Đóng cửa sổ AI'));
    expect(useAiWindowStore.getState().isOpen).toBe(false);
  });

  it('history toggle shows the empty history state', async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText('Lịch sử hội thoại'));
    expect(screen.getByText('Chưa có cuộc trò chuyện nào')).toBeInTheDocument();
  });

  it('sends a message and renders the Gemini reply', async () => {
    callGemini.mockResolvedValue('Xin chào');
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    const textarea = screen.getByPlaceholderText('Nhắn tin với AI...');
    await userEvent.type(textarea, 'Chào bạn');
    await userEvent.click(screen.getByLabelText('Gửi'));

    await waitFor(() => expect(screen.getByText('Xin chào')).toBeInTheDocument());
    expect(callGemini).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/chat/components/layout/AiChatWindow.test.tsx`
Expected: FAIL — `Cannot find module './AiChatWindow'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/chat/components/layout/AiChatWindow.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { type DraggableData } from 'react-draggable';
import { Bot, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAiSessions } from '@/features/chat/hooks/useAiSessions';
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';
import { callGemini } from '@/lib/gemini';
import { AiHistoryPanel } from './AiHistoryPanel';
import { AiMessageList } from './AiMessageList';
import { AiChatInput } from './AiChatInput';

export function AiChatWindow() {
  const isOpen = useAiWindowStore((s) => s.isOpen);
  const position = useAiWindowStore((s) => s.position);
  const close = useAiWindowStore((s) => s.close);
  const setPosition = useAiWindowStore((s) => s.setPosition);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession } =
    useAiSessions();
  const messages = activeSession?.messages ?? [];

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { if (isOpen) focusInput(); }, [isOpen, focusInput]);

  function handleNewChat() {
    setActiveId(null);
    setInput('');
    setError(null);
    clearAttachments();
    setShowHistory(false);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    let sid = activeId;
    if (!sid) sid = createSession();

    const currentMessages = sessions.find((s) => s.id === sid)?.messages ?? [];
    const capturedAttachments = attachments;

    const userMsg: AiMessage = {
      role: 'user',
      content: trimmed,
      attachments: capturedAttachments.map(({ name, mimeType, size, previewUrl }) => ({
        name,
        mimeType,
        size,
        previewUrl,
      })),
    };
    const nextMessages = [...currentMessages, userMsg];

    pushMessage(sid, userMsg);
    setInput('');
    clearAttachments();
    setLoading(true);
    setError(null);

    try {
      const content = await callGemini(nextMessages, capturedAttachments);
      pushMessage(sid, { role: 'assistant', content });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  if (!isOpen || typeof document === 'undefined') return null;

  const card = (
    <div
      ref={nodeRef}
      className="pointer-events-auto fixed bottom-6 right-6 z-60 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="ai-drag-handle flex min-w-0 flex-1 cursor-move items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="truncate text-sm font-bold tracking-tight">Halo AI</span>
        </div>
        <div className="no-drag flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleNewChat}
            aria-label="Tạo hội thoại mới"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={showHistory ? 'solid' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setShowHistory((v) => !v)}
            aria-label="Lịch sử hội thoại"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={close}
            aria-label="Đóng cửa sổ AI"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {showHistory ? (
        <AiHistoryPanel
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setShowHistory(false); }}
          onDelete={deleteSession}
        />
      ) : (
        <>
          <AiMessageList messages={messages} loading={loading} error={error} />
          <AiChatInput
            input={input}
            loading={loading}
            attachments={attachments}
            attachmentError={attachmentError}
            textareaRef={textareaRef}
            onInputChange={setInput}
            onResize={resize}
            onKeyDown={handleTextareaKeyDown}
            onSend={() => void handleSend()}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
          />
        </>
      )}
    </div>
  );

  return createPortal(
    <Draggable
      nodeRef={nodeRef as RefObject<HTMLElement>}
      handle=".ai-drag-handle"
      cancel=".no-drag"
      position={position}
      onStop={(_e, data: DraggableData) => setPosition(data.x, data.y)}
      bounds="body"
    >
      {card}
    </Draggable>,
    document.body,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/chat/components/layout/AiChatWindow.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/layout/AiChatWindow.tsx src/features/chat/components/layout/AiChatWindow.test.tsx
git commit -m "feat(chat): add draggable AiChatWindow popup replacing docked AiChatPanel"
```

---

### Task 3: Wire `AiChatWindow` into `ChatLayout`, remove `AiChatPanel`

**Files:**
- Modify: `src/features/chat/components/layout/ChatLayout.tsx`
- Delete: `src/features/chat/components/layout/AiChatPanel.tsx`

**Interfaces:**
- Consumes: `AiChatWindow` from Task 2 (no props).

- [ ] **Step 1: Swap the import**

In `src/features/chat/components/layout/ChatLayout.tsx`, replace:

```ts
import { NavSidebar } from './NavSidebar';
import { AiChatPanel } from './AiChatPanel';
import { AiChatPage } from './AiChatPage';
```

with:

```ts
import { NavSidebar } from './NavSidebar';
import { AiChatWindow } from './AiChatWindow';
import { AiChatPage } from './AiChatPage';
```

- [ ] **Step 2: Mount `<AiChatWindow />` in the mobile branch**

Replace:

```tsx
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobilePanel === 'list' && <ConversationList />}
          {mobilePanel === 'chat' && <ChatPanel />}
          {mobilePanel === 'contact' && selectedConversationId && <ContactInfo />}
        </div>
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

with:

```tsx
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobilePanel === 'list' && <ConversationList />}
          {mobilePanel === 'chat' && <ChatPanel />}
          {mobilePanel === 'contact' && selectedConversationId && <ContactInfo />}
        </div>
        <CallContainer />
        <AiChatWindow />
        <InviteProfileModal />
      </div>
    );
  }
```

- [ ] **Step 3: Mount `<AiChatWindow />` in the `tasks` branch**

Replace:

```tsx
  if (activeSection === 'tasks') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <TaskManagementLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

with:

```tsx
  if (activeSection === 'tasks') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <TaskManagementLayout />
        <CallContainer />
        <AiChatWindow />
        <InviteProfileModal />
      </div>
    );
  }
```

- [ ] **Step 4: Mount `<AiChatWindow />` in the `store` branch**

Replace:

```tsx
  if (activeSection === 'store') {
    return (
      <div style={storeBackgroundStyle} className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <MyStoreLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

with:

```tsx
  if (activeSection === 'store') {
    return (
      <div style={storeBackgroundStyle} className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <MyStoreLayout />
        <CallContainer />
        <AiChatWindow />
        <InviteProfileModal />
      </div>
    );
  }
```

Note: the `ai-full` branch (dedicated `/ai` page, right above the `tasks` branch) is intentionally **left untouched** — no `<AiChatWindow />` there, per spec §3, to avoid two AI chat UIs on screen at once.

- [ ] **Step 5: Drop the `leftPanel` branch, mount `<AiChatWindow />` in the default (chat) branch**

Replace:

```tsx
  // Xác định panel trái hiển thị dựa theo activeSection
  const leftPanel =
    activeSection === 'ai' ? (
      <AiChatPanel />
    ) : (
      <ConversationList />
    );

  return (
    <div style={backgroundStyle} className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Desktop nav sidebar */}
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />

        {/* Left panel: ConversationList hoặc AiChatPanel */}
        {leftPanel}

        <ChatPanel />
        {rightPanelOpen && selectedConversationId && <ContactInfo />}
      </div>

      <CallContainer />
      <InviteProfileModal />
    </div>
  );
}
```

with:

```tsx
  return (
    <div style={backgroundStyle} className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Desktop nav sidebar */}
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />

        <ConversationList />

        <ChatPanel />
        {rightPanelOpen && selectedConversationId && <ContactInfo />}
      </div>

      <CallContainer />
      <AiChatWindow />
      <InviteProfileModal />
    </div>
  );
}
```

- [ ] **Step 6: Delete the old docked panel**

```bash
git rm src/features/chat/components/layout/AiChatPanel.tsx
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (no remaining references to `AiChatPanel` or the deleted file).

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/components/layout/ChatLayout.tsx
git commit -m "refactor(chat): mount AiChatWindow globally in ChatLayout, drop docked AiChatPanel"
```

---

### Task 4: Open the popup from `MessageInput`

**Files:**
- Modify: `src/features/chat/components/messages/MessageInput.tsx`

**Interfaces:**
- Consumes: `useAiWindowStore` (Task 1) — uses `useAiWindowStore.getState().open()`.

**Note on scope:** `useChatUIStore` is imported in this file solely to read `setActiveSection`, which is used exactly once, at the `onAiClick` call site being replaced below. After this task, nothing else in the file references `useChatUIStore` — so both the binding and the import are removed, not just the call site.

- [ ] **Step 1: Swap the `useChatUIStore` import for `useAiWindowStore`**

Replace:

```ts
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { cn } from '@/lib/utils/cn';
```

with:

```ts
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';
import { cn } from '@/lib/utils/cn';
```

- [ ] **Step 2: Remove the `setActiveSection` binding**

Replace:

```ts
  const { recorder, sending, stopAndSend } = useVoiceMessage(conversationId);
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);
```

with:

```ts
  const { recorder, sending, stopAndSend } = useVoiceMessage(conversationId);
```

- [ ] **Step 3: Replace the click handler**

Replace:

```ts
      onAiClick={() => setActiveSection('ai')}
```

with:

```ts
      onAiClick={() => useAiWindowStore.getState().open()}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors, no unused-variable warnings (confirms no other usage of `useChatUIStore` was missed in this file).

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open the chat screen, click the AI icon in the message composer's "more actions" menu. Expected: `ConversationList` stays visible, `AiChatWindow` popup appears bottom-right, draggable by its header, closes via the X button.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/components/messages/MessageInput.tsx
git commit -m "feat(chat): open AiChatWindow popup from message composer instead of docked panel"
```

---

### Task 5: Remove the dead `'ai'` `NavSection` value

**Files:**
- Modify: `src/features/chat/stores/chat-ui.store.ts`
- Modify: `src/features/chat/hooks/useSectionNav.ts`
- Modify: `src/features/chat/components/layout/NavSidebar.tsx`

**Interfaces:**
- Produces: `NavSection = 'chat' | 'ai-full' | 'tasks' | 'store'` (narrowed from the current 5-value union). No other task consumes this type change directly, but it must compile against `NavSidebar.test.tsx` and `ChatLayout.tsx` (Task 3) unchanged.

- [ ] **Step 1: Narrow the type in `chat-ui.store.ts`**

Replace:

```ts
export type NavSection = 'chat' | 'ai' | 'ai-full' | 'tasks' | 'store';
```

with:

```ts
export type NavSection = 'chat' | 'ai-full' | 'tasks' | 'store';
```

- [ ] **Step 2: Simplify `useSectionNav.ts`**

Replace the whole file content with:

```ts
'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChatUIStore, type NavSection } from '@/features/chat/stores/chat-ui.store';

/** URL ứng với từng section top-level — nguồn sự thật để section sống sót khi refresh. */
const SECTION_PATH = {
  chat: '/chat',
  'ai-full': '/ai',
  tasks: '/work',
  store: '/store',
} as const;

type SectionNav = {
  activeSection: NavSection;
  goToSection: (section: NavSection) => void;
};

/** Section top-level (chat/ai-full/tasks/store) lấy từ pathname để không mất khi F5. */
export function useSectionNav(): SectionNav {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);

  const isWork = pathname === '/work' || pathname.startsWith('/work/');
  const isAi = pathname === '/ai' || pathname.startsWith('/ai/');
  const isStore = pathname === '/store' || pathname.startsWith('/store/');
  const activeSection: NavSection = isWork ? 'tasks' : isAi ? 'ai-full' : isStore ? 'store' : 'chat';

  const goToSection = useCallback(
    (section: NavSection) => {
      setActiveSection(section);
      router.push(SECTION_PATH[section]);
    },
    [router, setActiveSection],
  );

  return { activeSection, goToSection };
}
```

(`storeSection` is no longer read since `activeSection` is now derived purely from `pathname`; `setActiveSection` is still called so the store stays in sync for any other reader.)

- [ ] **Step 3: Simplify `NavSidebar.tsx` active-state check**

Replace:

```tsx
        {NAV_ITEMS.map(({ section, icon, label }) => {
          // Panel AI trong chat (section 'ai') vẫn thuộc khu vực Chat → giữ icon Chat sáng.
          const isActive = section === 'chat' ? activeSection === 'chat' || activeSection === 'ai' : activeSection === section;
          return (
```

with:

```tsx
        {NAV_ITEMS.map(({ section, icon, label }) => {
          const isActive = activeSection === section;
          return (
```

- [ ] **Step 4: Run the existing NavSidebar test**

Run: `npx vitest run src/features/chat/components/layout/NavSidebar.test.tsx`
Expected: PASS (both existing tests still pass unchanged).

- [ ] **Step 5: Typecheck and full test suite**

Run: `npx tsc --noEmit`
Expected: no errors — confirms no remaining code references the removed `'ai'` `NavSection` value.

Run: `npm run test`
Expected: all tests pass, including the new `ai-window.store.test.ts` and `AiChatWindow.test.tsx` from Tasks 1–2.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/stores/chat-ui.store.ts src/features/chat/hooks/useSectionNav.ts src/features/chat/components/layout/NavSidebar.tsx
git commit -m "refactor(chat): drop dead 'ai' NavSection value now that AI chat is a popup"
```
