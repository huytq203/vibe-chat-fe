import type { JSONContent } from '@tiptap/core';

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractInlineText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((node) => {
      if (!isRecord(node)) return '';

      if (node.type === 'text') {
        return typeof node.text === 'string' ? node.text : '';
      }

      if (node.type === 'link' || Array.isArray(node.content)) {
        return extractInlineText(node.content);
      }

      return '';
    })
    .join('');
}

export function extractHeadingOutline(blocks: readonly unknown[]): OutlineItem[] {
  if (!Array.isArray(blocks)) return [];

  const outline: OutlineItem[] = [];

  function visit(items: readonly unknown[]): void {
    for (const item of items) {
      if (!isRecord(item)) continue;

      if (item.type === 'heading' && isRecord(item.props)) {
        const text = extractInlineText(item.content).trim();
        const level = item.props.level;

        if (
          text
          && typeof item.id === 'string'
          && typeof level === 'number'
          && Number.isInteger(level)
          && level >= 1
          && level <= 6
        ) {
          outline.push({ id: item.id, level, text });
        }
      }

      if (Array.isArray(item.children)) {
        visit(item.children);
      }
    }
  }

  visit(blocks);
  return outline;
}

export function extractTiptapOutline(json: JSONContent): OutlineItem[] {
  const outline: OutlineItem[] = [];
  let headingIndex = 0;

  function visit(node: JSONContent): void {
    if (node.type === 'heading') {
      const id = `heading-${headingIndex}`;
      const level = node.attrs?.level;
      const text = extractInlineText(node.content).trim();
      headingIndex += 1;

      if (
        text
        && typeof level === 'number'
        && Number.isInteger(level)
        && level >= 1
        && level <= 6
      ) {
        outline.push({ id, level, text });
      }
    }

    for (const child of node.content ?? []) visit(child);
  }

  visit(json);
  return outline;
}
