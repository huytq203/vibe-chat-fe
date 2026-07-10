# My Store Card Layout + Theme Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `MyStoreLayout` ("Kho của tôi") into separate floating cards (header, content, folder sidebar, info panel) matching the chat rounded-card pattern, and give it a theme-based background image (`banner.png` light / `background-2.webp` dark, same as chat) like the chat section already has.

**Architecture:** Extract the inline header block from `MyStoreLayout` into a new `MyStoreHeader` component styled as its own floating card. Restyle the existing `MyStoreInfoPanel` and `FolderSidebar` root elements from "glued" (`border-l`/`border-r`, opaque `bg-sidebar`) to "floating card" (`rounded-2xl border bg-sidebar/75 backdrop-blur-md shadow-subtle`). Recompose `MyStoreLayout` so header/content/folder-sidebar/info-panel are siblings separated by `gap-3`. Apply a theme-derived background image to the `store` branch wrapper in `ChatLayout.tsx`, reusing `getDefaultBackgroundImage` unchanged (shared with chat — light theme stays `banner.png`, dark stays `background-2.webp`; see Task 1 amendment below).

> **Amendment (post Task 1):** Task 1 originally changed light-theme background to `background-1.webp`. After implementation + review, the user reversed this decision: light theme keeps `banner.png` (chat behavior unchanged), Store shares the exact same `getDefaultBackgroundImage` function/values as chat — no separate Store background logic. `background-1.webp` is not used anywhere in this feature. Commit `23536f9` reverts Task 1's behavior change (keeps the doc-comment fix only). Task 6 below is unaffected in code — it already just calls `getDefaultBackgroundImage(currentTheme)` — only the resulting light-theme image differs from what was originally planned.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Vitest + Testing Library.

## Global Constraints

- No `any`, no `@ts-ignore`/`eslint-disable` without an explanatory comment.
- Component < 200 lines; function < 50 lines; file < 300 lines.
- Named exports for all components (except Next.js page/layout defaults — not applicable here).
- `interface XxxProps` declared directly above the component that uses it.
- Styling: Tailwind v4 utility classes only — no hardcoded hex colors outside `Design/DESIGN.md` tokens, no inline `style` except computed runtime values (e.g. background-image URL).
- Card/floating-panel treatment (established pattern, see `docs/superpowers/specs/2026-07-10-chat-rounded-card-layout-design.md`): `rounded-2xl` + `shadow-subtle`, translucent variants use `bg-sidebar/75 backdrop-blur-md` or `bg-background/75 backdrop-blur-md`, separated by `gap-3` — no `border-l`/`border-r`/`border-b`/`border-t` seams between sibling cards.
- Reference spec for this plan: `docs/superpowers/specs/2026-07-11-my-store-card-layout-design.md`.
- Out of scope (do not touch): mobile layout for Store (unreachable today — `ChatLayout`'s `isMobile` branch returns before the `store` branch), wallpaper picker for Store, `FilePanel`/`MyStoreFeed` internal logic, any dialog components (`BookmarkDialog`, `ChecklistDialog`, `ReminderDialog`, `FilePreviewDialog`, `ConfirmDialog`, `PromptDialog`).

---

### Task 1: Fix `getDefaultBackgroundImage` to use `background-1.webp` for light theme

**Files:**
- Modify: `src/lib/theme/themes.ts:396-398`
- Test: `src/lib/theme/themes.test.ts` (new)

**Interfaces:**
- Consumes: `Theme` type and `themes` array already exported from `src/lib/theme/themes.ts`.
- Produces: `getDefaultBackgroundImage(theme: Theme): string` — unchanged signature, only the light-theme return value changes. Later tasks (6) call this exact function, unchanged import path `@/lib/theme/themes`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDefaultBackgroundImage, themes } from './themes';

