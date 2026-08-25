export interface SearchSnippetSegment {
  text: string;
  highlighted: boolean;
}

const HIGHLIGHT_PATTERN = /<b>([\s\S]*?)<\/b>/g;

/**
 * BE dựng snippet bằng `ts_headline`, nhúng sẵn `<b>…</b>` quanh từ khớp —
 * không phải HTML tuỳ ý. Tách thành đoạn văn bản thuần để render qua JSX
 * (React tự escape), KHÔNG dùng `dangerouslySetInnerHTML` — nội dung trang do
 * người dùng gõ có thể chứa chuỗi giống thẻ HTML.
 */
export function searchSnippetSegments(snippet: string): SearchSnippetSegment[] {
  const segments: SearchSnippetSegment[] = [];
  let lastIndex = 0;
  for (const match of snippet.matchAll(HIGHLIGHT_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ text: snippet.slice(lastIndex, index), highlighted: false });
    segments.push({ text: match[1], highlighted: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < snippet.length) segments.push({ text: snippet.slice(lastIndex), highlighted: false });
  return segments;
}
