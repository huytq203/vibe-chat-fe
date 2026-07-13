# BotFather FE Entry Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Tạo bot mới" button/dialog in Settings → "Bot của tôi" with a "Chat với BotFather" button that opens/creates a DIRECT conversation with the BotFather system bot and navigates to it, closing Settings.

**Architecture:** A new TanStack Query mutation hook (`useOpenBotFatherChat`) resolves BotFather's user id via the existing generic user-search endpoint (exact-username mode), then opens a DIRECT conversation via the existing `chatApi.createDirect`, then navigates via the existing `useSelectedConversation` route hook and sets `chat-ui.store`'s `mobilePanel` to `'chat'`. `SettingsModal` is widened to pass an `onClose` callback into whichever tab is active; `BotsTab` uses it to dismiss Settings once the conversation opens. No new backend endpoints, no new `services/*.api.ts` files — pure reuse per CLAUDE.md §0.5.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query v5, Zustand, Vitest + Testing Library, sonner (toast).

## Global Constraints

- No `any`, no `@ts-ignore`/`eslint-disable` without a justifying comment (CLAUDE.md §0.1).
- Component < 200 lines, function < 50 lines, hook < 80 lines (CLAUDE.md §0.2).
- All client fetches go through TanStack Query; no `useEffect + fetch` (CLAUDE.md §0.4).
- API transport lives in `src/services/<scope>.api.ts`; no new `features/<x>/api/` folders (CLAUDE.md §0.5).
- `'use client'` on the smallest leaf component that needs it; default to Server Component (CLAUDE.md §0.7).
- Don't invent new libraries outside the approved stack table without asking (CLAUDE.md §2).
- Every UI branch showing API data needs all 4 states (loading/error/empty/data) — CLAUDE.md §0.3 (only touches `BotsTab`'s existing data states, not this feature's new code path, which has no loading/error/empty/data list to render).

---

### Task 1: `useOpenBotFatherChat()` mutation hook

**Files:**
- Modify: `src/features/bots/hooks/use-mutations.ts`
- Modify: `src/features/bots/hooks/use-mutations.test.ts`

**Interfaces:**
- Consumes: `usersApi.search(params: { q: string; limit?: number; cursor?: string | null }): Promise<UserSearchPage>` (existing, `src/services/users.api.ts`); `chatApi.createDirect(userId: string): Promise<Conversation>` (existing, `src/services/chat-conversation.api.ts` re-exported via `src/services/chat.api.ts`); `chatKeys.conversationLists()` (existing, `src/services/keys.ts`); `useSelectedConversation(): { selectedConversationId: string | null; setSelected: (id: string | null) => void }` (existing, `src/features/chat/hooks/useSelectedConversation.ts` — calls `router.replace`); `useChatUIStore` (existing Zustand store, `src/features/chat/stores/chat-ui.store.ts`, exposes `setMobilePanel: (panel: 'list' | 'chat' | 'contact') => void`).
- Produces: `useOpenBotFatherChat(): UseMutationResult<Conversation, Error, void>` — call `.mutate(undefined, { onSuccess: () => void })` to open the chat; consumed by `BotsTab` in Task 2.

- [ ] **Step 1: Write the failing tests**

Open `src/features/bots/hooks/use-mutations.test.ts`. Add these imports at the top, right after the existing `import type { Bot, BotCreated, BotTokenIssued } from '../types';` line:

```ts
import type { Conversation } from '@/features/chat/types';
```

Add these `vi.mock` calls immediately after the existing `vi.mock('@/services/bot-tokens.api', ...)` block (before the `import { botsApi } from '@/services/bots.api';` line):

```ts
vi.mock('@/services/users.api', () => ({
  usersApi: { search: vi.fn() },
}));

vi.mock('@/services/chat.api', () => ({
  chatApi: { createDirect: vi.fn() },
}));

const routerReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
  useParams: () => ({}),
}));
```

Add these imports right after `import { botTokensApi } from '@/services/bot-tokens.api';`:

```ts
import { usersApi } from '@/services/users.api';
import { chatApi } from '@/services/chat.api';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
```

Add these mock handles right after `const mockRemove = vi.mocked(botsApi.remove);`:

