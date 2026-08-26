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
  if (!Array.isArray(content)) return '';

  return content
    .map((node) => {
      if (!isRecord(node)) return '';

      if (node.type === 'text') {
        return typeof node.text === 'string' ? node.text : '';
      }

      if (node.type === 'link') {
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

        if (text && typeof item.id === 'string' && typeof level === 'number') {
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
