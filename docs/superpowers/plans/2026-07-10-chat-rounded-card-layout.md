# Chat Rounded Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the chat layout shell (nav rail, conversation list, chat header, message bubbles, message input, contact info panel, mobile dock) from flush-bordered panels into large-radius "floating card" panels separated by gap, per the imported HaloChat Rounded design — while keeping the existing dark Charcoal+Cyan color palette untouched.

**Architecture:** Pure Tailwind className edits on existing components — no new components, no logic changes, no new dependencies. A new `--radius-2xl` CSS token is added for the floating-card radius; `gap`/`padding` replace the `border-r`/`border-l`/`border-t`/`border-b` seams between panels.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme` tokens in `src/styles/index.css`), Vitest + Testing Library.

## Global Constraints

- Do NOT change any color token or hex value — Charcoal+Cyan palette stays exactly as-is (spec §"Quyết định phạm vi").
- Button radius stays ≤12px (`--radius-lg`) — this plan never touches button classes, only container/panel classes.
- New token name: `--radius-2xl` = `1.25rem` (20px), added to `src/styles/index.css` `@theme` block, distinct from the existing `--radius-xl` (16px, used for modals).
- Scope is the layout shell only: `NavSidebar`, `MobileTabBar`, `ConversationList`, `ChatHeader`, `ChatPanel`, `MessageInput`, `MessageBubble`, `ContactInfo`, `ChatLayout`. Do NOT touch dialogs/popovers/sub-panels (`AddMembersDialog`, `PollBubble`, `WallpaperPickerDialog`, `GroupSettingsPanel`, `BannedMembersPanel`, `AdminsPanel`, `JoinRequestsPanel`, `MessageSearchPanel`, `PinnedMessagesPanel`, etc.) or any business logic/hooks/stores.
- Full source spec: `docs/superpowers/specs/2026-07-10-chat-rounded-card-layout-design.md`.

## Testing Strategy Note

Several target components (`ConversationList`, `ContactInfo`, `MessageInput`, `MobileTabBar`, `ChatLayout`, `ChatPanel`) are wired to many live hooks (TanStack Query, Zustand stores, realtime, media APIs). Mocking all of their dependencies just to assert a Tailwind class string would require large, brittle mock scaffolding with near-zero regression value, since this plan makes **no logic changes** to any of them. For those, this plan uses a **manual browser verification** step instead of an RTL render test (per `CLAUDE.md`: "For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete").

For the three components cheap to render in isolation (`NavSidebar`, `MessageBubble`, `ChatHeader`), this plan adds real RTL smoke tests that lock the new class contract (`rounded-2xl` present, old border class absent).

---

### Task 1: Add `--radius-2xl` design token

**Files:**
- Modify: `src/styles/index.css:114-118`

**Interfaces:**
- Produces: Tailwind utility class `rounded-2xl` mapped to `1.25rem` (20px), usable by every later task.

- [ ] **Step 1: Add the token**

In `src/styles/index.css`, inside the `@theme` block, right after the existing radius scale:

```css
    /* ─── Kraken-inspired radius scale ───────────────────────────────────────── */
    --radius-sm: 0.375rem;   /* 6px  — badges, tags */
    --radius-md: 0.5rem;     /* 8px  — tooltips, popovers */
    --radius-lg: 0.75rem;    /* 12px — buttons, inputs, cards */
    --radius-xl: 1rem;       /* 16px — modals, large containers */
    --radius-2xl: 1.25rem;   /* 20px — floating card khung: sidebar/list/header/input/panel */
```

- [ ] **Step 2: Verify the token is picked up**

Run: `grep -n "radius-2xl" src/styles/index.css`
Expected: one line showing `--radius-2xl: 1.25rem;`

Run: `npx tailwindcss --input src/styles/index.css --output /tmp/claude-1000/-home-huytq-code-my-fe-vibe-chat-fe/e3183ea0-1c7a-44bd-8825-257cc502f2a5/scratchpad/tw-check.css --content './src/**/*.{ts,tsx}'`
Expected: exits 0 without errors (confirms the `@theme` block still parses).

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css
git commit -m "feat(chat): add radius-2xl token for floating card layout"
```

---

### Task 2: NavSidebar — floating rounded card