```ts
const mockSearch = vi.mocked(usersApi.search);
const mockCreateDirect = vi.mocked(chatApi.createDirect);
```

Add this helper right after the `createWrapper()` function definition:

```ts
function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'me',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 0,
    memberIds: ['me', 'bf-1'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
```

Add this new `describe` block at the very end of the file (after the closing `});` of `describe('token mutation hooks', ...)`):

```ts
describe('useOpenBotFatherChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatUIStore.setState({ mobilePanel: 'list' });
  });

  it('nên tìm BotFather, mở DIRECT conversation, điều hướng và chuyển mobilePanel sang chat khi thành công', async () => {
    mockSearch.mockResolvedValue({
      items: [
        {
          id: 'bf-1',
          username: 'botfather',
          displayName: 'BotFather',
          avatarUrl: null,
          friendship: 'NONE',
        },
      ],
      nextCursor: null,
    });
    mockCreateDirect.mockResolvedValue(buildConversation({ id: 'conv-1' }));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useOpenBotFatherChat(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearch).toHaveBeenCalledWith({ q: '@botfather', limit: 5 });
    expect(mockCreateDirect).toHaveBeenCalledWith('bf-1');
    expect(routerReplace).toHaveBeenCalledWith('/chat/conv-1', { scroll: false });
    expect(useChatUIStore.getState().mobilePanel).toBe('chat');
  });

  it('nên báo lỗi và không điều hướng khi không tìm thấy BotFather trong kết quả tìm kiếm', async () => {
    mockSearch.mockResolvedValue({ items: [], nextCursor: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useOpenBotFatherChat(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockCreateDirect).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(useChatUIStore.getState().mobilePanel).toBe('list');
  });
});
```

Also add `import { useOpenBotFatherChat } from './use-mutations';` to the existing named import at the top of the file — change:

```ts
import {
  useCreateBot,
  useUpdateBot,
  useDeleteBot,
  useIssueToken,
  useRotateToken,
  useRevokeToken,
} from './use-mutations';
```

to:

