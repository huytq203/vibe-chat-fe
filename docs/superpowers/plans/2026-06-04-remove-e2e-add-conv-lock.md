# Remove E2E — Add Conversation Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xoá hoàn toàn E2E encryption khỏi FE và implement Conversation Lock (khoá bằng password qua API) theo spec FRONTEND/18-conversation-lock.md.

**Architecture:** Thay `secret-conv.store.ts` (localStorage PIN) bằng `conv-lock.store.ts` (session-only Set). Locked convs lấy từ `GET /conversations/locked` — tách riêng khỏi danh sách thường. Lock/unlock thao tác qua 4 API endpoints mới. UI gate ở ChatPanel dùng store session state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict, Zustand, TanStack Query v5, Tailwind CSS v4, lucide-react.

---

## File Map

| Action | File | Mục đích |
|---|---|---|
| Modify | `src/features/chat/types.ts` | Xoá `'E2E'` khỏi EncryptionType, xoá `EncryptedBlob`, thêm `isLocked` vào Conversation |
| Modify | `src/services/keys.ts` | Thêm key `lockedConversations` |
| Modify | `src/services/chat.api.ts` | Thêm 4 lock endpoints, bỏ comment E2E |
| Create | `src/features/chat/stores/conv-lock.store.ts` | Session-only Set<string> cho unlocked convIds |
| Delete | `src/features/chat/stores/secret-conv.store.ts` | Old localStorage PIN store — không còn dùng |
| Modify | `src/features/chat/hooks/use-query.ts` | Thêm `useLockedConversations` hook |
| Modify | `src/features/chat/hooks/use-mutations.ts` | Thêm `useLockConversation`, `useRemoveLock`, `useVerifyLock` mutations |
| Modify | `src/features/chat/components/conversations/ConversationItem.tsx` | Bỏ E2E + secretStore, dùng `conversation.isLocked` |
| Rename/Modify | `src/features/chat/components/conversations/SecretDivider.tsx` | Đổi thành `LockedSectionHeader` — collapsible header cho locked section |
| Modify | `src/features/chat/components/conversations/ConversationList.tsx` | Thay E2E section bằng collapsible locked section dùng `useLockedConversations` |
| Rename/Modify | `src/features/chat/components/contact/PinDialog.tsx` | Đổi thành `LockPasswordDialog.tsx` — dialog nhập password 6-50 ký tự cho lock/unlock |
| Modify | `src/features/chat/components/contact/ContactInfo.tsx` | Thay PIN logic bằng API lock/unlock |
| Modify | `src/features/chat/components/layout/ConvLockScreen.tsx` | Thay local PIN check bằng `useVerifyLock` mutation |
| Modify | `src/features/chat/components/layout/ChatPanel.tsx` | Thay `secretStore.hasPin()` bằng `conv.isLocked && !convLockStore.isUnlocked()` |
| Modify | `src/features/auth/hooks/use-mutations.ts` | Gọi `convLockStore.clearAll()` khi logout |

---

## Task 1: Cập nhật Types

**Files:**
- Modify: `src/features/chat/types.ts`

- [ ] **Step 1: Cập nhật `EncryptionType`, xoá `EncryptedBlob`, thêm `isLocked` vào `Conversation`**

Thay toàn bộ nội dung `src/features/chat/types.ts` (chỉ những phần thay đổi):

```ts
// Dòng 2 — đổi
export type EncryptionType = 'SERVER';

// Xoá hoàn toàn type EncryptedBlob (dòng 15-22 cũ — không còn dùng ở đâu)

// Thêm isLocked vào Conversation (sau field pinnedAt):
export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  encryptionType: EncryptionType;
  memberCount: number;
  messageCount: number;
  memberIds: string[];
  members?: ConversationMember[];
  lastMessage: LastMessagePreview | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isPinned?: boolean;
  pinnedAt?: string | null;
  isLocked?: boolean;
  createdAt: string;
};
```

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

Dự kiến: lỗi về `'E2E'` không hợp lệ + `EncryptedBlob` không tìm thấy ở các file dùng chúng (sẽ fix trong các task sau). Nếu lỗi chỉ ở những file đó → đúng hướng.

---

## Task 2: Thêm query key + API endpoints

**Files:**
- Modify: `src/services/keys.ts`
- Modify: `src/services/chat.api.ts`

- [ ] **Step 1: Thêm `lockedConversations` key vào `chatKeys`**

Trong `src/services/keys.ts`, thêm vào `chatKeys`:

```ts
export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationLists: () => [...chatKeys.conversations(), 'list'] as const,
  conversationList: (params: { page: number; limit: number }) =>
    [...chatKeys.conversationLists(), params] as const,
  conversationDetail: (id: string) =>
    [...chatKeys.conversations(), 'detail', id] as const,
  lockedConversations: () => [...chatKeys.conversations(), 'locked'] as const,
  joinRequests: (conversationId: string) =>
    [...chatKeys.conversations(), 'join-requests', conversationId] as const,
  messages: (conversationId: string) =>
    [...chatKeys.all, 'messages', conversationId] as const,
  presence: (userIds: string[]) =>
    [...chatKeys.all, 'presence', [...userIds].sort()] as const,
} as const;
```

- [ ] **Step 2: Thêm 4 lock endpoints vào `chatApi`**

Trong `src/services/chat.api.ts`, thêm vào cuối object `chatApi` (trước `} as const`):

```ts
  // ─── Conversation Lock ───────────────────────────────────────────────────
  // Contract theo FRONTEND/18-conversation-lock.md.

  /** Bật lock (hoặc đổi password). Idempotent. Trả Conversation với isLocked: true. */
  lockConversation: (id: string, password: string) =>
    apiClient.put<Conversation>(`/api/v1/conversations/${id}/lock`, {
      body: { password },
    }),

  /** Tắt lock — yêu cầu đúng password hiện tại. Trả { ok: true }. */
  removeLock: (id: string, password: string) =>
    apiClient.delete<{ ok: true }>(`/api/v1/conversations/${id}/lock`, {
      body: { password },
    }),

  /** Verify password — không đổi trạng thái lock. Trả { ok: true } nếu đúng. */
  verifyLock: (id: string, password: string) =>
    apiClient.post<{ ok: true }>(`/api/v1/conversations/${id}/lock/verify`, {
      body: { password },
    }),

  /** Danh sách conversation đang bị lock của user hiện tại. */
  listLockedConversations: () =>
    apiClient.get<Conversation[]>('/api/v1/conversations/locked'),
```

Cũng xoá comment E2E cũ ở `editMessage` (dòng khoảng 67-69 trong file gốc):
```ts
  // ─── Sửa / gỡ tin nhắn (conversation SERVER) ────────────────────────────
  // Endpoint & contract theo FRONTEND/15-edit-recall-selfdestruct.md.
```
(bỏ 2 dòng comment cũ nhắc đến E2E edit)

- [ ] **Step 3: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 3: Tạo conv-lock store mới

**Files:**
- Create: `src/features/chat/stores/conv-lock.store.ts`

- [ ] **Step 1: Tạo store**

```ts
// src/features/chat/stores/conv-lock.store.ts
import { create } from 'zustand';

type ConvLockState = {
  unlockedIds: Set<string>;
  isUnlocked: (convId: string) => boolean;
  markUnlocked: (convId: string) => void;
  clearAll: () => void;
};

export const useConvLockStore = create<ConvLockState>()((set, get) => ({
  unlockedIds: new Set<string>(),

  isUnlocked: (convId) => get().unlockedIds.has(convId),

  markUnlocked: (convId) =>
    set((s) => {
      if (s.unlockedIds.has(convId)) return s;
      const next = new Set(s.unlockedIds);
      next.add(convId);
      return { unlockedIds: next };
    }),

  clearAll: () => set({ unlockedIds: new Set<string>() }),
}));
```

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 4: Thêm query hook + lock mutations

**Files:**
- Modify: `src/features/chat/hooks/use-query.ts`
- Modify: `src/features/chat/hooks/use-mutations.ts`

- [ ] **Step 1: Thêm `useLockedConversations` vào `use-query.ts`**

Thêm vào cuối `src/features/chat/hooks/use-query.ts`:

```ts
export function useLockedConversations() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.lockedConversations(),
    queryFn: () => chatApi.listLockedConversations(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 2: Thêm 3 lock mutations vào `use-mutations.ts`**

Thêm vào cuối `src/features/chat/hooks/use-mutations.ts`:

```ts
export function useLockConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.lockConversation(conversationId, password),
    onSuccess: (conv, { conversationId }) => {
      // Xoá khỏi normal list, thêm vào locked list
      qc.setQueriesData<import('../types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? prev,
      );
      qc.setQueryData<import('../types').Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => {
          const list = prev ?? [];
          if (list.some((c) => c.id === conv.id)) return list;
          return [conv, ...list];
        },
      );
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      toast.success('Đã khoá hội thoại');
    },
    onError: (e: Error) => toast.error(e.message || 'Khoá hội thoại thất bại'),
  });
}