**Files:**
- Modify: `src/features/chat/components/layout/NavSidebar.tsx:41`
- Test: `src/features/chat/components/layout/NavSidebar.test.tsx` (create)

**Interfaces:**
- Consumes: `--radius-2xl` token from Task 1 (via `rounded-2xl` class), `--shadow-subtle` token (already exists, via `shadow-subtle` class).
- Produces: no exported symbol changes — `NavSidebar` keeps its existing `Props` signature (`activeSection`, `onSectionChange`).

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/components/layout/NavSidebar.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavSidebar } from './NavSidebar';

vi.mock('@/features/chat/hooks/useNavUnread', () => ({
  useNavUnread: () => ({ messageCount: 0, notifCount: 0, total: 0 }),
}));

describe('NavSidebar', () => {
  it('renders as a rounded floating card without a border seam', () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('rounded-2xl');
    expect(nav.className).not.toMatch(/\bborder-r\b/);
  });

  it('still renders all four nav items', () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kho của tôi' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/chat/components/layout/NavSidebar.test.tsx`
Expected: FAIL on the first test — `nav` does not have class `rounded-2xl` (current class is `border-r border-border`, no `rounded-2xl`).

- [ ] **Step 3: Update NavSidebar's root class**

In `src/features/chat/components/layout/NavSidebar.tsx`, line 41, change:

```tsx
    <nav className="flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
```

to:

```tsx
    <nav className="flex h-full w-14 shrink-0 flex-col items-center rounded-2xl bg-sidebar py-3 shadow-subtle">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/chat/components/layout/NavSidebar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/layout/NavSidebar.tsx src/features/chat/components/layout/NavSidebar.test.tsx
git commit -m "feat(chat): give NavSidebar a floating rounded-card style"
```

---

### Task 3: MessageBubble — uniform rounded corners (drop the "tail" corner)

**Files:**
- Modify: `src/features/chat/components/messages/MessageBubble.tsx:185-199`
- Test: `src/features/chat/components/messages/MessageBubble.test.tsx` (create)

**Interfaces:**
- Consumes: `Message` type from `@/features/chat/types` (already defined, no changes).
- Produces: no exported signature changes — `MessageBubble` keeps its existing `MessageBubbleProps`.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/components/messages/MessageBubble.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { Message } from '@/features/chat/types';
import { MessageBubble } from './MessageBubble';

// Dialog mở profile cần next/navigation router context không có trong test — mock như RichText.test.tsx.
vi.mock('@/features/chat/components/contact/UserProfileDialog', () => ({
  UserProfileDialog: () => null,
}));

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-2',
    type: 'TEXT',
    encryptionType: 'SERVER',
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

describe('MessageBubble', () => {
  it('uses uniform rounded-2xl corners for my own message (no tail cut)', () => {
    const { container } = renderWithProviders(
      <MessageBubble message={buildMessage({ senderId: 'me' })} meId="me" showAvatar={false} />,
    );
    const bubble = container.querySelector('.rounded-2xl') as HTMLElement;
    expect(bubble).toHaveClass('rounded-2xl');
    expect(bubble.className).not.toMatch(/rounded-br-md/);
    expect(bubble.className).not.toMatch(/rounded-bl-md/);
  });

  it('uses uniform rounded-2xl corners for the other person message (no tail cut)', () => {
    const { container } = renderWithProviders(
      <MessageBubble message={buildMessage({ senderId: 'other' })} meId="me" showAvatar={false} />,
    );
    const bubble = container.querySelector('.rounded-2xl') as HTMLElement;
    expect(bubble).toHaveClass('rounded-2xl', 'border', 'border-border');
    expect(bubble.className).not.toMatch(/rounded-bl-md/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/chat/components/messages/MessageBubble.test.tsx`
Expected: FAIL — bubble className still contains `rounded-br-md` (mine) / `rounded-bl-md` (other).

- [ ] **Step 3: Remove the tail-corner classes**

In `src/features/chat/components/messages/MessageBubble.tsx`, lines 185-199, change:

```tsx
        <div
          className={cn(
            "relative rounded-2xl transition-all",
            isVisualMedia ? "p-1.5" : "px-3.5 py-2.5",
            !hasTheme && (isMe
              ? "rounded-br-md bg-primary text-primary-foreground"
              : wallpaperActive
                ? "rounded-bl-md border border-border/40 bg-background text-foreground"
                : "rounded-bl-md border border-border bg-muted text-foreground"),
            hasTheme && (isMe ? "rounded-br-md" : "rounded-bl-md border border-white/10"),
            isFailed && "border border-danger/60",
            isHighlighted &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
```

to:

```tsx
        <div
          className={cn(
            "relative rounded-2xl transition-all",
            isVisualMedia ? "p-1.5" : "px-3.5 py-2.5",
            !hasTheme && (isMe
              ? "bg-primary text-primary-foreground"
              : wallpaperActive
                ? "border border-border/40 bg-background text-foreground"
                : "border border-border bg-muted text-foreground"),
            hasTheme && !isMe && "border border-white/10",
            isFailed && "border border-danger/60",
            isHighlighted &&
              "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/chat/components/messages/MessageBubble.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/messages/MessageBubble.tsx src/features/chat/components/messages/MessageBubble.test.tsx
git commit -m "feat(chat): use uniform rounded corners on message bubbles"
```

---

### Task 4: ChatHeader — floating rounded card

**Files:**
- Modify: `src/features/chat/components/layout/ChatHeader.tsx:51`
- Test: `src/features/chat/components/layout/ChatHeader.test.tsx` (create)

**Interfaces:**
- Consumes: `Conversation` type from `@/features/chat/types` (no changes).
- Produces: no exported signature changes — `ChatHeader` keeps its existing `ChatHeaderProps`.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/components/layout/ChatHeader.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import type { Conversation } from '@/features/chat/types';
import { ChatHeader } from './ChatHeader';

vi.mock('@/features/call', () => ({
  CallButtons: () => null,
  buildCallDirectory: () => ({}),
}));

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'me',
    encryptionType: 'SERVER',
    memberCount: 2,
    messageCount: 5,
    memberIds: ['me', 'user-2'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    ...overrides,
  };
}

describe('ChatHeader', () => {
  it('renders as a rounded floating card without a bottom border seam', () => {
    const { container } = renderWithProviders(
      <ChatHeader
        conversation={buildConversation()}
        meId="me"
        presence={null}
        rightOpen={false}
        onToggleRight={() => {}}
      />,
    );
    const header = container.firstElementChild as HTMLElement;
    expect(header).toHaveClass('rounded-2xl', 'shadow-subtle');
    expect(header.className).not.toMatch(/\bborder-b\b/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/chat/components/layout/ChatHeader.test.tsx`
Expected: FAIL — header still has `border-b border-border`, no `rounded-2xl`/`shadow-subtle`.

- [ ] **Step 3: Update ChatHeader's root class**

In `src/features/chat/components/layout/ChatHeader.tsx`, line 51, change:

```tsx
    <div className={cn('flex shrink-0 items-center justify-between border-b border-border px-4 py-3', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

to:

```tsx
    <div className={cn('flex shrink-0 items-center justify-between rounded-2xl px-4 py-3 shadow-subtle', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/chat/components/layout/ChatHeader.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/layout/ChatHeader.tsx src/features/chat/components/layout/ChatHeader.test.tsx
git commit -m "feat(chat): give ChatHeader a floating rounded-card style"
```

---

### Task 5: ChatPanel + MessageInput — stacked cards with gap

**Files:**
- Modify: `src/features/chat/components/layout/ChatPanel.tsx:125-153`
- Modify: `src/features/chat/components/messages/MessageInput.tsx:149`

**Interfaces:**
- Consumes: `ChatHeader` (Task 4), `MessageInput`, `MessageList` — no signature changes to any of them.
- Produces: no exported signature changes.

No automated test for this task (see "Testing Strategy Note" — `ChatPanel` pulls in `useAuthStore`, `useIsMobile`, `useChatUIStore`, `useSelectedConversation`, `useConversation`, `usePresence`, `useMarkRead`, `useConvLockStore`, `useWallpaper`; `MessageInput` pulls in `useMessageComposer` and `useVoiceMessage`, which touch `MediaRecorder`/browser APIs). Verified manually in Task 9.

- [ ] **Step 1: Space out ChatPanel's column**

In `src/features/chat/components/layout/ChatPanel.tsx`, line 127, change:

```tsx
      className={cn('flex h-full min-w-0 flex-1 flex-col', !wallpaperActive && 'bg-background')}
```

to:

```tsx
      className={cn('flex h-full min-w-0 flex-1 flex-col gap-3', !wallpaperActive && 'bg-background')}
```

- [ ] **Step 2: Round the "admins only" fallback bar**

In the same file, line 153, change:

```tsx
            <div className={cn('shrink-0 border-t border-border px-4 py-3 text-center text-[12.5px] text-muted-foreground', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

to:

```tsx
            <div className={cn('shrink-0 rounded-2xl px-4 py-3 text-center text-[12.5px] text-muted-foreground shadow-subtle', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

- [ ] **Step 3: Round MessageInput's root card**

In `src/features/chat/components/messages/MessageInput.tsx`, line 149, change:

```tsx
    <div className={cn('shrink-0 border-t border-border px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

to:

```tsx
    <div className={cn('shrink-0 rounded-2xl px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-subtle', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/layout/ChatPanel.tsx src/features/chat/components/messages/MessageInput.tsx
git commit -m "feat(chat): stack ChatHeader/MessageInput as gapped floating cards"
```

---

### Task 6: ConversationList — floating rounded card

**Files:**
- Modify: `src/features/chat/components/conversations/ConversationList.tsx:163`

No automated test (see "Testing Strategy Note" — pulls in 10+ live hooks/stores). Verified manually in Task 9.

- [ ] **Step 1: Update ConversationList's root class**

In `src/features/chat/components/conversations/ConversationList.tsx`, line 163, change:

```tsx
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
```

to:

```tsx
    <aside className="flex h-full w-full shrink-0 flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-subtle md:w-[300px] md:min-w-[260px]">
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/conversations/ConversationList.tsx
git commit -m "feat(chat): give ConversationList a floating rounded-card style"
```

---

### Task 7: ContactInfo — floating rounded card

**Files:**
- Modify: `src/features/chat/components/contact/ContactInfo.tsx:133`

No automated test (see "Testing Strategy Note" — `useContactInfor` aggregates many hooks). Verified manually in Task 9. Only the top-level "info" view wrapper is touched — the sub-panels it can switch to (`GroupSettingsPanel`, `BannedMembersPanel`, `AdminsPanel`, `JoinRequestsPanel`, `MessageSearchPanel`, `PinnedMessagesPanel`) are out of scope per the spec and are NOT modified.

- [ ] **Step 1: Update ContactInfo's root class**

In `src/features/chat/components/contact/ContactInfo.tsx`, line 133, change:

```tsx
      <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
```

to:

```tsx
      <aside className="flex h-full w-full shrink-0 flex-col rounded-2xl bg-sidebar text-sidebar-foreground shadow-subtle md:w-[300px] md:min-w-[260px]">
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/contact/ContactInfo.tsx
git commit -m "feat(chat): give ContactInfo a floating rounded-card style"
```

---

### Task 8: MobileTabBar — floating rounded dock

**Files:**
- Modify: `src/features/chat/components/layout/MobileTabBar.tsx:94`

No automated test (see "Testing Strategy Note" — pulls in `useIncomingFriendRequests`, `useMutation`/`useQueryClient`, `useAuthStore`, `useChatUIStore`, `useSelectedConversation`). Verified manually in Task 9.

- [ ] **Step 1: Update MobileTabBar's root class**

In `src/features/chat/components/layout/MobileTabBar.tsx`, line 94, change:

```tsx
      <nav className="flex shrink-0 items-stretch border-t border-border bg-sidebar pb-safe">
```

to:

```tsx
      <nav className="flex shrink-0 items-stretch rounded-t-2xl bg-sidebar pb-safe shadow-subtle">
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/layout/MobileTabBar.tsx
git commit -m "feat(chat): give MobileTabBar a floating rounded-dock style"
```

---

### Task 9: ChatLayout — gap + padding around every desktop panel, then full verification

**Files:**
- Modify: `src/features/chat/components/layout/ChatLayout.tsx:102-158`

**Interfaces:**
- Consumes: `NavSidebar` (Task 2), `ConversationList` (Task 6), `ChatPanel` (Task 5), `ContactInfo` (Task 7) — all already updated to be self-rounded cards; this task only adds the surrounding gap/padding.

No automated test for the wrapper itself (see "Testing Strategy Note"). This task ends with the full manual verification pass for every task in this plan, since `ChatLayout` is the component that actually composes them all on screen.

- [ ] **Step 1: Add gap/padding to the `ai-full` branch**

In `src/features/chat/components/layout/ChatLayout.tsx`, lines 102-111, change:

```tsx
  if (activeSection === 'ai-full') {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <AiChatPage />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

to:

```tsx
  if (activeSection === 'ai-full') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <AiChatPage />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

- [ ] **Step 2: Add gap/padding to the `tasks` branch**

Lines 113-122, change:

```tsx
  if (activeSection === 'tasks') {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <TaskManagementLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

to:

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

- [ ] **Step 3: Add gap/padding to the `store` branch**

Lines 124-133, change:

```tsx
  if (activeSection === 'store') {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <MyStoreLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

to:

```tsx
  if (activeSection === 'store') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <MyStoreLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }
```

- [ ] **Step 4: Add gap/padding to the default `chat`/`ai` branch**

Lines 143-158, change:

```tsx
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop nav sidebar */}
      <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />

      {/* Left panel: ConversationList hoặc AiChatPanel */}
      {leftPanel}

      <ChatPanel />
      {rightPanelOpen && selectedConversationId && <ContactInfo />}

      <CallContainer />
      <InviteProfileModal />
    </div>
  );
```

to:

```tsx
  return (
    <div className="flex h-full w-full gap-3 overflow-hidden p-3">
      {/* Desktop nav sidebar */}
      <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />

      {/* Left panel: ConversationList hoặc AiChatPanel */}
      {leftPanel}

      <ChatPanel />
      {rightPanelOpen && selectedConversationId && <ContactInfo />}

      <CallContainer />
      <InviteProfileModal />
    </div>
  );
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Run the full automated test suite**

Run: `npx vitest run`
Expected: all tests PASS, including the 3 new test files from Tasks 2–4 and every pre-existing chat test (`permissions.test.ts`, `useReactions.test.ts`, `RichText.test.tsx`, `use-decrypted-previews.test.ts`, `useAiAttachments.test.ts`, `BrandIcons.test.tsx`, `LoginForm.test.tsx`).

- [ ] **Step 7: Manual browser verification**

Run: `npm run dev`

In a browser (desktop viewport ≥1280px, logged in with an existing account that has at least one conversation):
1. Open `/chat` — confirm: nav rail on the left is a rounded card with a visible gap from the edge and from the conversation list; conversation list is a rounded card; chat header is a rounded card at the top of the middle column; message input is a rounded card at the bottom; message bubbles have uniform rounded corners (no square "tail" corner) for both sent and received messages.
2. Click a conversation, then click the header to open the info panel — confirm the right `ContactInfo` panel is a rounded card with a gap from the chat column.
3. Switch to `/chat` with no conversation selected — confirm the empty-state screen still centers correctly with no layout regression.
4. Click the "AI Chat", "Tasks", and "Kho của tôi" nav icons — confirm each section still renders with the nav rail as a rounded card and no broken spacing.
5. Resize the window to a mobile width (<768px) — confirm the mobile conversation list / chat panel / contact panel still fill the screen correctly, and the bottom mobile tab bar (if applicable in your test account's flow) has rounded top corners.

Fix anything visually broken before proceeding. Note any deviations found back to the user before calling this complete.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/components/layout/ChatLayout.tsx
git commit -m "feat(chat): add gap+padding around floating panels in ChatLayout"
```

---

## Self-Review Notes

- **Spec coverage:** Every section of `2026-07-10-chat-rounded-card-layout-design.md` maps to a task — §1 token → Task 1; §2 `ChatLayout` gap → Task 9; §3 `NavSidebar` → Task 2, `ConversationList` → Task 6, `ChatPanel`/`ChatHeader`/`MessageInput` → Tasks 4–5, `MessageBubble` → Task 3, `ContactInfo` → Task 7, `MobileTabBar` → Task 8; §4 "không đổi" is enforced by each task's diff being class-only; §5 risks are covered by the manual verification checklist in Task 9 Step 7.
- **Type consistency:** All test fixtures (`buildMessage`, `buildConversation`) use the exact field names from `src/features/chat/types.ts` (`Message`, `Conversation`) as read from source — no invented fields.
- **No placeholders:** every step shows the literal before/after code; no "add appropriate styling" style steps remain.
