// Bắt URL http(s) hoặc bắt đầu bằng www. — loại bỏ dấu câu kết câu ở cuối.
const URL_REGEX_SRC = String.raw`(?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"]`;

/** RegExp mới mỗi lần gọi để tránh chia sẻ lastIndex (flag global). */
export function createUrlRegex(): RegExp {
  return new RegExp(URL_REGEX_SRC, 'gi');
}

/** Thêm scheme https:// cho URL dạng www.* để href hợp lệ. */
export function normalizeUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Bóc danh sách URL xuất hiện trong text (giữ nguyên thứ tự). */
export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.match(createUrlRegex()) ?? [];
}
