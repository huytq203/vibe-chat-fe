# AI Chat — File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng đính kèm ảnh, PDF, và file text vào AI chat (AiChatPanel), gửi qua Gemini API dưới dạng `inlineData` base64.

**Architecture:** Client encode file thành base64 (FileReader) → gửi kèm message lên `/api/gemini/chat` → route build `inlineData` parts cho Gemini. Attachment metadata (không có base64) được persist vào localStorage session; object URL cho ảnh chỉ tồn tại trong phiên hiện tại.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Gemini REST API, Vitest + Testing Library, lucide-react, Tailwind v4, Basuicn Button/Textarea.

## Global Constraints

- Không `any`, không `@ts-ignore` — dùng `unknown` rồi narrow.
- Component < 200 dòng, hook < 80 dòng, function < 50 dòng.
- Tất cả class Tailwind qua `cn()` từ `@/lib/utils/cn`.
- UI primitives từ Basuicn (`@/components/ui/*`) — không tự viết Button.
- MIME types hỗ trợ: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `text/plain`, `text/csv`, `application/json`, `text/markdown`.
- Giới hạn: 5 MB/file, tối đa 3 file/message.
- `previewUrl` (object URL) KHÔNG persist vào localStorage — strip khi serialize.

---

## Task 1: Mở rộng types trong `useAiSessions.ts`

**Files:**
- Modify: `src/features/chat/hooks/useAiSessions.ts`

**Interfaces:**
- Produces: `AiAttachmentMeta` (export), `AiMessage` với `attachments?: AiAttachmentMeta[]`

- [ ] **Step 1: Thêm type `AiAttachmentMeta` và mở rộng `AiMessage`**

Thay thế 2 dòng type hiện tại:
```ts
export type AiMessage = { role: 'user' | 'assistant'; content: string };
```
Thành:
```ts
export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string; // object URL — chỉ hợp lệ trong phiên hiện tại, không persist
};

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
};
```

- [ ] **Step 2: Cập nhật hàm `persist` để strip `previewUrl` trước khi lưu localStorage**

Thay thế hàm `persist` hiện tại:
```ts
function persist(sessions: AiSession[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch {
    // localStorage không khả dụng
  }
}
```
Thành:
```ts
function persist(sessions: AiSession[]): void {
  const clean = sessions.map((s) => ({
    ...s,
    messages: s.messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map(
        (a): Omit<AiAttachmentMeta, 'previewUrl'> => ({
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
        }),
      ),
    })),
  }));
  try {
    localStorage.setItem(KEY, JSON.stringify(clean.slice(0, 50)));
  } catch {
    // localStorage không khả dụng
  }
}
```

- [ ] **Step 3: Cập nhật title logic trong `pushMessage` — lấy từ content hoặc tên file đầu tiên**

Trong `pushMessage`, tìm dòng:
```ts
const title =
  s.messages.length === 0 && message.role === 'user'
    ? message.content.slice(0, 40)
    : s.title;
```
Thay thành:
```ts
const title =
  s.messages.length === 0 && message.role === 'user'
    ? (message.content.slice(0, 40) || message.attachments?.[0]?.name || 'Cuộc trò chuyện mới')
    : s.title;
```

- [ ] **Step 4: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors (hoặc lỗi không liên quan đến file này).

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/hooks/useAiSessions.ts
git commit -m "feat(ai-chat): mở rộng AiMessage với AiAttachmentMeta, strip previewUrl khi persist"
```

---

## Task 2: Thêm `AiAttachment` type và cập nhật `callGemini` trong `src/lib/gemini/index.ts`

**Files:**
- Modify: `src/lib/gemini/index.ts`

**Interfaces:**
- Consumes: (không có dependency task trước)
- Produces: `AiAttachment` (export), `callGemini(model, messages, attachments?)` với signature mới

- [ ] **Step 1: Thêm type `AiAttachment` và cập nhật `callGemini`**

Thay toàn bộ nội dung file `src/lib/gemini/index.ts` thành:
```ts
'use client';

export type GeminiModelInfo = { label: string; value: string };