export function useRemoveLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.removeLock(conversationId, password),
    onSuccess: async (_res, { conversationId }) => {
      // Refetch conv detail, xoá khỏi locked list, thêm lại normal list
      const conv = await chatApi.getConversation(conversationId);
      qc.setQueryData<import('../types').Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? [],
      );
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã tắt khoá hội thoại');
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu xác nhận');
      } else {
        toast.error(e.message || 'Tắt khoá thất bại');
      }
    },
  });
}

export function useVerifyLock() {
  const convLockStore = useConvLockStore();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.verifyLock(conversationId, password),
    onSuccess: (_res, { conversationId }) => {
      convLockStore.markUnlocked(conversationId);
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu, thử lại');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        // Race: conv vừa unlock ở thiết bị khác — không cần verify
      } else {
        toast.error(e.message || 'Xác thực thất bại');
      }
    },
  });
}
```

Cũng thêm import `useConvLockStore` vào đầu file `use-mutations.ts`:

```ts
import { useConvLockStore } from '../stores/conv-lock.store';
```

- [ ] **Step 3: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 5: Cập nhật ConversationItem

**Files:**
- Modify: `src/features/chat/components/conversations/ConversationItem.tsx`

- [ ] **Step 1: Bỏ `useSecretConvStore`, dùng `conversation.isLocked`**

Thay toàn bộ nội dung file:

```tsx
'use client';