```ts
import {
  useCreateBot,
  useUpdateBot,
  useDeleteBot,
  useIssueToken,
  useRotateToken,
  useRevokeToken,
  useOpenBotFatherChat,
} from './use-mutations';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/bots/hooks/use-mutations.test.ts`
Expected: FAIL — `useOpenBotFatherChat` is not exported from `./use-mutations` (and `sonner`'s real `toast.error` will also warn/throw in jsdom until Step 3 adds the mock, or until the hook exists — either way, both new tests fail at this point).

- [ ] **Step 3: Add `sonner` mock and implement the hook**

Still in `src/features/bots/hooks/use-mutations.test.ts`, add this mock alongside the others near the top (this covers the `onError` toast path so a real toast isn't attempted in jsdom):

```ts
vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));
```

Now edit `src/features/bots/hooks/use-mutations.ts`. Add these imports after the existing `import { sendBotDemoMessage } from '@/lib/bot-demo';` line:

```ts
import { toast } from 'sonner';
import { usersApi } from '@/services/users.api';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
```

Add this constant right after that import block:

```ts
const BOTFATHER_USERNAME = 'botfather';
```

Add this hook at the very end of the file:

```ts
/**
 * Mở (hoặc tạo) hội thoại DIRECT với BotFather rồi điều hướng sang màn hình
 * chat. `@`-prefix bắt buộc backend match CHÍNH XÁC theo username (xem
 * comment ở users.api.ts) — tránh prefix-search mờ khớp nhầm bot khác.
 */
export function useOpenBotFatherChat() {
  const queryClient = useQueryClient();
  const { setSelected } = useSelectedConversation();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);

  return useMutation({
    mutationFn: async () => {
      const page = await usersApi.search({ q: `@${BOTFATHER_USERNAME}`, limit: 5 });
      const botFather = page.items.find((u) => u.username === BOTFATHER_USERNAME);
      if (!botFather) {
        throw new Error('Không tìm thấy BotFather, thử lại sau');
      }
      return chatApi.createDirect(botFather.id);
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
      setMobilePanel('chat');
    },
    onError: (err: Error) => toast.error(err.message || 'Không mở được cuộc trò chuyện'),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/bots/hooks/use-mutations.test.ts`
Expected: PASS — all tests in the file, including the 2 new ones.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/bots/hooks/use-mutations.ts src/features/bots/hooks/use-mutations.test.ts
git commit -m "feat(bots): thêm useOpenBotFatherChat — mở chat với BotFather qua search+createDirect"
```

---

### Task 2: "Chat với BotFather" button in `BotsTab` + `SettingsModal` close wiring

**Files:**
- Modify: `src/features/settings/components/SettingsModal.tsx`
- Modify: `src/features/bots/components/BotsTab.tsx`
- Modify: `src/features/bots/components/BotsTab.test.tsx`

**Interfaces:**
- Consumes: `useOpenBotFatherChat()` from Task 1 (`{ mutate: (variables?: void, options?: { onSuccess？: () => void }) => void; isPending: boolean }` — standard TanStack `useMutation` result).
- Produces: `BotsTab(props: { onClose?: () => void }): JSX.Element` — `onClose` is called once the BotFather conversation opens successfully. `SettingsModal`'s `TabDef.Component` type becomes `ComponentType<{ onClose?: () => void }>`, consumed by no other task (this is the modal's own internal wiring).

- [ ] **Step 1: Write the failing test**

Open `src/features/bots/components/BotsTab.test.tsx`. Replace the top of the file (everything before the `const PAGE: BotListPage = {` line) with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BotsTab } from './BotsTab';
import type { BotListPage } from '../types';
import type { Conversation } from '@/features/chat/types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn(), issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));
vi.mock('@/services/users.api', () => ({
  usersApi: { search: vi.fn() },
}));
vi.mock('@/services/chat.api', () => ({
  chatApi: { createDirect: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useParams: () => ({}),
}));

import { botsApi } from '@/services/bots.api';
import { usersApi } from '@/services/users.api';
import { chatApi } from '@/services/chat.api';

const mockList = vi.mocked(botsApi.list);
const mockSearch = vi.mocked(usersApi.search);
const mockCreateDirect = vi.mocked(chatApi.createDirect);

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: 'me',
    encryptionType: 'NONE',
    memberCount: 2,
    messageCount: 0,
    memberIds: ['me', 'bf-1'],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderTab(onClose?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BotsTab onClose={onClose} />
    </QueryClientProvider>,
  );
}
```

Note: this removes the `create: vi.fn()` stub from the `botsApi` mock (no longer called by this component) and removes the old plain `function renderTab()`.

Now replace the last test in the file — the `it('mở CreateBotDialog khi click nút Tạo bot mới', ...)` block (including its closing `});` right before the file's final `});`) — with:

```ts
  it('mở chat với BotFather và gọi onClose khi click nút', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockList.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    mockSearch.mockResolvedValue({
      items: [
        {
          id: 'bf-1',
          username: 'botfather',
          displayName: 'BotFather',
          avatarUrl: null,
          friendship: 'NONE',
        },
      ],
      nextCursor: null,
    });
    mockCreateDirect.mockResolvedValue(buildConversation());
    renderTab(onClose);

    await user.click(await screen.findByRole('button', { name: /chat với botfather/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSearch).toHaveBeenCalledWith({ q: '@botfather', limit: 5 });
    expect(mockCreateDirect).toHaveBeenCalledWith('bf-1');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/bots/components/BotsTab.test.tsx`
Expected: FAIL — no button named "Chat với BotFather" exists yet (`BotsTab` still renders "Tạo bot mới" and doesn't accept an `onClose` prop).

- [ ] **Step 3: Update `SettingsModal.tsx`**

In `src/features/settings/components/SettingsModal.tsx`, change:

```ts
type TabDef = { id: TabId; label: string; icon: LucideIcon; Component: ComponentType };
```

to:

```ts
type TabDef = {
  id: TabId;
  label: string;
  icon: LucideIcon;
  Component: ComponentType<{ onClose?: () => void }>;
};
```

And change:

```tsx
          <div className="flex-1 overflow-y-auto p-5">
            <ActiveTab />
          </div>
```

to:

```tsx
          <div className="flex-1 overflow-y-auto p-5">
            <ActiveTab onClose={() => onOpenChange(false)} />
          </div>
```

- [ ] **Step 4: Rewrite `BotsTab.tsx`**

Replace the entire contents of `src/features/bots/components/BotsTab.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useBots } from '../hooks/use-query';
import { useOpenBotFatherChat } from '../hooks/use-mutations';
import { BotRow } from './BotRow';
import { BotTokensPanel } from './BotTokensPanel';
import type { Bot } from '../types';

const PAGE_LIMIT = 20;

/** Tab "Bot của tôi" trong Settings — list bot + entry chat với BotFather (tạo bot) + quản lý token. */
export function BotsTab({ onClose }: { onClose?: () => void } = {}) {
  const { data, isLoading, isError } = useBots({ page: 1, limit: PAGE_LIMIT });
  const [manageTokenBot, setManageTokenBot] = useState<Bot | null>(null);
  const openBotFatherChat = useOpenBotFatherChat();

  function handleChatWithBotFather() {
    openBotFatherChat.mutate(undefined, { onSuccess: () => onClose?.() });
  }

  return (
    <SettingsSection
      title="Bot của tôi"
      desc="Bot của bạn — tạo mới bằng cách chat với BotFather."
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} data-testid="bot-skeleton" className="h-[60px] w-full" rounded="lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-[13px] text-muted-foreground">Không tải được danh sách bot.</p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-[13px] text-muted-foreground">Bạn chưa có bot nào.</p>
          <Button
            size="sm"
            leftIcon={<MessageCircle className="h-4 w-4" />}
            onClick={handleChatWithBotFather}
            isLoading={openBotFatherChat.isPending}
          >
            Chat với BotFather
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((bot) => (
              <BotRow key={bot.id} bot={bot} onManageTokens={setManageTokenBot} />
            ))}
          </ul>
          <div className="mt-4">
            <Button
              size="sm"
              leftIcon={<MessageCircle className="h-4 w-4" />}
              onClick={handleChatWithBotFather}
              isLoading={openBotFatherChat.isPending}
            >
              Chat với BotFather
            </Button>
          </div>
        </>
      )}

      {manageTokenBot && (
        <BotTokensPanel
          bot={manageTokenBot}
          open
          onOpenChange={(next) => {
            if (!next) setManageTokenBot(null);
          }}
        />
      )}
    </SettingsSection>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/bots/components/BotsTab.test.tsx`
Expected: PASS — all tests, including the new one.

- [ ] **Step 6: Typecheck and full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: all suites pass (this also exercises `SettingsModal`'s consumers indirectly through the build; there is no dedicated `SettingsModal.test.tsx` in this codebase, so `tsc --noEmit` is what catches a wiring mismatch there).

- [ ] **Step 7: Commit**

```bash
git add src/features/settings/components/SettingsModal.tsx src/features/bots/components/BotsTab.tsx src/features/bots/components/BotsTab.test.tsx
git commit -m "feat(bots): thay nút 'Tạo bot mới' bằng 'Chat với BotFather' trong Settings"
```

---

### Task 3: Delete the dead create-bot dialog and hook

**Files:**
- Delete: `src/features/bots/components/CreateBotDialog.tsx`
- Delete: `src/features/bots/components/CreateBotDialog.test.tsx`
- Modify: `src/features/bots/hooks/use-mutations.ts`
- Modify: `src/features/bots/hooks/use-mutations.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only removes code that Task 2 made unreachable. `createBotSchema`/`CreateBotInput` in `src/features/bots/schemas.ts` and `botsApi.create` in `src/services/bots.api.ts` are **not** touched — `updateBotSchema = createBotSchema.partial()` still depends on `createBotSchema`'s structure, and `botsApi.create` is a thin transport wrapper left in place per the approved spec (only `CreateBotDialog` + `useCreateBot` were named for deletion).

- [ ] **Step 1: Delete the dialog and its test**

```bash
git rm src/features/bots/components/CreateBotDialog.tsx src/features/bots/components/CreateBotDialog.test.tsx
```

- [ ] **Step 2: Remove `useCreateBot` from `use-mutations.ts`**

In `src/features/bots/hooks/use-mutations.ts`, delete this block entirely:

```ts
/** Tạo bot mới — response kèm token plaintext (chỉ hiện 1 lần). */
export function useCreateBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBotInput) => botsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}
```

Change the type-only import line from:

```ts
import type { CreateBotInput, UpdateBotInput, IssueTokenInput, BotDemoCommand } from '../schemas';
```

to:

```ts
import type { UpdateBotInput, IssueTokenInput, BotDemoCommand } from '../schemas';
```

- [ ] **Step 3: Remove `useCreateBot`'s test coverage from `use-mutations.test.ts`**

In `src/features/bots/hooks/use-mutations.test.ts`:

Change the named import from `./use-mutations` — remove `useCreateBot` from the list:

```ts
import {
  useUpdateBot,
  useDeleteBot,
  useIssueToken,
  useRotateToken,
  useRevokeToken,
  useOpenBotFatherChat,
} from './use-mutations';
```

Delete the `mockCreate` line:

```ts
const mockCreate = vi.mocked(botsApi.create);
```

Delete the `CREATED` constant block:

```ts
const CREATED: BotCreated = {
  bot: BOT,
  token: {
    id: 'token-1',
    token: 'bot-1:secret',
    prefix: 'secret',
    scopes: ['messages:send'],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};
```

Delete the `it('useCreateBot gọi botsApi.create ...', ...)` test block entirely.

Remove the now-unused `BotCreated` type from the type-only import:

```ts
import type { Bot, BotTokenIssued } from '../types';
```

Change the `botsApi` mock declaration from:

```ts
vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
```

to:

```ts
vi.mock('@/services/bots.api', () => ({
  botsApi: { update: vi.fn(), remove: vi.fn() },
}));
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all suites pass, no leftover reference to `CreateBotDialog`/`useCreateBot`.

- [ ] **Step 5: Confirm no remaining references**

Run: `grep -rn "CreateBotDialog\|useCreateBot" src`
Expected: no output.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A src/features/bots
git commit -m "chore(bots): xoá CreateBotDialog + useCreateBot (thay bằng BotFather qua chat)"
```

---

## Self-Review

**1. Spec coverage:** §1 (bỏ nút cũ, entry point mới, không prefill) → Task 2. §2 (data flow, `usersApi.search`+`chatApi.createDirect`, exact-match `@`, defensive filter, invalidate/setSelected/setMobilePanel/onClose) → Task 1 + Task 2. §3 (SettingsModal onClose wiring, BotsTab button swap+description) → Task 2. §4 (delete `CreateBotDialog`+test+`useCreateBot`+test, keep `createBotSchema`) → Task 3. §5 (error handling: not-found toast, generic createDirect error reuse) → Task 1. §6 (tests for hook + BotsTab, delete CreateBotDialog test) → Tasks 1–3. §7 (no other entry point, no prefill) → satisfied by Task 2's implementation (no composer prefill code added). §8 (DoD: typecheck/lint, tests, no CreateBotDialog references, list/edit/token/delete unaffected, no new secrets logged) → covered by each task's final steps.

**2. Placeholder scan:** No TBD/TODO; every step has literal code, exact file paths, exact commands.

**3. Type consistency:** `useOpenBotFatherChat()` return type used in Task 2 exactly as TanStack's `useMutation` result (`.mutate`, `.isPending`) — matches Task 1's definition. `BotsTab({ onClose }: { onClose?: () => void } = {})` matches `SettingsModal`'s `ComponentType<{ onClose?: () => void }>` from Task 2 Step 3. `UserSearchItem` fields used in test mocks (`id`, `username`, `displayName`, `avatarUrl`, `friendship`) match `UserSummary & { friendship: FriendshipStatus; mutualFriendsCount?: number }` in `src/features/friends/types.ts` (`mutualFriendsCount` is optional, omitted safely). `Conversation` test literal in both Task 1 and Task 2 matches the full required-field shape in `src/features/chat/types/conversation.ts` (copied from the existing `ChatHeader.test.tsx` pattern).

Plan complete and saved to `docs/superpowers/plans/2026-07-13-botfather-fe-entrypoint.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