// In-memory only — không persist localStorage
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  previewUrl?: string; // object URL cho ảnh
};

export const GEMINI_FREE_MODELS: GeminiModelInfo[] = [
  { label: 'Gemini 2.0 Flash Lite (free)', value: 'gemini-2.0-flash-lite' },
  { label: 'Gemini 2.0 Flash (free)', value: 'gemini-2.0-flash' },
  { label: 'Gemini 1.5 Flash (free)', value: 'gemini-1.5-flash' },
  { label: 'Gemini 1.5 Flash 8B (free)', value: 'gemini-1.5-flash-8b' },
];

export async function callGemini(
  model: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  attachments?: Pick<AiAttachment, 'base64Data' | 'mimeType' | 'name'>[],
): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, attachments }),
  });
  const data = await res.json() as { content?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Gemini lỗi');
  return data.content ?? '';
}

export async function fetchGeminiModels(): Promise<GeminiModelInfo[]> {
  try {
    const res = await fetch('/api/gemini/models');
    if (!res.ok) return GEMINI_FREE_MODELS;
    const data = await res.json() as { models: GeminiModelInfo[] };
    return data.models.length > 0 ? data.models : GEMINI_FREE_MODELS;
  } catch {
    return GEMINI_FREE_MODELS;
  }
}
```

- [ ] **Step 2: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors liên quan đến `src/lib/gemini/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini/index.ts
git commit -m "feat(ai-chat): thêm AiAttachment type, mở rộng callGemini nhận attachments"
```

---

## Task 3: Cập nhật `/api/gemini/chat/route.ts` — xử lý inlineData

**Files:**
- Modify: `src/app/api/gemini/chat/route.ts`

**Interfaces:**
- Consumes: `AiAttachment` (Pick) từ Task 2
- Produces: route nhận `{ model, messages, attachments? }`, build inlineData parts cho Gemini

- [ ] **Step 1: Viết test cho route (nếu môi trường test hỗ trợ)**

Do route là Next.js server, skip unit test — test thủ công ở Task 7. Bước này chỉ cập nhật code.

- [ ] **Step 2: Thay toàn bộ nội dung `route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

interface RequestAttachment {
  base64Data: string;
  mimeType: string;
  name: string;
}

interface RequestBody {
  model: string;
  messages: { role: string; content: string }[];
  attachments?: RequestAttachment[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 });
  }

  const body = await req.json() as RequestBody;
  const attachments = body.attachments ?? [];
  const lastIdx = body.messages.length - 1;

  const contents: GeminiContent[] = body.messages.map((m, idx) => {
    const role = m.role === 'assistant' ? 'model' : ('user' as const);
    if (idx === lastIdx && role === 'user' && attachments.length > 0) {
      return {
        role,
        parts: [
          ...attachments.map((a) => ({
            inlineData: { mimeType: a.mimeType, data: a.base64Data },
          })),
          { text: m.content },
        ],
      };
    }
    return { role, parts: [{ text: m.content }] };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents }),
    },
  );

  const data = await res.json() as GeminiResponse;
  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Gemini lỗi' }, { status: res.status });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return NextResponse.json({ content: text });
}
```

- [ ] **Step 3: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/gemini/chat/route.ts
git commit -m "feat(ai-chat): route Gemini chat xử lý inlineData parts từ attachments"
```

---

## Task 4: Tạo hook `useAiAttachments`

**Files:**
- Create: `src/features/chat/hooks/useAiAttachments.ts`
- Test: `src/features/chat/hooks/useAiAttachments.test.ts`

**Interfaces:**
- Consumes: `AiAttachment` từ `@/lib/gemini` (Task 2)
- Produces: `useAiAttachments()` → `{ attachments, error, addFiles, removeAttachment, clearAttachments }`

- [ ] **Step 1: Viết test file trước (TDD)**

Tạo `src/features/chat/hooks/useAiAttachments.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiAttachments } from './useAiAttachments';

// Mock FileReader
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,FAKEBASE64`;
    setTimeout(() => this.onload?.(), 0);
  }
}

