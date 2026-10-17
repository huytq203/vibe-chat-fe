import { diffArrays } from 'diff';

export type HtmlBlockChange = 'added' | 'removed';

export interface HtmlBlockDiff {
  /** HTML bản trước, khối bị xoá có `data-ai-diff="removed"`. */
  beforeHtml: string;
  /** HTML bản sau, khối thêm hoặc sửa có `data-ai-diff="added"`. */
  afterHtml: string;
  removedCount: number;
  addedCount: number;
}

const SR_LABELS: Record<HtmlBlockChange, string> = {
  added: 'Đã thêm: ',
  removed: 'Đã xoá: ',
};

/** Khối nhận được span inline ngay bên trong mà vẫn là HTML hợp lệ. */
const INLINE_HOST_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function parseBlocks(html: string) {
  // DOMParser tạo document trơ: script không chạy, ảnh không tải.
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return { body, blocks: Array.from(body.children) };
}

/** outerHTML gộp khoảng trắng, nên đổi định dạng (đậm, màu) vẫn tính là thay đổi. */
function signatureOf(block: Element) {
  return block.outerHTML.replace(/\s+/g, ' ').trim();
}

function markBlock(block: Element, change: HtmlBlockChange) {
  block.setAttribute('data-ai-diff', change);
  const label = block.ownerDocument.createElement('span');
  label.className = 'ai-diff-sr';
  label.textContent = SR_LABELS[change];
  if (INLINE_HOST_TAGS.has(block.tagName)) block.prepend(label);
  else block.before(label);
}

/** So hai bản HTML theo khối cấp cao nhất và đánh dấu khối bị xoá ở bản trước, khối mới ở bản sau. */
export function diffHtmlBlocks(beforeHtml: string, afterHtml: string): HtmlBlockDiff {
  const before = parseBlocks(beforeHtml);
  const after = parseBlocks(afterHtml);
  const changes = diffArrays(before.blocks.map(signatureOf), after.blocks.map(signatureOf));

  let beforeIndex = 0;
  let afterIndex = 0;
  let removedCount = 0;
  let addedCount = 0;
  for (const change of changes) {
    const count = change.count ?? change.value.length;
    if (change.removed) {
      before.blocks.slice(beforeIndex, beforeIndex + count).forEach((block) => markBlock(block, 'removed'));
      beforeIndex += count;
      removedCount += count;
    } else if (change.added) {
      after.blocks.slice(afterIndex, afterIndex + count).forEach((block) => markBlock(block, 'added'));
      afterIndex += count;
      addedCount += count;
    } else {
      beforeIndex += count;
      afterIndex += count;
    }
  }

  return {
    beforeHtml: before.body.innerHTML,
    afterHtml: after.body.innerHTML,
    removedCount,
    addedCount,
  };
}