import { Lock, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { EmojiText } from '@/components/common/EmojiText';
import { cn } from '@/lib/utils/cn';
import type { Conversation } from '../../types';
import { formatListTime, getConversationName, getConversationSeed } from '../../utils';
import { Avatar } from '../common/Avatar';

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  meId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationItem({ conversation, selected, meId, onSelect }: ConversationItemProps) {
  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const isLocked = Boolean(conversation.isLocked);
  const preview = isLocked
    ? '🔒 Nhấn để mở'
    : conversation.lastMessage?.preview
      ?? (conversation.messageCount > 0
        ? 'Tin nhắn đã thu hồi'
        : 'Chưa có tin nhắn');
  const time = formatListTime(conversation.lastMessageAt);
  const unread = conversation.unreadCount;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors',
        selected
          ? 'bg-primary/10 border-l-2 border-primary pl-1.5'
          : 'hover:bg-muted',
      )}
    >
      <Avatar name={name} seed={seed} size="md" status={null} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            {conversation.isPinned && (
              <Pin className="h-3 w-3 shrink-0 text-primary" aria-label="Đã ghim" />
            )}
            {isLocked && (
              <Lock className="h-3 w-3 shrink-0 text-primary" aria-label="Đang khoá" />
            )}
            <span className="truncate text-[13.5px] font-semibold text-foreground">{name}</span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            <EmojiText text={preview} />
          </span>
          {unread > 0 && (
            <Badge variant="default" size="sm">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 6: Thay SecretDivider bằng LockedSectionHeader

**Files:**
- Modify: `src/features/chat/components/conversations/SecretDivider.tsx`

- [ ] **Step 1: Viết lại component thành `LockedSectionHeader` collapsible**

Thay toàn bộ nội dung `SecretDivider.tsx`:

```tsx
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';

type LockedSectionHeaderProps = {
  count: number;
  expanded: boolean;
  onToggle: () => void;
};

export function LockedSectionHeader({ count, expanded, onToggle }: LockedSectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-lg transition-colors"
    >
      <div className="h-px flex-1 border-t border-dashed border-border" />
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground shrink-0">
        <Lock className="h-3 w-3" />
        Bí mật ({count})
        {expanded
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </span>
      <div className="h-px flex-1 border-t border-dashed border-border" />
    </button>
  );
}
```

---

## Task 7: Cập nhật ConversationList

**Files:**
- Modify: `src/features/chat/components/conversations/ConversationList.tsx`

- [ ] **Step 1: Thay E2E section bằng locked section**

Xoá import `useSecretConvStore` (nếu có), thêm import mới:

```ts
import { useLockedConversations } from '../../hooks/use-query';
import { useConvLockStore } from '../../stores/conv-lock.store';
import { LockedSectionHeader } from './SecretDivider';
```

Thêm state collapsed cho locked section (trong component, sau các state hiện có):

```ts
const [lockedExpanded, setLockedExpanded] = useState(false);
const { data: lockedConversations = [] } = useLockedConversations();
const convLockStore = useConvLockStore();
```

Thay đoạn render danh sách (phần `{(() => { ... })()}`) bằng:

```tsx
{filtered.map((c) => (
  <ConversationItem
    key={c.id}
    conversation={c}
    selected={selectedConversationId === c.id}
    meId={me?.id ?? null}
    onSelect={handleSelectConversation}
  />
))}
{lockedConversations.length > 0 && (
  <>
    <LockedSectionHeader
      count={lockedConversations.length}
      expanded={lockedExpanded}
      onToggle={() => setLockedExpanded((v) => !v)}
    />
    {lockedExpanded && lockedConversations.map((c) => (
      <ConversationItem
        key={c.id}
        conversation={c}
        selected={selectedConversationId === c.id}
        meId={me?.id ?? null}
        onSelect={(id) => {
          if (c.isLocked && !convLockStore.isUnlocked(id)) {
            // Chọn conv locked → ChatPanel tự hiện ConvLockScreen
            handleSelectConversation(id);
          } else {
            handleSelectConversation(id);
          }
        }}
      />
    ))}
  </>
)}
```

Xoá import `SecretDivider` (cũ), xoá filter E2E `const secrets = filtered.filter(...)`.

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 8: Tạo LockPasswordDialog (thay PinDialog)

**Files:**
- Modify: `src/features/chat/components/contact/PinDialog.tsx` → đổi nội dung thành `LockPasswordDialog`

- [ ] **Step 1: Viết lại file thành `LockPasswordDialog`**

Thay toàn bộ nội dung `src/features/chat/components/contact/PinDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';

type LockPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'lock' = đặt password mới | 'unlock' = nhập password để tắt lock */
  mode: 'lock' | 'unlock';
  onConfirm: (password: string) => void;
};

export function LockPasswordDialog({ open, onOpenChange, mode, onConfirm }: LockPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleClose() {
    setPassword('');
    setError('');
    onOpenChange(false);
  }

  function handleSubmit() {
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password.length > 50) {
      setError('Mật khẩu tối đa 50 ký tự');
      return;
    }
    onConfirm(password);
    handleClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'lock' ? '🔒 Khoá hội thoại' : '🔓 Tắt khoá hội thoại'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'lock'
              ? 'Đặt mật khẩu để khoá hội thoại này. Khoá sẽ ẩn hội thoại khỏi danh sách chính.'
              : 'Nhập mật khẩu hiện tại để tắt khoá.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 px-1 py-1">
          <Input
            type="password"
            placeholder="Mật khẩu (6–50 ký tự)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            autoFocus
          />
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          <Button variant="solid" onClick={handleSubmit}>
            {mode === 'lock' ? 'Khoá' : 'Tắt khoá'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Task 9: Cập nhật ContactInfo

**Files:**
- Modify: `src/features/chat/components/contact/ContactInfo.tsx`

- [ ] **Step 1: Thay PIN logic bằng API lock/unlock**

Thay import `useSecretConvStore` và `PinDialog` bằng:

```ts
import { useConvLockStore } from '../../stores/conv-lock.store';
import { useLockConversation, useRemoveLock } from '../../hooks/use-mutations';
import { LockPasswordDialog } from './PinDialog';
```

Trong component, xoá `secretStore` và logic `handlePinConfirm`, thay bằng:

```ts
const convLockStore = useConvLockStore();
const [lockDialogOpen, setLockDialogOpen] = useState(false);
const lockMut = useLockConversation();
const removeLockMut = useRemoveLock();

const isLocked = Boolean(conversation.isLocked);
const lockDialogMode: 'lock' | 'unlock' = isLocked ? 'unlock' : 'lock';

function handleLockConfirm(password: string) {
  if (isLocked) {
    removeLockMut.mutate({ conversationId: conversation.id, password });
  } else {
    lockMut.mutate({ conversationId: conversation.id, password }, {
      onSuccess: () => convLockStore.markUnlocked(conversation.id),
    });
  }
}
```

Thay `ToggleRow` "Chế độ bí mật" bằng `OptionRow` (vì giờ toggle thực sự là action API, không phải boolean):

```tsx
<OptionRow
  icon={<Lock className="h-4 w-4" />}
  label={isLocked ? 'Tắt khoá hội thoại' : 'Khoá hội thoại'}
  onClick={() => setLockDialogOpen(true)}
/>
```

Thay `<PinDialog ...>` ở cuối JSX bằng:

```tsx
<LockPasswordDialog
  open={lockDialogOpen}
  onOpenChange={setLockDialogOpen}
  mode={lockDialogMode}
  onConfirm={handleLockConfirm}
/>
```

Xoá state `pinDialogOpen`, `pinDialogMode`, `hasPin` liên quan đến secretStore.

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 10: Cập nhật ConvLockScreen

**Files:**
- Modify: `src/features/chat/components/layout/ConvLockScreen.tsx`

- [ ] **Step 1: Thay local PIN check bằng `useVerifyLock` mutation**

Thay toàn bộ nội dung file:

```tsx
'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useVerifyLock } from '../../hooks/use-mutations';

type ConvLockScreenProps = {
  conversationId: string;
  name: string;
};

export function ConvLockScreen({ conversationId, name }: ConvLockScreenProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const verifyMut = useVerifyLock();

  function handleUnlock() {
    if (password.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    verifyMut.mutate(
      { conversationId, password },
      {
        onError: () => {
          setLocalError('Sai mật khẩu, thử lại');
          setPassword('');
        },
      },
    );
  }

  const errorMsg = localError || (verifyMut.isError ? 'Sai mật khẩu, thử lại' : '');

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 bg-background px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground">{name}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Nhập mật khẩu để mở hội thoại này
        </p>
      </div>
      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <Input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          autoFocus
          onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
          className={errorMsg ? 'border-danger' : ''}
        />
        {errorMsg && (
          <p className="text-center text-[12px] text-danger">{errorMsg}</p>
        )}
        <Button
          variant="solid"
          className="w-full"
          onClick={handleUnlock}
          disabled={verifyMut.isPending}
        >
          {verifyMut.isPending ? 'Đang xác thực...' : 'Mở khoá'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Task 11: Cập nhật ChatPanel

**Files:**
- Modify: `src/features/chat/components/layout/ChatPanel.tsx`

- [ ] **Step 1: Thay `secretStore` bằng `convLockStore`**

Xoá import `useSecretConvStore`:
```ts
// Xoá dòng này:
import { useSecretConvStore } from '../../stores/secret-conv.store';
```

Thêm import:
```ts
import { useConvLockStore } from '../../stores/conv-lock.store';
```

Thay đoạn `secretStore` logic:
```ts
// Xoá:
const secretStore = useSecretConvStore();
const isLocked =
  conversation != null &&
  secretStore.hasPin(conversation.id) &&
  !secretStore.isUnlocked(conversation.id);

// Thay bằng:
const isUnlocked = useConvLockStore((s) => s.isUnlocked);
const isLocked =
  conversation != null &&
  Boolean(conversation.isLocked) &&
  !isUnlocked(conversation.id);
```

- [ ] **Step 2: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 12: Xoá secret-conv.store + clear khi logout

**Files:**
- Delete: `src/features/chat/stores/secret-conv.store.ts`
- Modify: `src/features/auth/hooks/use-mutations.ts`

- [ ] **Step 1: Kiểm tra không còn file nào import `secret-conv.store`**

```bash
grep -r "secret-conv.store\|useSecretConvStore" /home/huytq/code/my/fe/vibe-chat-fe/src --include="*.ts" --include="*.tsx"
```

Dự kiến: không có kết quả. Nếu có → fix file đó trước rồi mới xoá.

- [ ] **Step 2: Xoá file cũ**

```bash
rm /home/huytq/code/my/fe/vibe-chat-fe/src/features/chat/stores/secret-conv.store.ts
```

- [ ] **Step 3: Gọi `convLockStore.clearAll()` khi logout**

Trong `src/features/auth/hooks/use-mutations.ts`, thêm import:

```ts
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
```

Trong `useLogout` (khoảng dòng 50), thêm `clearAll` sau khi lấy `clear`:

```ts
const clear = useAuthStore((s) => s.clear);
const clearLockSession = useConvLockStore((s) => s.clearAll);
```

Gọi `clearLockSession()` trước hoặc cùng với `clear()` trong onSuccess:

```ts
clearLockSession();
clear();
queryClient.clear();
```

- [ ] **Step 4: Kiểm tra TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 13: Final check & lint

- [ ] **Step 1: Chạy lint toàn dự án**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npm run lint 2>&1 | tail -20
```

Dự kiến: no errors. Fix bất kỳ warning/error nào liên quan đến các file đã sửa.

- [ ] **Step 2: Compile check lần cuối**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1
```

Dự kiến: no errors.

- [ ] **Step 3: Kiểm tra không còn tham chiếu đến `E2E` hoặc `secret-conv`**

```bash
grep -r "'E2E'\|\"E2E\"\|secret-conv\|useSecretConvStore\|EncryptedBlob\|SecretDivider" \
  /home/huytq/code/my/fe/vibe-chat-fe/src \
  --include="*.ts" --include="*.tsx"
```

Dự kiến: không có output (hoặc chỉ trong file docs/comments không quan trọng).
