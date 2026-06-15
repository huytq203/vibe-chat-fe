# Rich Text Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép soạn tin có định dạng (đậm/nghiêng/gạch/màu/highlight/font/căn lề/link) trong `MessageInput`, lưu định dạng dạng range trong `metadata.richText`, render bằng React thuần.

**Architecture:** `plaintext` giữ thuần (search/preview/mention/mã hoá không đổi). Định dạng = `metadata.richText { marks[], blocks[] }` offset UTF-16. Editor dùng Tiptap v3 (wrap trong `src/lib/editor/`); read path là renderer React riêng (`RichText`), không dùng Tiptap. BE chỉ thêm `metadata?` vào edit DTO + validate richText.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Tiptap v3 (ProseMirror), NestJS + Mongoose (BE).

**Repos:** FE `vibe-chat-fe` (cwd). BE `/home/huytq/code/my/be/vibe-chat`.

**Thứ tự build:** Read path & BE độc lập, làm trước (testable không cần Tiptap). Editor Tiptap làm sau cùng.

---

## Phase 0 — Foundation (types + presets)

### Task 1: FE rich-text types

**Files:**
- Modify: `src/features/chat/types.ts`

- [ ] **Step 1: Thêm type richText vào types.ts** (đặt ngay sau type `Mention`, dòng ~204)

```ts
/** Loại mark inline của rich text (xem spec rich-text-editor). */
export type RichMarkType =
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'color' | 'highlight' | 'link' | 'font';

/** 1 đoạn định dạng inline; offset theo UTF-16 của plaintext (đồng bộ Mention). */
export type RichMark = {
  start: number;
  end: number; // exclusive
  type: RichMarkType;
  /** color/highlight = preset key; link = URL; font = preset key. */
  value?: string;
};

/** Căn lề theo block (đoạn). */
export type RichBlock = {
  start: number;
  end: number;
  align: 'left' | 'center' | 'right';
};

/** Định dạng rich text lưu trong metadata.richText. */
export type RichText = {
  v: 1;
  marks: RichMark[];
  blocks: RichBlock[];
};
```

- [ ] **Step 2: Cho phép edit kèm metadata** — sửa `EditMessageInput` (dòng ~206)

```ts
export type EditMessageInput = {
  conversationId: string;
  messageId: string;
  plaintext: string;
  /** Định dạng rich text mới (đặt vào metadata.richText). */
  metadata?: Record<string, unknown>;
};
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (không lỗi mới).

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/types.ts
git commit -m "feat(chat): rich text types (RichMark/RichBlock/RichText)"
```

---

### Task 2: Presets + URL sanitize (lib/editor)

Whitelist màu/font + hàm an toàn link. Pure, test trước.

**Files:**
- Create: `src/lib/editor/rich-presets.ts`
- Create: `src/lib/editor/rich-presets.test.ts`

- [ ] **Step 1: Viết test (TDD)** — `src/lib/editor/rich-presets.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  sanitizeLinkUrl,
  isColorKey,
  isFontKey,
  RICH_COLORS,
  RICH_FONTS,
} from './rich-presets';

describe('sanitizeLinkUrl', () => {
  it('giữ http/https/mailto', () => {
    expect(sanitizeLinkUrl('https://a.com')).toBe('https://a.com');
    expect(sanitizeLinkUrl('http://a.com')).toBe('http://a.com');
    expect(sanitizeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('tự thêm https:// cho URL không scheme', () => {
    expect(sanitizeLinkUrl('a.com')).toBe('https://a.com');
  });
  it('chặn javascript:/data:', () => {
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeLinkUrl('data:text/html,x')).toBeNull();
    expect(sanitizeLinkUrl('  JavaScript:alert(1)')).toBeNull();
  });
  it('chặn rỗng', () => {
    expect(sanitizeLinkUrl('')).toBeNull();
    expect(sanitizeLinkUrl('   ')).toBeNull();
  });
});

describe('whitelist', () => {
  it('isColorKey', () => {
    expect(isColorKey(RICH_COLORS[0].key)).toBe(true);
    expect(isColorKey('rgb(1,2,3)')).toBe(false);
  });
  it('isFontKey', () => {
    expect(isFontKey(RICH_FONTS[0].key)).toBe(true);
    expect(isFontKey('Comic Sans')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test → fail**

Run: `npx vitest run src/lib/editor/rich-presets.test.ts`
Expected: FAIL ("Cannot find module './rich-presets'").

- [ ] **Step 3: Cài đặt** — `src/lib/editor/rich-presets.ts`

```ts
/**
 * Whitelist preset cho rich text (màu/font) + sanitize URL link.
 * Giá trị color/font dùng CSS var theme (Design/DESIGN.md) — KHÔNG hex rời rạc.
 */

export type RichColor = { key: string; label: string; cssVar: string };

/** Màu chữ & highlight — bám token theme. `cssVar` map sang style runtime. */
export const RICH_COLORS: readonly RichColor[] = [
  { key: 'default', label: 'Mặc định', cssVar: 'var(--color-foreground)' },
  { key: 'primary', label: 'Tím', cssVar: 'var(--color-primary)' },
  { key: 'success', label: 'Xanh lá', cssVar: 'var(--color-success)' },
  { key: 'warning', label: 'Vàng', cssVar: 'var(--color-warning)' },
  { key: 'danger', label: 'Đỏ', cssVar: 'var(--color-danger)' },
  { key: 'muted', label: 'Xám', cssVar: 'var(--color-muted-foreground)' },
] as const;

export type RichFont = { key: string; label: string; cssFamily: string };

export const RICH_FONTS: readonly RichFont[] = [
  { key: 'default', label: 'Mặc định', cssFamily: 'inherit' },
  { key: 'serif', label: 'Serif', cssFamily: 'Georgia, "Times New Roman", serif' },
  { key: 'mono', label: 'Mono', cssFamily: 'ui-monospace, "SF Mono", monospace' },
] as const;

const COLOR_KEYS = new Set(RICH_COLORS.map((c) => c.key));
const FONT_KEYS = new Set(RICH_FONTS.map((f) => f.key));

export const isColorKey = (v: string): boolean => COLOR_KEYS.has(v);
export const isFontKey = (v: string): boolean => FONT_KEYS.has(v);

export const colorCssVar = (key: string): string =>
  RICH_COLORS.find((c) => c.key === key)?.cssVar ?? 'var(--color-foreground)';
export const fontCssFamily = (key: string): string =>
  RICH_FONTS.find((f) => f.key === key)?.cssFamily ?? 'inherit';

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

