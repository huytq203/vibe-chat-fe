import { emojiToUrl } from '@/lib/utils/emoji';

export const MAX_LENGTH = 5000;
export const TYPING_STOP_DEBOUNCE_MS = 3_000;

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
