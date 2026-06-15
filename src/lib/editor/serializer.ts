import type { JSONContent } from '@tiptap/core';
import {
  colorCssVar, colorKeyFromCss, fontCssFamily, fontKeyFromCss, sanitizeLinkUrl,
} from './rich-presets';
import type { Mention, RichBlock, RichMark, RichText } from '@/features/chat/types';

export type SerializedMessage = {
  plaintext: string;
  mentions: Mention[];
  richText: RichText | null;
};

/** Tiptap JSON → { plaintext, mentions, richText }. */
export function jsonToMessage(doc: JSONContent): SerializedMessage {
  const ctx = { text: '', mentions: [] as Mention[], marks: [] as RichMark[], blocks: [] as RichBlock[] };
  const paragraphs = doc.content ?? [];

  paragraphs.forEach((para, pIdx) => {
    const blockStart = ctx.text.length;
    const align = (para.attrs?.textAlign as RichBlock['align'] | null | undefined) ?? 'left';
    (para.content ?? []).forEach((node) => collectNode(node, ctx));
    const blockEnd = ctx.text.length;
    if (align !== 'left' && blockEnd > blockStart) {
      ctx.blocks.push({ start: blockStart, end: blockEnd, align });
    }
    if (pIdx < paragraphs.length - 1) ctx.text += '\n';
  });

  const richText: RichText | null =
    ctx.marks.length || ctx.blocks.length ? { v: 1, marks: ctx.marks, blocks: ctx.blocks } : null;
  return { plaintext: ctx.text, mentions: ctx.mentions, richText };
}

type CollectCtx = { text: string; mentions: Mention[]; marks: RichMark[]; blocks: RichBlock[] };

function collectNode(node: JSONContent, ctx: CollectCtx): void {
  if (node.type === 'mention') {
    const id = String(node.attrs?.id ?? '');
    const label = String(node.attrs?.label ?? '');
    const token = `@${label}`;
    ctx.mentions.push({ userId: id, startOffset: ctx.text.length, length: token.length });
    ctx.text += token;
    return;
  }
  if (node.type !== 'text') return;
  const start = ctx.text.length;
  ctx.text += node.text ?? '';
  const end = ctx.text.length;
  if (end <= start) return;
  (node.marks ?? []).forEach((mk) => collectMark(mk, start, end, ctx.marks));
}

function collectMark(
  mk: NonNullable<JSONContent['marks']>[number], start: number, end: number, marks: RichMark[],
): void {
  const t = mk.type;
  if (t === 'bold' || t === 'italic' || t === 'underline' || t === 'strike') {
    marks.push({ start, end, type: t });
  } else if (t === 'highlight') {
    marks.push({ start, end, type: 'highlight', value: 'warning' });
  } else if (t === 'link') {
    const url = sanitizeLinkUrl(String(mk.attrs?.href ?? ''));
    if (url) marks.push({ start, end, type: 'link', value: url });
  } else if (t === 'textStyle') {
    const colorKey = mk.attrs?.color ? colorKeyFromCss(String(mk.attrs.color)) : undefined;
    if (colorKey && colorKey !== 'default') marks.push({ start, end, type: 'color', value: colorKey });
    const fontKey = mk.attrs?.fontFamily ? fontKeyFromCss(String(mk.attrs.fontFamily)) : undefined;
    if (fontKey && fontKey !== 'default') marks.push({ start, end, type: 'font', value: fontKey });
  }
}

/** { plaintext, mentions, richText } → Tiptap JSON để nạp lại khi Edit. */
export function messageToJson(plaintext: string, mentions: Mention[], richText: RichText): JSONContent {
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
  text: string, mentions: Mention[], marks: RichMark[], from: number, to: number,
): JSONContent[] {
  const out: JSONContent[] = [];
  let cursor = from;
  while (cursor < to) {
    const mention = mentions.find((m) => m.startOffset === cursor && m.length > 0 && m.startOffset + m.length <= to);
    if (mention) {
      const mEnd = cursor + mention.length;
      const label = text.slice(cursor + 1, mEnd);
      out.push({ type: 'mention', attrs: { id: mention.userId, label } });
      cursor = mEnd;
      continue;
    }
    const next = nextBoundary(cursor, to, marks, mentions);
    const covering = marks.filter((m) => m.start <= cursor && m.end >= next && m.start < m.end);
    out.push({ type: 'text', text: text.slice(cursor, next), marks: toTiptapMarks(covering) });
    cursor = next;
  }
  return out;
}

function nextBoundary(cursor: number, to: number, marks: RichMark[], mentions: Mention[]): number {
  let next = to;
  marks.forEach((m) => {
    if (m.start > cursor && m.start < next) next = m.start;
    if (m.end > cursor && m.end < next) next = m.end;
  });
  mentions.forEach((m) => {
    if (m.startOffset > cursor && m.startOffset < next) next = m.startOffset;
  });
  return next;
}

type TiptapMark = { type: string; attrs?: Record<string, unknown> };

function toTiptapMarks(covering: RichMark[]): TiptapMark[] {
  const result: TiptapMark[] = [];
  const textStyleAttrs: Record<string, unknown> = {};
  covering.forEach((m) => {
    if (m.type === 'bold' || m.type === 'italic' || m.type === 'underline' || m.type === 'strike') {
      result.push({ type: m.type });
    } else if (m.type === 'highlight') {
      result.push({ type: 'highlight' });
    } else if (m.type === 'link' && m.value) {
      result.push({ type: 'link', attrs: { href: m.value } });
    } else if (m.type === 'color' && m.value) {
      textStyleAttrs.color = colorCssVar(m.value);
    } else if (m.type === 'font' && m.value) {
      textStyleAttrs.fontFamily = fontCssFamily(m.value);
    }
  });
  if (Object.keys(textStyleAttrs).length > 0) result.push({ type: 'textStyle', attrs: textStyleAttrs });
  return result;
}
