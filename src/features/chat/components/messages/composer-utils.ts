import { emojiToUrl } from '@/lib/utils/emoji';
import type { ConversationMember, Mention } from '@/features/chat/types';

export const MAX_LENGTH = 5000;
export const TYPING_STOP_DEBOUNCE_MS = 3_000;

/** data-attr đánh dấu 1 chip mention trong editor → dùng khi trích mentions. */
const MENTION_ID_ATTR = 'data-mention-id';
/** Sentinel cho chip `@all` — submit sẽ expand thành toàn bộ userId member. */
export const MENTION_ALL = '__ALL__';
/** Nhãn hiển thị của chip `@all`. */
export const MENTION_ALL_LABEL = 'all';
/** Class style cho chip mention trong ô soạn (đồng bộ với render bubble). */
const MENTION_CHIP_CLASS =
  'rounded bg-primary/15 px-0.5 font-medium text-primary';

/**
 * Duyệt DOM contenteditable → chuỗi text thuần.
 * text node → text gốc, <img data-emoji> → alt (ký tự emoji), <br> → \n.
 */
export function extractText(el: HTMLElement): string {
  let text = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node.nodeName === 'IMG') {
      text += (node as HTMLImageElement).alt;
    } else if (node.nodeName === 'BR') {
      text += '\n';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const inner = extractText(node as HTMLElement);
      text += inner;
      if (inner && ['DIV', 'P'].includes(node.nodeName)) text += '\n';
    }
  });
  return text;
}

/**
 * Trích vừa text thuần vừa danh sách mention (kèm offset) từ editor.
 * Mỗi chip `<span data-mention-id>` được coi như 1 khối nguyên: text của nó góp
 * vào plaintext, offset = độ dài text tích luỹ trước đó. Phần còn lại y hệt
 * `extractText` để hai hàm cho ra cùng một chuỗi.
 */
export function extractTextWithMentions(el: HTMLElement): {
  text: string;
  mentions: Mention[];
} {
  const mentions: Mention[] = [];
  let text = '';

  const walk = (node: Node): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? '';
        return;
      }
      if (child.nodeName === 'IMG') {
        text += (child as HTMLImageElement).alt;
        return;
      }
      if (child.nodeName === 'BR') {
        text += '\n';
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const elChild = child as HTMLElement;
      const userId = elChild.getAttribute(MENTION_ID_ATTR);
      if (userId) {
        const label = elChild.textContent ?? '';
        mentions.push({ userId, startOffset: text.length, length: label.length });
        text += label;
        return;
      }
      walk(elChild);
      if (['DIV', 'P'].includes(elChild.nodeName) && elChild.textContent) text += '\n';
    });
  };

  walk(el);
  return { text, mentions };
}

/** Vùng `@query` đang gõ ngay trước caret (để show popup & thay bằng chip). */
export type MentionQuery = { query: string; range: Range };

/**
 * Dò token `@query` liền trước caret trong editor. Trả null nếu không có (caret
 * không nằm trong text node, hoặc ký tự trước không tạo thành mention hợp lệ).
 */
export function findMentionQuery(el: HTMLElement): MentionQuery | null {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE || !el.contains(node)) return null;

  const before = (node.textContent ?? '').slice(0, sel.anchorOffset);
  const match = /(^|\s)@([^\s@]*)$/.exec(before);
  if (!match) return null;

  const atIndex = sel.anchorOffset - match[2].length - 1; // vị trí ký tự '@'
  const range = document.createRange();
  range.setStart(node, atIndex);
  range.setEnd(node, sel.anchorOffset);
  return { query: match[2], range };
}

/** Tên hiển thị ưu tiên nickname → displayName → username. */
export function mentionLabel(member: ConversationMember): string {
  return member.nickname || member.displayName || member.username;
}

/**
 * Khai triển sentinel `@all` thành mention cho từng `memberId` (giữ nguyên
 * offset/length của token), gộp mention thường, khử trùng userId, cap `max`.
 */
export function expandAllMentions(
  raw: Mention[],
  memberIds: string[],
  max: number,
): Mention[] {
  const out: Mention[] = [];
  const seen = new Set<string>();
  const push = (m: Mention) => {
    if (seen.has(m.userId) || out.length >= max) return;
    seen.add(m.userId);
    out.push(m);
  };
  raw.forEach((m) => {
    if (m.userId !== MENTION_ALL) return push(m);
    memberIds.forEach((userId) => push({ userId, startOffset: m.startOffset, length: m.length }));
  });
  return out;
}

/**
 * Thay vùng `@query` bằng 1 chip mention không sửa được + 1 dấu cách, đặt caret
 * sau dấu cách để gõ tiếp. `userId` có thể là MENTION_ALL cho chip `@all`.
 */
export function insertMention(range: Range, userId: string, label: string): void {
  range.deleteContents();
  const chip = document.createElement('span');
  chip.setAttribute(MENTION_ID_ATTR, userId);
  chip.setAttribute('contenteditable', 'false');
  chip.className = MENTION_CHIP_CLASS;
  chip.textContent = `@${label}`;

  const space = document.createTextNode(' ');
  range.insertNode(space);
  range.insertNode(chip);

  const after = document.createRange();
  after.setStartAfter(space);
  after.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(after);
}

/** Đặt caret về cuối nội dung của 1 element contenteditable. */
export function placeCaretAtEnd(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Chèn emoji vào editor tại vị trí caret (ưu tiên `savedRange` lưu trước khi mở
 * picker). Dùng twemoji <img> nếu có URL, fallback ký tự unicode.
 */
export function insertEmojiIntoEditor(
  el: HTMLElement,
  emoji: string,
  savedRange: Range | null,
): void {
  el.focus();
  const sel = window.getSelection();
  const range =
    savedRange ??
    (() => {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      return r;
    })();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
  range.deleteContents();

  const url = emojiToUrl(emoji);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = emoji;
    img.title = emoji;
    img.className = 'inline-block h-[1.2em] w-[1.2em] align-[-0.2em]';
    img.setAttribute('draggable', 'false');
    range.insertNode(img);
    range.setStartAfter(img);
  } else {
    const node = document.createTextNode(emoji);
    range.insertNode(node);
    range.setStartAfter(node);
  }

  range.collapse(true);
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