/**
 * Chuẩn hoá + kiểm tra URL link. Trả URL an toàn hoặc null nếu không hợp lệ /
 * scheme nguy hiểm (javascript:, data:, ...). URL không scheme → thêm https://.
 */
export function sanitizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return SAFE_SCHEMES.includes(url.protocol) ? candidate : null;
  } catch {
    return null;
  }
}
```

> ⚠ Lưu ý gõ đúng: property là `cssFamily` (sửa lại nếu vô tình gõ ký tự lạ). Type `RichFont` và object phải khớp tên `cssFamily`.

- [ ] **Step 4: Sửa type RichFont cho khớp** — đảm bảo:

```ts
export type RichFont = { key: string; label: string; cssFamily: string };
```

- [ ] **Step 5: Chạy test → pass**

Run: `npx vitest run src/lib/editor/rich-presets.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/editor/rich-presets.ts src/lib/editor/rich-presets.test.ts
git commit -m "feat(editor): rich text presets + link url sanitize"
```

---

## Phase 1 — Read path (render bubble, không cần Tiptap)

### Task 3: `RichText` renderer

Chia plaintext theo ranh giới marks + mentions, dựng span style + block align. Đoạn không mark vẫn qua `EmojiText`.

**Files:**
- Create: `src/features/chat/components/messages/RichText.tsx`
- Create: `src/features/chat/components/messages/RichText.test.tsx`
- Reference: `src/features/chat/components/messages/MentionText.tsx` (mention chip), `src/components/common/EmojiText.tsx`

- [ ] **Step 1: Viết test (TDD)** — `RichText.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText';
import type { RichText as RichTextData } from '@/features/chat/types';

const rt = (marks: RichTextData['marks'], blocks: RichTextData['blocks'] = []): RichTextData => ({
  v: 1, marks, blocks,
});