describe('getDefaultBackgroundImage', () => {
  it('trả về background-2.webp cho theme tối', () => {
    const darkTheme = themes.find((t) => t.isDark);
    if (!darkTheme) throw new Error('Không tìm thấy theme tối trong danh sách themes');
    expect(getDefaultBackgroundImage(darkTheme)).toBe('/asset/background-2.webp');
  });

  it('trả về background-1.webp cho theme sáng', () => {
    const lightTheme = themes.find((t) => !t.isDark);
    if (!lightTheme) throw new Error('Không tìm thấy theme sáng trong danh sách themes');
    expect(getDefaultBackgroundImage(lightTheme)).toBe('/asset/background-1.webp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/theme/themes.test.ts`
Expected: FAIL — the "trả về background-1.webp cho theme sáng" case fails because the current implementation returns `/asset/banner.png`.

- [ ] **Step 3: Fix the implementation**

In `src/lib/theme/themes.ts`, change:

```ts
export function getDefaultBackgroundImage(theme: Theme): string {
  return theme.isDark ? '/asset/background-2.webp' : '/asset/banner.png';
}
```

to:

```ts
export function getDefaultBackgroundImage(theme: Theme): string {
  return theme.isDark ? '/asset/background-2.webp' : '/asset/background-1.webp';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/theme/themes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/themes.ts src/lib/theme/themes.test.ts
git commit -m "fix(theme): use background-1.webp for light theme default background"
```

---

### Task 2: Create `MyStoreHeader` component

**Files:**
- Create: `src/features/my-store/components/MyStoreHeader.tsx`
- Test: `src/features/my-store/components/MyStoreHeader.test.tsx` (new)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils/cn`; `Archive`, `FolderOpen`, `MessageSquare` icons from `lucide-react`.
- Produces: `export type MyStoreTab = 'notes' | 'files'` and `export function MyStoreHeader({ activeTab, onTabChange }: { activeTab: MyStoreTab; onTabChange: (tab: MyStoreTab) => void })`. Task 5 imports both `MyStoreHeader` and `MyStoreTab` from this exact file.

- [ ] **Step 1: Write the failing test**

Create `src/features/my-store/components/MyStoreHeader.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MyStoreHeader } from './MyStoreHeader';

describe('MyStoreHeader', () => {
  it('renders as a rounded floating card without a bottom border seam', () => {
    const { container } = render(<MyStoreHeader activeTab="notes" onTabChange={() => {}} />);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('rounded-2xl');
    expect(header.className).not.toMatch(/\bborder-b\b/);
  });

  it('gọi onTabChange với "files" khi bấm tab File', () => {
    const onTabChange = vi.fn();
    render(<MyStoreHeader activeTab="notes" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /File/i }));
    expect(onTabChange).toHaveBeenCalledWith('files');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/my-store/components/MyStoreHeader.test.tsx`
Expected: FAIL with "Cannot find module './MyStoreHeader'".

- [ ] **Step 3: Write the component**

Create `src/features/my-store/components/MyStoreHeader.tsx`:

```tsx
'use client';

import { Archive, FolderOpen, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type MyStoreTab = 'notes' | 'files';

type MyStoreHeaderProps = {
  activeTab: MyStoreTab;
  onTabChange: (tab: MyStoreTab) => void;
};

/** Header card nổi của "Kho của tôi" — tách khỏi khung nội dung, khe hở lộ nền ảnh theo theme (giống ChatHeader). */
export function MyStoreHeader({ activeTab, onTabChange }: MyStoreHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-2xl border bg-sidebar/75 px-4 py-3 shadow-subtle backdrop-blur-md">
      <Archive className="h-5 w-5 text-primary" />
      <h1 className="text-base font-semibold">Kho của tôi</h1>

      <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => onTabChange('notes')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            activeTab === 'notes'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <MessageSquare className="h-3 w-3" />
          Ghi chú
        </button>
        <button
          type="button"
          onClick={() => onTabChange('files')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            activeTab === 'files'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FolderOpen className="h-3 w-3" />
          File
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/my-store/components/MyStoreHeader.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/MyStoreHeader.tsx src/features/my-store/components/MyStoreHeader.test.tsx
git commit -m "feat(my-store): extract MyStoreHeader as its own floating card"
```

---

### Task 3: Restyle `MyStoreInfoPanel` root into a floating card

**Files:**
- Modify: `src/features/my-store/components/MyStoreInfoPanel.tsx:72`
- Test: `src/features/my-store/components/MyStoreInfoPanel.test.tsx` (new)

**Interfaces:**
- Consumes: existing `MyStoreInfoPanel({ conversationId, onClose, onOpenFiles })` props — unchanged.
- Produces: no new exports; only the root `<aside>` className changes. Task 5 continues to import `MyStoreInfoPanel` the same way it does today.

- [ ] **Step 1: Write the failing test**

Create `src/features/my-store/components/MyStoreInfoPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreMessages: () => ({ data: undefined }),
}));
vi.mock('@/features/chat/components/contact/SharedTabs', () => ({
  SharedTabs: () => null,
}));
vi.mock('./QuotaBar', () => ({
  QuotaBar: () => null,
}));

describe('MyStoreInfoPanel', () => {
  it('renders as a rounded floating card without a left border seam', () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('rounded-2xl');
    expect(aside.className).not.toMatch(/\bborder-l\b/);
  });

  it('vẫn hiển thị tiêu đề Kho của tôi', () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    expect(screen.getByText('Kho của tôi')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/my-store/components/MyStoreInfoPanel.test.tsx`
Expected: FAIL — `toHaveClass('rounded-2xl')` fails because the current root class list is `flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]` (no `rounded-2xl`).

- [ ] **Step 3: Restyle the root**

In `src/features/my-store/components/MyStoreInfoPanel.tsx`, change line 72 from:

```tsx
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
```

to:

```tsx
    <aside className="flex h-full w-full shrink-0 flex-col rounded-2xl border bg-sidebar/75 text-sidebar-foreground shadow-subtle backdrop-blur-md md:w-[300px] md:min-w-[260px]">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/my-store/components/MyStoreInfoPanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/MyStoreInfoPanel.tsx src/features/my-store/components/MyStoreInfoPanel.test.tsx
git commit -m "feat(my-store): restyle MyStoreInfoPanel as a floating card"
```

---

### Task 4: Restyle `FolderSidebar` root into a floating card

**Files:**
- Modify: `src/features/my-store/components/FolderSidebar.tsx:131`
- Test: `src/features/my-store/components/FolderSidebar.test.tsx` (new)

**Interfaces:**
- Consumes: existing `FolderSidebar({ selectedFolderId, onSelectFolder })` props — unchanged.
- Produces: no new exports; only the root `<div>` className changes. Task 5 continues to import `FolderSidebar` the same way it does today.

- [ ] **Step 1: Write the failing test**

Create `src/features/my-store/components/FolderSidebar.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FolderSidebar } from './FolderSidebar';

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreFolders: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useCreateFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFolder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./QuotaBar', () => ({
  QuotaBar: () => null,
}));

describe('FolderSidebar', () => {
  it('renders as a rounded floating card without a right border seam', () => {
    const { container } = render(
      <FolderSidebar selectedFolderId={null} onSelectFolder={() => {}} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('rounded-2xl');
    expect(root.className).not.toMatch(/\bborder-r\b/);
  });

  it('vẫn hiển thị tiêu đề Thư mục', () => {
    render(<FolderSidebar selectedFolderId={null} onSelectFolder={() => {}} />);
    expect(screen.getByText('Thư mục')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/my-store/components/FolderSidebar.test.tsx`
Expected: FAIL — current root class list is `flex flex-col h-full border-r border-border w-56 shrink-0` (no `rounded-2xl`).

- [ ] **Step 3: Restyle the root**

In `src/features/my-store/components/FolderSidebar.tsx`, change line 131 from:

```tsx
    <div className="flex flex-col h-full border-r border-border w-56 shrink-0">
```

to:

```tsx
    <div className="flex flex-col h-full w-56 shrink-0 rounded-2xl border bg-sidebar/75 shadow-subtle backdrop-blur-md">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/my-store/components/FolderSidebar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/FolderSidebar.tsx src/features/my-store/components/FolderSidebar.test.tsx
git commit -m "feat(my-store): restyle FolderSidebar as a floating card"
```

---

### Task 5: Recompose `MyStoreLayout` into separated cards

**Files:**
- Modify: `src/features/my-store/components/MyStoreLayout.tsx` (full rewrite of the file body)
- Modify: `src/features/my-store/components/MyStoreComposer.tsx:50`

**Interfaces:**
- Consumes: `MyStoreHeader`/`MyStoreTab` from Task 2, restyled `MyStoreInfoPanel` from Task 3, restyled `FolderSidebar` from Task 4, existing `MyStoreFeed`, `MyStoreComposer`, `FilePanel`, `useStoreConversation`, `useStoreFolders`, `useMyStoreRealtime` (all unchanged signatures).
- Produces: `export function MyStoreLayout()` — same export name/signature as today. `ChatLayout.tsx` (Task 6) continues to import it unchanged from `@/features/my-store`.

No new test in this task: `MyStoreLayout` composes 5+ hook-heavy children (`useStoreFolders`, `useStoreConversation`, `useMyStoreRealtime`, plus each child's own query/mutation hooks) with no existing test or provider harness in this codebase (`ChatLayout.tsx` itself has none either, for the same reason — see Global Constraints). Each child's own contract is already covered by Tasks 2–4. Correctness of the composition is verified visually in Task 7.

- [ ] **Step 1: Rewrite `MyStoreLayout.tsx`**

Replace the full contents of `src/features/my-store/components/MyStoreLayout.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { FolderSidebar } from './FolderSidebar';
import { FilePanel } from './FilePanel';
import { MyStoreHeader, type MyStoreTab } from './MyStoreHeader';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';
import { useStoreConversation, useStoreFolders } from '@/features/my-store/hooks/use-query';
import { useMyStoreRealtime } from '@/features/my-store/hooks/useMyStoreRealtime';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<MyStoreTab>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders } = useStoreFolders();
  const { data: selfConv } = useStoreConversation();
  useMyStoreRealtime(selfConv?.id ?? null);

  const selectedFolder = folders?.find((f) => f.id === selectedFolderId) ?? null;

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <MyStoreHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 min-h-0 gap-3">
        {activeTab === 'notes' ? (
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
            <MyStoreFeed />
            <MyStoreComposer />
          </div>
        ) : (
          <>
            <FolderSidebar
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
            />
            <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
              {selectedFolderId ? (
                <FilePanel
                  folderId={selectedFolderId}
                  folderName={selectedFolder?.name ?? 'Thư mục'}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FolderOpen className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Chọn một thư mục để xem file</p>
                </div>
              )}
            </div>
          </>
        )}

        {selfConv?.id && (
          <MyStoreInfoPanel conversationId={selfConv.id} onOpenFiles={() => setActiveTab('files')} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remove the opaque background from `MyStoreComposer`**

In `src/features/my-store/components/MyStoreComposer.tsx`, change line 50 from:

```tsx
      <div className="border-t border-border bg-background p-3 flex flex-col gap-2">
```

to:

```tsx
      <div className="border-t border-border p-3 flex flex-col gap-2">
```

(The opaque `bg-background` painted over the translucent content card's `bg-background/75 backdrop-blur-md` from Step 1, hiding the blur effect at the bottom of the card.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full my-store test suite**

Run: `npx vitest run src/features/my-store`
Expected: PASS (all tests from Tasks 2–4, no regressions).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/MyStoreLayout.tsx src/features/my-store/components/MyStoreComposer.tsx
git commit -m "feat(my-store): recompose MyStoreLayout into separated floating cards"
```

---

### Task 6: Apply theme background image to the Store branch in `ChatLayout`

**Files:**
- Modify: `src/features/chat/components/layout/ChatLayout.tsx:52-61` (add a new const), and the `store` branch return block (currently lines 148-157).

**Interfaces:**
- Consumes: `getDefaultBackgroundImage` from `@/lib/theme/themes` (fixed in Task 1), `useTheme` from `@/lib/theme/ThemeProvider` — both already imported in this file. `CSSProperties` already imported from `react`.
- Produces: no new exports — internal `storeBackgroundStyle` const used only within this file's `store` branch.

No new test in this task: `ChatLayout.tsx` has no existing test file (it is a top-level route composition, same category as `MyStoreLayout` — see Global Constraints). Verified visually in Task 7.

- [ ] **Step 1: Add `storeBackgroundStyle`**

In `src/features/chat/components/layout/ChatLayout.tsx`, immediately after the existing `backgroundStyle` block (ends at line 61, right before `useChatRealtime();` on line 63), add:

```tsx
  // Nền Store luôn dùng ảnh mặc định theo theme — không có khái niệm wallpaper
  // riêng theo hội thoại như bên chat.
  const storeBackgroundStyle: CSSProperties = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${getDefaultBackgroundImage(currentTheme)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
```

- [ ] **Step 2: Apply it to the `store` branch**

Change:

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

to:

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

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/components/layout/ChatLayout.tsx
git commit -m "feat(chat): apply theme background image to the Store section"
```

---

### Task 7: Manual verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Confirm the dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/`
Expected: `307` or `200` (server up). If not running, start it with `npm run dev` from the project root and wait for it to be ready.

- [ ] **Step 2: Open Store in the browser, dark theme**

Navigate to `http://localhost:3002/chat`, log in if needed, click the "Kho của tôi" nav icon. Confirm:
- Header ("Kho của tôi" + Ghi chú/File tabs) is a separate rounded card with a visible gap below it, background image showing through the gap.
- Notes tab: content card (feed + composer) and info panel are two separate rounded cards with a gap between them.
- Background image is `background-2.webp` (dark theme default).

- [ ] **Step 3: Switch to the Files tab**

Click the "File" tab. Confirm 3 separate rounded cards side by side: FolderSidebar, FilePanel (or the "Chọn một thư mục" empty state), and the info panel — each with visible gaps and the background image behind them.

- [ ] **Step 4: Switch to light theme and repeat**

Open the theme/settings picker, switch to a light (non-`isDark`) theme. Confirm the background image changes to `banner.png` in both Store and the default chat view (since `getDefaultBackgroundImage` is shared and unchanged from before this feature).

- [ ] **Step 5: Check for regressions**

Read browser console for errors (`mcp__claude-in-chrome__read_console_messages` if using the Chrome extension). Click into a folder with files (if any exist) to confirm `FilePanel` still renders correctly inside its new card. Confirm the default chat view (not Store) still looks unchanged.

- [ ] **Step 6: Run the full relevant test suite one more time**

Run: `npx vitest run src/lib/theme/themes.test.ts src/features/my-store`
Expected: PASS, no regressions.

Run: `npx tsc --noEmit`
Expected: no errors.

No commit in this task (verification only) — if any issue is found, fix it in the relevant task's files and commit with a short `fix:` message referencing what broke.