beforeEach(() => {
  vi.stubGlobal('FileReader', MockFileReader);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-id-123') });
});

function makeFile(name: string, type: string, size = 1024): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('useAiAttachments', () => {
  it('từ chối file có MIME type không hỗ trợ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('virus.exe', 'application/octet-stream')]);
    });
    expect(result.current.error).toMatch('Định dạng không hỗ trợ: virus.exe');
    expect(result.current.attachments).toHaveLength(0);
  });

  it('từ chối file vượt quá 5MB', async () => {
    const { result } = renderHook(() => useAiAttachments());
    const bigFile = makeFile('big.png', 'image/png', 6 * 1024 * 1024);
    await act(async () => {
      await result.current.addFiles([bigFile]);
    });
    expect(result.current.error).toMatch('big.png vượt quá 5 MB');
    expect(result.current.attachments).toHaveLength(0);
  });

  it('encode và thêm file hợp lệ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].name).toBe('photo.png');
    expect(result.current.attachments[0].base64Data).toBe('FAKEBASE64');
  });

  it('từ chối khi tổng số file vượt quá 3', async () => {
    const { result } = renderHook(() => useAiAttachments());
    // Thêm 3 file hợp lệ trước
    await act(async () => {
      await result.current.addFiles([
        makeFile('a.png', 'image/png'),
        makeFile('b.png', 'image/png'),
        makeFile('c.png', 'image/png'),
      ]);
    });
    // Thêm file thứ 4
    await act(async () => {
      await result.current.addFiles([makeFile('d.png', 'image/png')]);
    });
    expect(result.current.error).toMatch('Tối đa 3 file');
    expect(result.current.attachments).toHaveLength(3);
  });

  it('removeAttachment xóa đúng file và revoke object URL', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    const id = result.current.attachments[0].id;
    act(() => { result.current.removeAttachment(id); });
    expect(result.current.attachments).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('clearAttachments xóa toàn bộ', async () => {
    const { result } = renderHook(() => useAiAttachments());
    await act(async () => {
      await result.current.addFiles([makeFile('photo.png', 'image/png')]);
    });
    act(() => { result.current.clearAttachments(); });
    expect(result.current.attachments).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx vitest run src/features/chat/hooks/useAiAttachments.test.ts 2>&1 | tail -20
```
Expected: FAIL với "Cannot find module './useAiAttachments'".

- [ ] **Step 3: Implement hook**

Tạo `src/features/chat/hooks/useAiAttachments.ts`:
```ts
'use client';

import { useCallback, useState } from 'react';
import type { AiAttachment } from '@/lib/gemini';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
]);
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_COUNT = 3;

function encodeFile(file: File): Promise<AiAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] ?? '';
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        size: file.size,
        base64Data,
        previewUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Lỗi đọc file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function useAiAttachments() {
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(async (files: FileList | File[]): Promise<void> => {
    const arr = Array.from(files);
    setError(null);

    for (const file of arr) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError(`Định dạng không hỗ trợ: ${file.name}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`${file.name} vượt quá 5 MB`);
        return;
      }
    }

    try {
      const encoded = await Promise.all(arr.map(encodeFile));
      setAttachments((prev) => {
        if (prev.length + encoded.length > MAX_COUNT) {
          setError('Tối đa 3 file mỗi lần gửi');
          encoded.forEach((a) => {
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          });
          return prev;
        }
        return [...prev, ...encoded];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đọc file');
    }
  }, []);

  const removeAttachment = useCallback((id: string): void => {
    setAttachments((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove?.previewUrl) URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback((): void => {
    setAttachments([]);
    setError(null);
  }, []);

  return { attachments, error, addFiles, removeAttachment, clearAttachments };
}
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx vitest run src/features/chat/hooks/useAiAttachments.test.ts 2>&1 | tail -20
```
Expected: 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/hooks/useAiAttachments.ts src/features/chat/hooks/useAiAttachments.test.ts
git commit -m "feat(ai-chat): hook useAiAttachments — validate, encode base64, quản lý attachment state"
```

---

## Task 5: Tạo component `AiAttachmentTray`

**Files:**
- Create: `src/features/chat/components/layout/AiAttachmentTray.tsx`

**Interfaces:**
- Consumes: `AiAttachment` từ `@/lib/gemini` (Task 2)
- Produces: `AiAttachmentTray({ attachments, error, onRemove })`

- [ ] **Step 1: Tạo component**

```tsx
'use client';

import { X, FileText, FileJson, File } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiAttachment } from '@/lib/gemini';

interface AiAttachmentTrayProps {
  attachments: AiAttachment[];
  error: string | null;
  onRemove: (id: string) => void;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/json') return <FileJson className="h-3.5 w-3.5" />;
  if (mimeType.startsWith('text/')) return <FileText className="h-3.5 w-3.5" />;
  return <File className="h-3.5 w-3.5" />;
}

export function AiAttachmentTray({ attachments, error, onRemove }: AiAttachmentTrayProps) {
  if (attachments.length === 0 && !error) return null;

  return (
    <div className="flex flex-col gap-1.5 pb-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) =>
            a.mimeType.startsWith('image/') && a.previewUrl ? (
              <div key={a.id} className="relative h-12 w-12 shrink-0">
                <img
                  src={a.previewUrl}
                  alt={a.name}
                  className="h-12 w-12 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  aria-label={`Xóa ${a.name}`}
                  className={cn(
                    'absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center',
                    'rounded-full bg-foreground text-background hover:bg-foreground/80',
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <div
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <FileIcon mimeType={a.mimeType} />
                <span className="max-w-[100px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  aria-label={`Xóa ${a.name}`}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
        </div>
      )}
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/layout/AiAttachmentTray.tsx
git commit -m "feat(ai-chat): AiAttachmentTray — preview ảnh thumbnail, chip cho PDF/text"
```

---

## Task 6: Cập nhật `AiMessageList.tsx` — hiển thị attachments trong message bubble

**Files:**
- Modify: `src/features/chat/components/layout/AiMessageList.tsx`

**Interfaces:**
- Consumes: `AiMessage` với `attachments?: AiAttachmentMeta[]` từ Task 1
- Produces: Bubble user có ảnh inline và file chip bên trên text

- [ ] **Step 1: Thêm import `AiAttachmentMeta`**

Tìm dòng import hiện tại:
```ts
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';
```
Thay thành:
```ts
import type { AiMessage, AiAttachmentMeta } from '@/features/chat/hooks/useAiSessions';
import { FileText, FileJson, File } from 'lucide-react';
```

- [ ] **Step 2: Thêm helper component `AttachmentDisplay` trước `AiMessageList`**

Thêm component nhỏ (đặt trước `export function AiMessageList`):
```tsx
function AttachmentDisplay({ attachment }: { attachment: AiAttachmentMeta }) {
  if (attachment.mimeType.startsWith('image/')) {
    if (attachment.previewUrl) {
      return (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="max-w-[200px] rounded-lg"
        />
      );
    }
    return (
      <span className="text-[11px] opacity-60">[🖼 {attachment.name}]</span>
    );
  }

  const Icon =
    attachment.mimeType === 'application/json'
      ? FileJson
      : attachment.mimeType.startsWith('text/')
        ? FileText
        : File;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-0.5 text-[11px]">
      <Icon className="h-3 w-3" />
      <span className="max-w-[140px] truncate">{attachment.name}</span>
    </div>
  );
}
```

- [ ] **Step 3: Thêm empty state và cập nhật render user message**

Tìm đoạn mở đầu của `return (`:
```tsx
return (
  <div className="relative flex-1 overflow-hidden">
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full space-y-3 overflow-y-auto px-4 py-3"
    >
      {messages.map((msg, idx) => (
```
Thêm empty state ngay sau `className="h-full space-y-3 overflow-y-auto px-4 py-3"`:
```tsx
      >
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Bắt đầu cuộc trò chuyện với AI</p>
          </div>
        )}
        {messages.map((msg, idx) => (
```
Thêm import `Bot` từ `lucide-react` vào đầu file `AiMessageList.tsx` (cùng dòng với `ArrowDown`):
```ts
import { ArrowDown, Bot } from 'lucide-react';
```

Sau đó tìm đoạn render user message bubble:
```tsx
{msg.role === 'user'
  ? <span className="whitespace-pre-wrap break-words">{msg.content}</span>
  : <AiMessageContent content={msg.content} />}
```
Thay thành:
```tsx
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
```

- [ ] **Step 4: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/layout/AiMessageList.tsx
git commit -m "feat(ai-chat): AiMessageList hiển thị ảnh inline và file chip trong message bubble"
```

---

## Task 7: Tách `AiChatInput` + tích hợp toàn bộ vào `AiChatPanel`

**Files:**
- Create: `src/features/chat/components/layout/AiChatInput.tsx`
- Modify: `src/features/chat/components/layout/AiChatPanel.tsx`

**Interfaces:**
- Consumes: `useAiAttachments` (Task 4), `AiAttachmentTray` (Task 5), `callGemini` với attachments (Task 2), `AiMessage` với attachments (Task 1)
- Produces: Tính năng upload file hoạt động end-to-end trong `AiChatPanel`

- [ ] **Step 1: Tạo `AiChatInput.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import type { AiAttachment } from '@/lib/gemini';
import { AiAttachmentTray } from './AiAttachmentTray';

interface AiChatInputProps {
  input: string;
  loading: boolean;
  attachments: AiAttachment[];
  attachmentError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onResize: () => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onSend: () => void,
    disabled: boolean,
  ) => void;
  onSend: () => void;
  onAddFiles: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment: (id: string) => void;
}

export function AiChatInput({
  input,
  loading,
  attachments,
  attachmentError,
  textareaRef,
  onInputChange,
  onResize,
  onKeyDown,
  onSend,
  onAddFiles,
  onRemoveAttachment,
}: AiChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !input.trim() && attachments.length === 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      void onAddFiles(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <AiAttachmentTray
        attachments={attachments}
        error={attachmentError}
        onRemove={onRemoveAttachment}
      />
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain,text/csv,application/json,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          type="button"
          aria-label="Đính kèm file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          variant="filled"
          rows={1}
          className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
          placeholder="Nhắn tin với AI..."
          value={input}
          onChange={(e) => {
            onInputChange(e.target.value);
            onResize();
          }}
          onKeyDown={(e) => onKeyDown(e, onSend, loading)}
        />
        <Button
          size="icon"
          variant="solid"
          type="button"
          onClick={onSend}
          disabled={isDisabled || loading}
          className="h-9 w-9 shrink-0"
          aria-label="Gửi"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Cập nhật `AiChatPanel.tsx`**

Thay toàn bộ nội dung `AiChatPanel.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Bot, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { ComboBox } from "@/components/ui/combobox/ComboBox";
import { useAutoResizeTextarea } from "@/features/chat/hooks/useAutoResizeTextarea";
import { useAiAttachments } from "@/features/chat/hooks/useAiAttachments";
import { AiHistoryPanel } from "./AiHistoryPanel";
import { AiMessageList } from "./AiMessageList";
import { AiChatInput } from "./AiChatInput";
import { useAiSessions } from "@/features/chat/hooks/useAiSessions";
import type { AiMessage } from "@/features/chat/hooks/useAiSessions";
import {
  callGemini,
  fetchGeminiModels,
  GEMINI_FREE_MODELS,
  type GeminiModelInfo,
} from "@/lib/gemini";

const MODEL_STORAGE_KEY = "ai-panel-model";

function loadModel(): string {
  if (typeof window === "undefined") return GEMINI_FREE_MODELS[0].value;
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? GEMINI_FREE_MODELS[0].value;
}

export function AiChatPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(loadModel);
  const [modelOptions, setModelOptions] = useState<GeminiModelInfo[]>(GEMINI_FREE_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession } =
    useAiSessions();
  const messages = activeSession?.messages ?? [];

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  useEffect(() => {
    setLoadingModels(true);
    void fetchGeminiModels().then((models) => {
      setModelOptions(models);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [focusInput]);

  function handleModelChange(value: string | string[]) {
    const next = Array.isArray(value) ? (value[0] ?? model) : value;
    setModel(next);
    try { localStorage.setItem(MODEL_STORAGE_KEY, next); } catch { /* ignore */ }
  }

  function handleNewChat() {
    setActiveId(null);
    setInput("");
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
    const userMsg: AiMessage = {
      role: "user",
      content: trimmed,
      attachments: attachments.map(({ name, mimeType, size, previewUrl }) => ({
        name,
        mimeType,
        size,
        previewUrl,
      })),
    };
    const nextMessages = [...currentMessages, userMsg];

    pushMessage(sid, userMsg);
    setInput("");
    clearAttachments();
    setLoading(true);
    setError(null);

    try {
      const content = await callGemini(model, nextMessages, attachments);
      pushMessage(sid, { role: "assistant", content });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi tin nhắn thất bại");
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  return (
    <aside className="flex flex-col h-full w-full shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex flex-col gap-2.5 px-4 pb-3 pt-[18px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Halo AI</span>
          </div>
          <div className="flex items-center gap-0.5">
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
              variant={showHistory ? "solid" : "ghost"}
              className="h-8 w-8"
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Lịch sử hội thoại"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!showHistory && (
          <ComboBox
            clearIcon={false}
            options={loadingModels ? [{ label: "Đang tải...", value: model }] : modelOptions}
            value={model}
            onValueChange={handleModelChange}
            autocomplete={false}
          />
        )}
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
    </aside>
  );
}
```

**Lưu ý:** `AiMessageContent` không còn được import trực tiếp trong `AiChatPanel` (đã chuyển sang `AiMessageList`). Kiểm tra xem import cũ còn không thì xóa.

- [ ] **Step 3: Verify TypeScript compile**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 4: Chạy toàn bộ test suite**

```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npx vitest run 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 5: Kiểm tra UI thủ công**

Khởi động dev server:
```bash
cd /home/huytq/code/my/fe/vibe-chat-fe && npm run dev
```

Checklist kiểm tra:
- [ ] Nút paperclip hiện bên trái textarea
- [ ] Click paperclip → file picker mở, cho chọn nhiều file
- [ ] Chọn ảnh → thumbnail 48×48 hiện trong tray kèm nút `×`
- [ ] Chọn PDF → pill chip hiện tên file kèm `×`
- [ ] Chọn file .exe → error "Định dạng không hỗ trợ" hiện dưới tray
- [ ] Chọn file > 5MB → error tương ứng
- [ ] Click `×` trên tray → xóa file
- [ ] Send button disabled khi không có text VÀ không có file
- [ ] Gửi ảnh + text → ảnh hiện trong bubble, AI trả lời về ảnh
- [ ] Gửi PDF + text → chip hiện trong bubble, AI đọc nội dung PDF
- [ ] Sau khi gửi → tray xóa trống
- [ ] Reload trang → ảnh trong history hiện `[🖼 tên]` placeholder

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/components/layout/AiChatInput.tsx \
        src/features/chat/components/layout/AiChatPanel.tsx
git commit -m "feat(ai-chat): tích hợp upload ảnh/file — AiChatInput, paperclip, send với attachments"
```

---

## Tổng kết file thay đổi

| File | Loại |
|------|------|
| `src/features/chat/hooks/useAiSessions.ts` | Sửa |
| `src/lib/gemini/index.ts` | Sửa |
| `src/app/api/gemini/chat/route.ts` | Sửa |
| `src/features/chat/hooks/useAiAttachments.ts` | Tạo mới |
| `src/features/chat/hooks/useAiAttachments.test.ts` | Tạo mới |
| `src/features/chat/components/layout/AiAttachmentTray.tsx` | Tạo mới |
| `src/features/chat/components/layout/AiChatInput.tsx` | Tạo mới |
| `src/features/chat/components/layout/AiMessageList.tsx` | Sửa |
| `src/features/chat/components/layout/AiChatPanel.tsx` | Sửa |