describe('RichText', () => {
  it('render đậm theo range', () => {
    render(<RichText text="Xin chao" mentions={[]} richText={rt([{ start: 0, end: 3, type: 'bold' }])} />);
    const el = screen.getByText('Xin');
    expect(el.tagName).toBe('STRONG');
  });

  it('render link an toàn, chặn javascript:', () => {
    render(
      <RichText
        text="click me"
        mentions={[]}
        richText={rt([{ start: 0, end: 8, type: 'link', value: 'javascript:alert(1)' }])}
      />,
    );
    // URL nguy hiểm → không render thẻ <a>, chỉ text thường.
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('click me')).toBeInTheDocument();
  });

  it('link hợp lệ render <a> target _blank', () => {
    render(
      <RichText
        text="open"
        mentions={[]}
        richText={rt([{ start: 0, end: 4, type: 'link', value: 'https://a.com' }])}
      />,
    );
    const a = screen.getByRole('link', { name: 'open' });
    expect(a).toHaveAttribute('href', 'https://a.com');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('fallback: richText rỗng → vẫn render text', () => {
    render(<RichText text="hello" mentions={[]} richText={rt([])} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test → fail**

Run: `npx vitest run src/features/chat/components/messages/RichText.test.tsx`
Expected: FAIL ("Cannot find module './RichText'").

- [ ] **Step 3: Cài đặt** — `RichText.tsx`

```tsx
'use client';

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmojiText } from '@/components/common/EmojiText';
import { colorCssVar, fontCssFamily, sanitizeLinkUrl } from '@/lib/editor/rich-presets';
import type { Mention, RichMark, RichText as RichTextData } from '@/features/chat/types';

type RichTextProps = {
  text: string;
  mentions: Mention[];
  richText: RichTextData;
  className?: string;
  largeEmoji?: boolean;
  isMe?: boolean;
};

type Boundary = number;

/** Gom các điểm cắt (boundary) từ marks + mentions để chia text thành đoạn đồng nhất. */
function collectBoundaries(len: number, marks: RichMark[], mentions: Mention[]): Boundary[] {
  const set = new Set<number>([0, len]);
  marks.forEach((m) => {
    if (m.start >= 0 && m.end <= len && m.start < m.end) {
      set.add(m.start);
      set.add(m.end);
    }
  });
  mentions.forEach((m) => {
    set.add(m.startOffset);
    set.add(m.startOffset + m.length);
  });
  return [...set].filter((b) => b >= 0 && b <= len).sort((a, b) => a - b);
}

/** Marks phủ toàn bộ [s,e). */
function marksCovering(marks: RichMark[], s: number, e: number): RichMark[] {
  return marks.filter((m) => m.start <= s && m.end >= e && m.start < m.end);
}

/** Áp style inline từ tập marks lên 1 đoạn text/children. */
function applyMarks(marks: RichMark[], key: string, children: ReactNode): ReactNode {
  let node = children;
  const style: CSSProperties = {};
  let linkUrl: string | null = null;

  for (const m of marks) {
    if (m.type === 'bold') node = <strong>{node}</strong>;
    else if (m.type === 'italic') node = <em>{node}</em>;
    else if (m.type === 'underline') node = <u>{node}</u>;
    else if (m.type === 'strike') node = <s>{node}</s>;
    else if (m.type === 'color' && m.value) style.color = colorCssVar(m.value);
    else if (m.type === 'highlight' && m.value) style.backgroundColor = colorCssVar(m.value);
    else if (m.type === 'font' && m.value) style.fontFamily = fontCssFamily(m.value);
    else if (m.type === 'link' && m.value) linkUrl = sanitizeLinkUrl(m.value);
  }

  const hasStyle = Object.keys(style).length > 0;
  if (linkUrl) {
    return (
      <a
        key={key}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={hasStyle ? style : undefined}
        className="underline underline-offset-2 hover:opacity-80"
      >
        {node}
      </a>
    );
  }
  if (hasStyle) return <span key={key} style={style}>{node}</span>;
  return <Fragment key={key}>{node}</Fragment>;
}

/**
 * Render text có rich formatting + mention. Mention chip giữ logic màu như MentionText
 * (đoạn mention bỏ qua mark inline để chip thống nhất). Đoạn thường qua EmojiText.
 */
export function RichText({ text, mentions, richText, className, largeEmoji, isMe }: RichTextProps) {
  const len = text.length;
  const boundaries = collectBoundaries(len, richText.marks, mentions);
  const mentionAt = (s: number): Mention | undefined =>
    mentions.find((m) => m.startOffset === s && m.length > 0);

  const parts: ReactNode[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const e = boundaries[i + 1];
    if (s >= e) continue;
    const slice = text.slice(s, e);
    const mention = mentionAt(s);
    if (mention && mention.startOffset + mention.length === e) {
      const chipClass = cn('rounded px-0.5 font-medium', isMe ? 'text-primary-foreground' : 'text-primary');
      parts.push(<span key={`mn-${s}`} className={chipClass}>{slice}</span>);
      continue;
    }
    const covering = marksCovering(richText.marks, s, e);
    const inner = <EmojiText text={slice} largeEmoji={largeEmoji} linkify className="inline" />;
    parts.push(applyMarks(covering, `p-${s}`, inner));
  }

  return (
    <span className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </span>
  );
}
```

- [ ] **Step 4: Chạy test → pass**

Run: `npx vitest run src/features/chat/components/messages/RichText.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/messages/RichText.tsx src/features/chat/components/messages/RichText.test.tsx
git commit -m "feat(chat): RichText renderer (read path, no tiptap)"
```

---

### Task 4: Dùng RichText trong MessageBubble

**Files:**
- Modify: `src/features/chat/components/messages/MessageBubble.tsx` (hàm `BubbleContent`, dòng ~229)

- [ ] **Step 1: Thêm helper đọc richText từ metadata** — đầu file MessageBubble.tsx (sau imports), thêm:

```tsx
import { RichText } from './RichText';
import type { RichText as RichTextData } from '@/features/chat/types';

/** Lấy richText hợp lệ từ metadata (tin cũ / không định dạng → null). */
function getRichText(metadata: Record<string, unknown> | null): RichTextData | null {
  const rt = metadata?.richText as RichTextData | undefined;
  if (!rt || rt.v !== 1 || !Array.isArray(rt.marks) || !Array.isArray(rt.blocks)) return null;
  if (rt.marks.length === 0 && rt.blocks.length === 0) return null;
  return rt;
}
```

- [ ] **Step 2: Sửa nhánh TEXT trong `BubbleContent`** (dòng ~233-240) thành:

```tsx
  if (message.type === 'TEXT') {
    const body = message.plaintext ?? message.contentPreview ?? '';
    const textClass = 'block whitespace-pre-wrap break-words text-[13.5px] leading-relaxed';
    const richText = getRichText(message.metadata);
    if (richText) {
      return (
        <RichText
          text={body}
          mentions={message.mentions ?? []}
          richText={richText}
          className={textClass}
          largeEmoji
          isMe={isMe}
        />
      );
    }
    if (message.mentions?.length) {
      return <MentionText text={body} mentions={message.mentions} className={textClass} largeEmoji isMe={isMe} />;
    }
    return <EmojiText text={body} className={textClass} largeEmoji linkify />;
  }
```

- [ ] **Step 3: Type check + test cũ vẫn xanh**

Run: `npx tsc --noEmit && npx vitest run src/features/chat`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/components/messages/MessageBubble.tsx
git commit -m "feat(chat): render richText trong MessageBubble (fallback tin cũ)"
```

---

## Phase 2 — Backend (`/home/huytq/code/my/be/vibe-chat`)

> Chạy lệnh BE trong thư mục BE. Test BE: `npm test -- <pattern>` (Jest).

### Task 5: BE richText validator helper

**Files:**
- Create: `src/modules/messages/helpers/rich-text.helper.ts`
- Create: `src/modules/messages/tests/rich-text.helper.spec.ts`

- [ ] **Step 1: Viết test (TDD)** — `rich-text.helper.spec.ts`

```ts
import { sanitizeRichText, RICH_COLOR_KEYS, RICH_FONT_KEYS } from '../helpers/rich-text.helper';

describe('sanitizeRichText', () => {
  it('loại mark offset ngoài text', () => {
    const out = sanitizeRichText({ v: 1, marks: [{ start: 0, end: 99, type: 'bold' }], blocks: [] }, 5);
    expect(out?.marks).toHaveLength(0);
  });
  it('loại link scheme nguy hiểm', () => {
    const out = sanitizeRichText(
      { v: 1, marks: [{ start: 0, end: 3, type: 'link', value: 'javascript:alert(1)' }], blocks: [] },
      5,
    );
    expect(out?.marks).toHaveLength(0);
  });
  it('giữ link https', () => {
    const out = sanitizeRichText(
      { v: 1, marks: [{ start: 0, end: 3, type: 'link', value: 'https://a.com' }], blocks: [] },
      5,
    );
    expect(out?.marks).toHaveLength(1);
  });
  it('loại color không whitelist', () => {
    const out = sanitizeRichText(
      { v: 1, marks: [{ start: 0, end: 3, type: 'color', value: 'rgb(1,2,3)' }], blocks: [] },
      5,
    );
    expect(out?.marks).toHaveLength(0);
  });
  it('null nếu không phải object', () => {
    expect(sanitizeRichText('x', 5)).toBeNull();
    expect(sanitizeRichText(null, 5)).toBeNull();
  });
  it('null nếu không còn mark/block', () => {
    expect(sanitizeRichText({ v: 1, marks: [], blocks: [] }, 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test → fail**

Run (trong thư mục BE): `npm test -- rich-text.helper`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Cài đặt** — `src/modules/messages/helpers/rich-text.helper.ts`

```ts
/**
 * Validate + làm sạch richText (metadata.richText) đến từ client. Lenient:
 * loại riêng mark/block lỗi, KHÔNG reject cả tin. Trả null nếu rỗng/sai kiểu.
 * Đồng bộ whitelist với FE src/lib/editor/rich-presets.ts.
 */

export const RICH_COLOR_KEYS = ['default', 'primary', 'success', 'warning', 'danger', 'muted'];
export const RICH_FONT_KEYS = ['default', 'serif', 'mono'];
const MARK_TYPES = ['bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'link', 'font'];
const ALIGNS = ['left', 'center', 'right'];
const MAX_MARKS = 200;
const MAX_BLOCKS = 100;
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

const isSafeLink = (raw: unknown): boolean => {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const url = new URL(raw.trim());
    return SAFE_SCHEMES.includes(url.protocol);
  } catch {
    return false;
  }
};

const validMark = (m: unknown, len: number): boolean => {
  if (typeof m !== 'object' || m === null) return false;
  const x = m as Record<string, unknown>;
  if (typeof x.start !== 'number' || typeof x.end !== 'number') return false;
  if (x.start < 0 || x.end > len || x.start >= x.end) return false;
  if (typeof x.type !== 'string' || !MARK_TYPES.includes(x.type)) return false;
  if (x.type === 'link') return isSafeLink(x.value);
  if (x.type === 'color' || x.type === 'highlight') return RICH_COLOR_KEYS.includes(x.value as string);
  if (x.type === 'font') return RICH_FONT_KEYS.includes(x.value as string);
  return true;
};

const validBlock = (b: unknown, len: number): boolean => {
  if (typeof b !== 'object' || b === null) return false;
  const x = b as Record<string, unknown>;
  if (typeof x.start !== 'number' || typeof x.end !== 'number') return false;
  if (x.start < 0 || x.end > len || x.start >= x.end) return false;
  return typeof x.align === 'string' && ALIGNS.includes(x.align);
};

export function sanitizeRichText(raw: unknown, plaintextLen: number): unknown | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const x = raw as Record<string, unknown>;
  const marks = Array.isArray(x.marks) ? x.marks.filter((m) => validMark(m, plaintextLen)).slice(0, MAX_MARKS) : [];
  const blocks = Array.isArray(x.blocks) ? x.blocks.filter((b) => validBlock(b, plaintextLen)).slice(0, MAX_BLOCKS) : [];
  if (marks.length === 0 && blocks.length === 0) return null;
  return { v: 1, marks, blocks };
}
```

- [ ] **Step 4: Chạy test → pass**

Run: `npm test -- rich-text.helper`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/messages/helpers/rich-text.helper.ts src/modules/messages/tests/rich-text.helper.spec.ts
git commit -m "feat(messages): sanitize richText helper"
```

---

### Task 6: BE áp validator vào send + edit (metadata)

**Files:**
- Modify: `src/modules/messages/dto/edit-message.dto.ts`
- Modify: `src/modules/messages/messages.service.ts` (send: dòng ~212 metadata; editMessage)
- Reference: đọc `editMessage` hiện tại trong `messages.service.ts` trước khi sửa.

- [ ] **Step 1: Edit DTO nhận metadata** — `edit-message.dto.ts`, thêm vào class:

```ts
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// ... giữ import MESSAGE_TEXT_MAX_LENGTH

  @ApiPropertyOptional({ description: 'Metadata mới (chứa richText định dạng).' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
```

- [ ] **Step 2: Đọc editMessage hiện tại**

Run: `grep -n "editMessage" src/modules/messages/messages.service.ts`
Sau đó đọc thân hàm `editMessage` để biết chỗ build update.

- [ ] **Step 3: Send — sanitize richText trong metadata** — tại chỗ build metadata khi tạo message (dòng ~212 `metadata: dto.metadata ?? null`), thay bằng helper:

```ts
import { sanitizeRichText } from './helpers/rich-text.helper';

// ... trong hàm tạo message, sau khi có plaintext (text đã decrypt/độ dài):
const safeMetadata = buildMetadataWithRichText(dto.metadata, plaintext);
// metadata: safeMetadata
```

Thêm helper private trong service:

```ts
/** Lọc richText trong metadata theo độ dài plaintext; field khác giữ nguyên. */
private buildMetadataWithRichText(
  metadata: Record<string, unknown> | undefined,
  plaintext: string | null,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const len = plaintext?.length ?? 0;
  const richText = sanitizeRichText(metadata.richText, len);
  const rest = { ...metadata };
  delete rest.richText;
  const out = richText ? { ...rest, richText } : rest;
  return Object.keys(out).length > 0 ? out : null;
}
```

> Lưu ý: nếu chỗ tạo message chưa có biến `plaintext` (text thuần) sẵn, dùng `dto.plaintext ?? null`.

- [ ] **Step 4: Edit — cập nhật metadata** — trong `editMessage`, sau khi re-encrypt plaintext mới, thêm cập nhật metadata:

```ts
// dto: EditServerMessageDto (đã có metadata?)
const safeMetadata = this.buildMetadataWithRichText(dto.metadata, dto.plaintext);
// đưa `metadata: safeMetadata` vào object update của repository (cùng chỗ set content/isEdited/editedAt).
```

> Nếu `dto.metadata` undefined (client sửa không kèm định dạng) → set `metadata: null` để xoá định dạng cũ, hoặc giữ nguyên tuỳ contract. **Chốt:** set theo `safeMetadata` (undefined metadata → null = bỏ định dạng cũ, đúng kỳ vọng "sửa lại text thường").

- [ ] **Step 5: Chạy test BE liên quan**

Run: `npm test -- messages.service`
Expected: PASS (sửa test cũ nếu chữ ký thay đổi).

- [ ] **Step 6: Build BE**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit (BE repo)**

```bash
git add src/modules/messages/dto/edit-message.dto.ts src/modules/messages/messages.service.ts
git commit -m "feat(messages): persist + sanitize richText khi send/edit"
```

---

## Phase 3 — FE Editor (Tiptap v3)

### Task 7: Cài Tiptap

**Files:** `package.json`

- [ ] **Step 1: Cài deps** (FE repo)

Run:
```bash
npm install @tiptap/react@^3 @tiptap/core@^3 @tiptap/pm@^3 \
  @tiptap/extension-document@^3 @tiptap/extension-paragraph@^3 @tiptap/extension-text@^3 \
  @tiptap/extension-bold@^3 @tiptap/extension-italic@^3 @tiptap/extension-underline@^3 \
  @tiptap/extension-strike@^3 @tiptap/extension-link@^3 @tiptap/extension-text-style@^3 \
  @tiptap/extension-color@^3 @tiptap/extension-highlight@^3 @tiptap/extension-font-family@^3 \
  @tiptap/extension-text-align@^3 @tiptap/extension-mention@^3 \
  @tiptap/extension-placeholder@^3 @tiptap/extension-history@^3
```
Expected: cài thành công, không peer-dep error với React 19.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add tiptap v3 (rich text editor)"
```

---

### Task 8: Wrap editor + serializer

Wrap Tiptap (factory extensions) + serializer doc↔message. Serializer là phần rủi ro cao → test kỹ.

**Files:**
- Create: `src/lib/editor/extensions.ts` (factory extensions Tiptap)
- Create: `src/lib/editor/serializer.ts` (`editorToMessage`, `messageToEditor`)
- Create: `src/lib/editor/serializer.test.ts`

- [ ] **Step 1: Viết test serializer (TDD)** — `serializer.test.ts`

> Test thao tác trên JSON doc của Tiptap (không cần render DOM). Dùng `messageToEditor` để dựng JSON rồi `editorToMessage(jsonToDocText(...))`. Để test thuần JSON, serializer nhận **Tiptap JSON content** (`JSONContent`) thay vì editor instance ở lớp pure; lớp component sẽ truyền `editor.getJSON()`.

```ts
import { describe, expect, it } from 'vitest';
import { jsonToMessage, messageToJson } from './serializer';

describe('serializer round-trip', () => {
  it('text đậm + mention + link + align', () => {
    const json = messageToJson(
      'Xin chao Huy',
      [{ userId: 'u1', startOffset: 9, length: 3 }],
      { v: 1, marks: [
        { start: 0, end: 3, type: 'bold' },
        { start: 9, end: 12, type: 'link', value: 'https://a.com' },
      ], blocks: [{ start: 0, end: 12, align: 'center' }] },
    );
    const out = jsonToMessage(json);
    expect(out.plaintext).toBe('Xin chao Huy');
    expect(out.mentions).toEqual([{ userId: 'u1', startOffset: 9, length: 3 }]);
    expect(out.richText?.marks).toEqual(
      expect.arrayContaining([{ start: 0, end: 3, type: 'bold' }]),
    );
    const block = out.richText?.blocks[0];
    expect(block?.align).toBe('center');
  });

  it('text thuần → richText null', () => {
    const json = messageToJson('hello', [], { v: 1, marks: [], blocks: [] });
    const out = jsonToMessage(json);
    expect(out.plaintext).toBe('hello');
    expect(out.richText).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test → fail**

Run: `npx vitest run src/lib/editor/serializer.test.ts`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Cài đặt serializer** — `src/lib/editor/serializer.ts`

> Mô hình: 1 paragraph = 1 block (align lấy từ `attrs.textAlign`). Text node mang `marks` của Tiptap (bold/italic/underline/strike/textStyle{color,fontFamily}/highlight/link). Mention node `{ type:'mention', attrs:{ id, label } }`. Emoji = ký tự text thường.

```ts
import type { JSONContent } from '@tiptap/core';
import { isColorKey, isFontKey, sanitizeLinkUrl } from './rich-presets';
import type { Mention, RichBlock, RichMark, RichText } from '@/features/chat/types';

export type SerializedMessage = {
  plaintext: string;
  mentions: Mention[];
  richText: RichText | null;
};

// map màu CSS var (Tiptap lưu) ngược về preset key. Vì editor set theo cssVar, ta
// lưu thẳng preset key vào attrs khi set màu (xem toolbar) → ở đây color/font là key.
const colorKeyFromMark = (attrs: Record<string, unknown>): string | undefined => {
  const v = attrs?.color;
  return typeof v === 'string' && isColorKey(v) ? v : undefined;
};
const fontKeyFromMark = (attrs: Record<string, unknown>): string | undefined => {
  const v = attrs?.fontFamily;
  return typeof v === 'string' && isFontKey(v) ? v : undefined;
};

/** Tiptap JSON → { plaintext, mentions, richText }. */
export function jsonToMessage(doc: JSONContent): SerializedMessage {
  let text = '';
  const mentions: Mention[] = [];
  const marks: RichMark[] = [];
  const blocks: RichBlock[] = [];
  const paragraphs = doc.content ?? [];

  paragraphs.forEach((para, pIdx) => {
    const blockStart = text.length;
    const align = (para.attrs?.textAlign as RichBlock['align']) ?? 'left';
    (para.content ?? []).forEach((node) => {
      if (node.type === 'mention') {
        const id = String(node.attrs?.id ?? '');
        const label = String(node.attrs?.label ?? '');
        const token = `@${label}`;
        mentions.push({ userId: id, startOffset: text.length, length: token.length });
        text += token;
        return;
      }
      if (node.type === 'text') {
        const start = text.length;
        const value = node.text ?? '';
        text += value;
        const end = text.length;
        (node.marks ?? []).forEach((mk) => {
          const t = mk.type;
          if (t === 'bold') marks.push({ start, end, type: 'bold' });
          else if (t === 'italic') marks.push({ start, end, type: 'italic' });
          else if (t === 'underline') marks.push({ start, end, type: 'underline' });
          else if (t === 'strike') marks.push({ start, end, type: 'strike' });
          else if (t === 'highlight') marks.push({ start, end, type: 'highlight', value: 'warning' });
          else if (t === 'link') {
            const url = sanitizeLinkUrl(String(mk.attrs?.href ?? ''));
            if (url) marks.push({ start, end, type: 'link', value: url });
          } else if (t === 'textStyle') {
            const c = colorKeyFromMark(mk.attrs ?? {});
            if (c) marks.push({ start, end, type: 'color', value: c });
            const f = fontKeyFromMark(mk.attrs ?? {});
            if (f) marks.push({ start, end, type: 'font', value: f });
          }
        });
        return;
      }
    });
    const blockEnd = text.length;
    if (align !== 'left' && blockEnd > blockStart) {
      blocks.push({ start: blockStart, end: blockEnd, align });
    }
    if (pIdx < paragraphs.length - 1) text += '\n';
  });

  const richText: RichText | null =
    marks.length || blocks.length ? { v: 1, marks, blocks } : null;
  return { plaintext: text, mentions, richText };
}

/** { plaintext, mentions, richText } → Tiptap JSON để nạp lại khi Edit. */
export function messageToJson(
  plaintext: string,
  mentions: Mention[],
  richText: RichText,
): JSONContent {
  // Tách theo dòng → mỗi dòng 1 paragraph; trong dòng chia theo mention + mark boundary.
  const lines = plaintext.split('\n');
  let offset = 0;
  const content: JSONContent[] = lines.map((line) => {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    const block = richText.blocks.find((b) => b.start <= lineStart && b.end >= lineEnd);
    const para: JSONContent = {
      type: 'paragraph',
      attrs: block ? { textAlign: block.align } : {},
      content: buildInline(plaintext, mentions, richText.marks, lineStart, lineEnd),
    };
    offset = lineEnd + 1; // +1 cho '\n'
    return para;
  });
  return { type: 'doc', content };
}

function buildInline(
  text: string,
  mentions: Mention[],
  marks: RichMark[],
  from: number,
  to: number,
): JSONContent[] {
  const out: JSONContent[] = [];
  const set = new Set<number>([from, to]);
  marks.forEach((m) => { if (m.start >= from && m.start <= to) set.add(m.start); if (m.end >= from && m.end <= to) set.add(m.end); });
  mentions.forEach((m) => { set.add(m.startOffset); set.add(m.startOffset + m.length); });
  const bounds = [...set].filter((b) => b >= from && b <= to).sort((a, b) => a - b);

  for (let i = 0; i < bounds.length - 1; i++) {
    const s = bounds[i];
    const e = bounds[i + 1];
    if (s >= e) continue;
    const mention = mentions.find((m) => m.startOffset === s && m.startOffset + m.length === e);
    if (mention) {
      out.push({ type: 'mention', attrs: { id: mention.userId, label: text.slice(s + 1, e) } });
      continue;
    }
    const tiptapMarks = marks
      .filter((m) => m.start <= s && m.end >= e)
      .map(toTiptapMark)
      .filter((m): m is NonNullable<typeof m> => m !== null);
    out.push({ type: 'text', text: text.slice(s, e), marks: tiptapMarks });
  }
  return out;
}

function toTiptapMark(m: RichMark): { type: string; attrs?: Record<string, unknown> } | null {
  switch (m.type) {
    case 'bold': case 'italic': case 'underline': case 'strike':
      return { type: m.type };
    case 'highlight': return { type: 'highlight' };
    case 'link': return { type: 'link', attrs: { href: m.value } };
    case 'color': return { type: 'textStyle', attrs: { color: m.value } };
    case 'font': return { type: 'textStyle', attrs: { fontFamily: m.value } };
    default: return null;
  }
}
```

> Quyết định: để serialize màu/font về **preset key** dễ dàng, ta cấu hình extension Color/FontFamily ở Task 9 lưu **key** (vd `color: 'danger'`) chứ không lưu CSS thực; CSS hiển thị trong editor áp bằng CSS class/var (xem extensions.ts). Highlight v1 cố định 1 màu (`warning`).

- [ ] **Step 4: Cài extensions factory** — `src/lib/editor/extensions.ts`

```ts
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import History from '@tiptap/extension-history';
import type { Extensions } from '@tiptap/core';

/** Extension preset cho ô soạn tin. Mention truyền riêng (cần config suggestion). */
export function baseEditorExtensions(placeholder: string): Extensions {
  return [
    Document, Paragraph, Text,
    Bold, Italic, Underline, Strike,
    TextStyle, Color, FontFamily, Highlight,
    Link.configure({ openOnClick: false, autolink: false }),
    TextAlign.configure({ types: ['paragraph'] }),
    History,
    Placeholder.configure({ placeholder }),
  ];
}
```

- [ ] **Step 5: Chạy test serializer → pass**

Run: `npx vitest run src/lib/editor/serializer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/editor/extensions.ts src/lib/editor/serializer.ts src/lib/editor/serializer.test.ts
git commit -m "feat(editor): tiptap extensions + doc<->message serializer"
```

---

### Task 9: MessageToolbar

Thanh nút định dạng. Tách nhóm nút để giữ < 200 dòng.

**Files:**
- Create: `src/features/chat/components/messages/MessageToolbar.tsx`
- Reference: Basuicn `@/components/ui/button/Button`, `popover/Popover`, `dropdown-menu/DropdownMenu`; icon lucide-react (`Bold, Italic, Underline, Strikethrough, Link2, Palette, Highlighter, Type, AlignLeft, AlignCenter, AlignRight`).

- [ ] **Step 1: Cài đặt** — `MessageToolbar.tsx`

```tsx
'use client';

import type { Editor } from '@tiptap/react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Highlighter, Italic, Link2,
  Palette, Strikethrough, Type, Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { RICH_COLORS, RICH_FONTS, sanitizeLinkUrl } from '@/lib/editor/rich-presets';

type MessageToolbarProps = { editor: Editor | null; disabled?: boolean };

export function MessageToolbar({ editor, disabled }: MessageToolbarProps) {
  if (!editor) return null;
  const btn = (active: boolean) =>
    cn('text-muted-foreground hover:text-foreground', active && 'text-primary');

  const insertLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const input = window.prompt('Nhập URL liên kết', prev ?? 'https://');
    if (input === null) return;
    if (input.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = sanitizeLinkUrl(input);
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-1 py-1">
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Đậm" title="Đậm (Ctrl+B)"
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Nghiêng" title="Nghiêng (Ctrl+I)"
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Gạch chân" title="Gạch chân (Ctrl+U)"
        className={btn(editor.isActive('underline'))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Gạch ngang" title="Gạch ngang"
        className={btn(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Button>

      <span className="mx-0.5 h-4 w-px bg-border" />

      <ColorPopover editor={editor} disabled={disabled} />
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Highlight" title="Đánh dấu"
        className={btn(editor.isActive('highlight'))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></Button>
      <FontPopover editor={editor} disabled={disabled} />

      <span className="mx-0.5 h-4 w-px bg-border" />

      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Căn trái" title="Căn trái"
        className={btn(editor.isActive({ textAlign: 'left' }))}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Căn giữa" title="Căn giữa"
        className={btn(editor.isActive({ textAlign: 'center' }))}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Căn phải" title="Căn phải"
        className={btn(editor.isActive({ textAlign: 'right' }))}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Button>

      <span className="mx-0.5 h-4 w-px bg-border" />

      <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Chèn liên kết" title="Chèn liên kết"
        className={btn(editor.isActive('link'))} onClick={insertLink}><Link2 className="h-4 w-4" /></Button>
    </div>
  );
}

function ColorPopover({ editor, disabled }: MessageToolbarProps) {
  if (!editor) return null;
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Màu chữ" title="Màu chữ"
          className="text-muted-foreground hover:text-foreground"><Palette className="h-4 w-4" /></Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-1.5">
        <div className="flex gap-1">
          {RICH_COLORS.map((c) => (
            <button key={c.key} type="button" title={c.label} aria-label={c.label}
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: c.cssVar }}
              onClick={() =>
                c.key === 'default'
                  ? editor.chain().focus().unsetColor().run()
                  : editor.chain().focus().setColor(c.key).run()
              } />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FontPopover({ editor, disabled }: MessageToolbarProps) {
  if (!editor) return null;
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label="Phông chữ" title="Phông chữ"
          className="text-muted-foreground hover:text-foreground"><Type className="h-4 w-4" /></Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-1">
        <div className="flex flex-col">
          {RICH_FONTS.map((f) => (
            <button key={f.key} type="button"
              className="rounded px-2 py-1 text-left text-[13px] hover:bg-muted"
              style={{ fontFamily: f.cssFamily }}
              onClick={() =>
                f.key === 'default'
                  ? editor.chain().focus().unsetFontFamily().run()
                  : editor.chain().focus().setFontFamily(f.key).run()
              }>{f.label}</button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

> Lưu ý: `setColor`/`setFontFamily` lưu **key** (`'danger'`, `'mono'`). Trong editor cần map key→CSS để hiển thị: cấu hình CSS qua class wrapper (Task 10 `editorProps.attributes.class`) + CSS global định nghĩa `[style*="color: danger"]`… **Đơn giản hơn**: override Color/FontFamily extension renderHTML để xuất CSS var từ key. Nếu phức tạp, fallback: lưu CSS var thẳng và đổi `isColorKey`/serializer map ngược CSS var→key. Chốt khi code: dùng cách map ở `renderHTML` (xem Task 10 ghi chú).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (có thể cần điều chỉnh import Color/FontFamily theo API v3).

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/messages/MessageToolbar.tsx
git commit -m "feat(chat): MessageToolbar (đậm/nghiêng/màu/font/căn lề/link)"
```

---

### Task 10: RichMessageEditor

Component editor Tiptap, tích hợp mention (bridge popup cũ), emoji, paste ảnh, typing, giới hạn độ dài. Expose ref API cho composer.

**Files:**
- Create: `src/features/chat/components/messages/RichMessageEditor.tsx`
- Create: `src/lib/editor/mention-extension.ts` (Mention config bridge)
- Reference: `useMentionSuggest.ts`, `MentionSuggestPopup.tsx`, `composer-utils.ts` (MAX_LENGTH, MENTION_ALL), `EmojiPicker`.

- [ ] **Step 1: Mention extension bridge** — `src/lib/editor/mention-extension.ts`

```ts
import Mention from '@tiptap/extension-mention';
import type { SuggestionOptions } from '@tiptap/suggestion';

/**
 * Mention node lưu attrs { id, label }. `suggestion` do component truyền vào để
 * cầu nối sang popup gợi ý hiện có (useMentionSuggest). Chip render class đồng bộ.
 */
export function createMentionExtension(suggestion: Partial<SuggestionOptions>) {
  return Mention.configure({
    HTMLAttributes: { class: 'rounded bg-primary/15 px-0.5 font-medium text-primary' },
    renderText: ({ node }) => `@${node.attrs.label}`,
    suggestion,
  });
}
```

- [ ] **Step 2: Cài đặt RichMessageEditor** — `RichMessageEditor.tsx`

```tsx
'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { baseEditorExtensions } from '@/lib/editor/extensions';
import { createMentionExtension } from '@/lib/editor/mention-extension';
import { jsonToMessage } from '@/lib/editor/serializer';
import { MAX_LENGTH } from '@/features/chat/components/messages/composer-utils';
import type { SerializedMessage } from '@/lib/editor/serializer';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { cn } from '@/lib/utils/cn';

export type EditorHandle = {
  editor: Editor | null;
  serialize: () => SerializedMessage;
  clear: () => void;
  focus: () => void;
  insertText: (text: string) => void;
};

type RichMessageEditorProps = {
  placeholder: string;
  disabled?: boolean;
  mentionSuggestion: Partial<SuggestionOptions>;
  onUpdate: (hasContent: boolean) => void;
  onEnter: () => void;
  onPasteFiles: (files: File[]) => boolean; // true nếu đã xử lý (chặn default)
};

export const RichMessageEditor = forwardRef<EditorHandle, RichMessageEditorProps>(
  function RichMessageEditor(
    { placeholder, disabled, mentionSuggestion, onUpdate, onEnter, onPasteFiles }, ref) {
    const editor = useEditor({
      editable: !disabled,
      extensions: [...baseEditorExtensions(placeholder), createMentionExtension(mentionSuggestion)],
      editorProps: {
        attributes: {
          class: cn(
            'min-h-[32px] max-h-32 overflow-y-auto px-1.5 py-[5px] text-[13.5px] leading-relaxed outline-none',
            disabled && 'cursor-not-allowed opacity-50',
          ),
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Nhập tin nhắn',
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            // Mention popup tự xử lý Enter khi mở (suggestion). Nếu không mở → gửi.
            event.preventDefault();
            onEnter();
            return true;
          }
          return false;
        },
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
            f.type.startsWith('image/'),
          );
          if (files.length > 0) return onPasteFiles(files);
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const { plaintext } = jsonToMessage(ed.getJSON());
        // Giới hạn độ dài: nếu vượt → undo bước vừa rồi.
        if (plaintext.length > MAX_LENGTH) {
          ed.commands.undo();
          return;
        }
        onUpdate(plaintext.trim().length > 0);
      },
    });

    useImperativeHandle(ref, () => ({
      editor,
      serialize: () => (editor ? jsonToMessage(editor.getJSON()) : { plaintext: '', mentions: [], richText: null }),
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus('end'),
      insertText: (text: string) => editor?.commands.insertContent(text),
    }), [editor]);

    return <EditorContent editor={editor} className="min-h-[32px] max-h-32 flex-1 overflow-y-auto" />;
  },
);
```

> Ghi chú màu/font (chốt cách hiển thị key trong editor): mở rộng `Color`/`FontFamily` bằng `.extend({ addGlobalAttributes ... renderHTML })` để map key→`color: var(--color-danger)` khi render trong editor; HOẶC đơn giản v1: bỏ hiển thị-đúng-màu trong editor, chỉ giữ đúng ở read path, editor hiển thị màu generic. **Khuyến nghị:** override `renderHTML` của TextStyle để đọc attr `color`/`fontFamily` là key → xuất `style="color: var(--color-<key>)"`. Đặt code này trong `extensions.ts` thay cho `Color`/`FontFamily` mặc định nếu cần. Xác minh API v3 khi code.

- [ ] **Step 3: Mention suggestion bridge với popup cũ** — trong `RichMessageEditor` hoặc composer, tạo `mentionSuggestion` dùng `useMentionSuggest`. Vì `useMentionSuggest` hiện gắn với contenteditable, **viết adapter mới** `useTiptapMention(conversationId)` trả `{ suggestion, popupProps }` dùng lại data-fetch member + `MentionSuggestPopup`. (Chi tiết: tái dùng query member của `useMentionSuggest`; render popup theo `suggestion.render` lifecycle Tiptap.)

> Đây là phần tích hợp lớn nhất. Adapter đọc danh sách member (cùng nguồn `useMentionSuggest`), `items` lọc theo query, `command` chèn mention node. Giữ `MentionSuggestPopup` cho UI. Test thủ công.

- [ ] **Step 4: Type check + build dev**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/messages/RichMessageEditor.tsx src/lib/editor/mention-extension.ts
git commit -m "feat(chat): RichMessageEditor (tiptap) + mention bridge"
```

---

### Task 11: Wire composer → editor + gửi/sửa kèm richText

**Files:**
- Modify: `src/features/chat/hooks/useMessageComposer.ts`
- Modify: `src/services/chat.api.ts` (`editMessage` nhận metadata)
- Modify: `src/features/chat/hooks/use-mutations.ts` (`useEditMessage` truyền metadata)

- [ ] **Step 1: chat.api.editMessage nhận metadata** — `chat.api.ts` (dòng ~133)

```ts
  editMessage: (conversationId: string, messageId: string, plaintext: string, metadata?: Record<string, unknown>) =>
    apiClient.patch<Message>(
      `/api/v1/conversations/${conversationId}/messages/${messageId}`,
      { body: { plaintext, metadata } },
    ),
```

- [ ] **Step 2: use-mutations truyền metadata** — trong `useEditMessage`, sửa call `chatApi.editMessage(...)` thành `chatApi.editMessage(input.conversationId, input.messageId, input.plaintext, input.metadata)`. (Optimistic update đã merge metadata — kiểm tra dòng ~143 và đảm bảo richText được set trong cache optimistic.)

- [ ] **Step 3: Refactor useMessageComposer dùng editor handle** — thay `editorRef: useRef<HTMLDivElement>` bằng `editorRef: useRef<EditorHandle>`. Các thay đổi:
  - `submit()`: lấy `{ plaintext, mentions, richText } = editorRef.current.serialize()`. Mentions expand @all như cũ (qua `mention.expandMentions`). Gửi `send.mutate({ ..., plaintext, mentions, metadata: richText ? { richText } : undefined })`. Với media caption: gắn `metadata: richText ? { richText } : undefined` vào tin mang caption.
  - `saveEdit()`: `editMut.mutate({ conversationId, messageId, plaintext, metadata: richText ? { richText } : undefined })`.
  - Dọn editor: `editorRef.current.clear()` thay `el.innerHTML=''`.
  - Edit prefill: `messageToJson(...)` set vào editor (Task 13).
  - `handleInput/handleKey/handlePaste` của contenteditable cũ → chuyển callback vào props của `RichMessageEditor` (onUpdate/onEnter/onPasteFiles). Typing indicator gắn vào `onUpdate`.
  - Emoji: `handleEmojiSelect` → `editorRef.current.insertText(emoji)`.

> Đây là refactor lớn; giữ chữ ký trả về của hook ổn định nhất có thể để `MessageInput` đổi ít. Component < 80 dòng/hook: tách phần typing & emoji sang helper nếu vượt.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/hooks/useMessageComposer.ts src/services/chat.api.ts src/features/chat/hooks/use-mutations.ts
git commit -m "feat(chat): gửi/sửa tin kèm richText qua editor handle"
```

---

### Task 12: MessageInput dùng editor + toolbar

**Files:**
- Modify: `src/features/chat/components/messages/MessageInput.tsx`

- [ ] **Step 1: Thay khối contenteditable** (dòng ~179-202) bằng `RichMessageEditor` + đặt `MessageToolbar` phía trên hàng input (trong khung `rounded-2xl`). Toolbar lấy `editor={editorRef.current?.editor ?? null}`. Giữ nguyên hàng nút trái (attachment/self-destruct/emoji) và nút gửi/mic phải.

- [ ] **Step 2: Type check + lint**

Run: `npx tsc --noEmit && npx eslint src/features/chat/components/messages/MessageInput.tsx`
Expected: PASS.

- [ ] **Step 3: Chạy app, test tay** — gửi tin đậm/nghiêng/màu/link/căn giữa; kiểm tra render bubble đúng; mention + emoji + paste ảnh vẫn hoạt động.

Run: `npm run dev` → mở 1 hội thoại.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/components/messages/MessageInput.tsx
git commit -m "feat(chat): MessageInput dùng RichMessageEditor + toolbar"
```

---

## Phase 4 — Edit round-trip + verify

### Task 13: Nạp lại định dạng khi Edit

**Files:**
- Modify: `src/features/chat/hooks/useMessageComposer.ts` (effect prefill khi `isEditing`)

- [ ] **Step 1: Prefill bằng messageToJson** — trong effect prefill (dòng ~92-108), thay `el.textContent = editing.text` bằng:

```ts
// editing cần kèm mentions + richText (mở rộng message-edit.store nếu thiếu).
const rt = editing.richText ?? { v: 1 as const, marks: [], blocks: [] };
editorRef.current?.editor?.commands.setContent(
  messageToJson(editing.text, editing.mentions ?? [], rt),
);
editorRef.current?.focus();
```

> Kiểm tra `message-edit.store`: `startEdit` cần lưu thêm `mentions` + `richText` từ message. Mở rộng store/payload nếu thiếu (đọc `src/features/chat/stores/message-edit.store.ts`).

- [ ] **Step 2: Mở rộng message-edit.store** — thêm `mentions?: Mention[]` và `richText?: RichText` vào kiểu editing + nơi gọi `startEdit` (MessageActions) truyền `message.mentions` và `getRichText(message.metadata)`.

- [ ] **Step 3: Type check + test**

Run: `npx tsc --noEmit && npx vitest run src/features/chat src/lib/editor`
Expected: PASS.

- [ ] **Step 4: Test tay** — sửa 1 tin có định dạng → toolbar/định dạng nạp đúng → lưu → bubble cập nhật.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/hooks/useMessageComposer.ts src/features/chat/stores/message-edit.store.ts src/features/chat/components/messages/MessageActions.tsx
git commit -m "feat(chat): nạp lại định dạng khi sửa tin (edit round-trip)"
```

---

### Task 14: Verify toàn bộ

- [ ] **Step 1: Lint + typecheck + test FE**

Run: `npx tsc --noEmit && npx eslint src/features/chat src/lib/editor && npx vitest run`
Expected: tất cả PASS.

- [ ] **Step 2: Test BE**

Run (BE repo): `npm test -- messages && npm run build`
Expected: PASS.

- [ ] **Step 3: Smoke test tay** — checklist:
  - Gửi tin: đậm/nghiêng/gạch chân/gạch ngang.
  - Màu chữ + highlight hiển thị đúng theme.
  - Font preset (serif/mono).
  - Căn trái/giữa/phải.
  - Insert link → bubble click mở tab mới; link `javascript:` bị chặn.
  - Mention @user + @all vẫn chạy; emoji; paste ảnh.
  - Sửa tin có định dạng → nạp lại đúng → lưu.
  - Tin cũ (không richText) render bình thường.

---

## Self-review notes (đã kiểm)

- **Spec coverage:** inline/link/màu/highlight/font/align (Task 9,3,8); storage metadata.richText (Task 1,8,11); BE edit metadata + validate (Task 5,6); read path không Tiptap (Task 3); wrap lib (Task 8,10); security link/whitelist (Task 2,3,5); test (Task 2,3,5,8). Edit round-trip (Task 13).
- **Rủi ro cao nhất:** (a) serializer offset chính xác; (b) mention bridge Tiptap↔popup cũ; (c) lưu màu/font dưới dạng key + renderHTML trong editor. Xác minh API Tiptap v3 lúc code (đọc node_modules/@tiptap/*/dist hoặc docs).
- **Type nhất quán:** `EditorHandle`, `SerializedMessage`, `jsonToMessage/messageToJson`, `sanitizeLinkUrl`, `RichText/RichMark/RichBlock` dùng thống nhất các task.
```
