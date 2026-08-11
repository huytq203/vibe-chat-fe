const MOJIBAKE_MARKERS = /[\u0080-\u009f]|Ã|Â|Ä|Å|Æ|â|ð|ï¿½/g;

function mojibakeScore(value: string): number {
  return value.match(MOJIBAKE_MARKERS)?.length ?? 0;
}

function decodeLatin1BytesAsUtf8(value: string): string | null {
  const codeUnits = Array.from(value, (char) => char.charCodeAt(0));
  if (codeUnits.some((code) => code > 0xff)) return null;

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codeUnits));
  } catch {
    return null;
  }
}

/**
 * Khôi phục tên UTF-8 từng bị đọc nhầm như Latin-1 (vd. "Huy Ä\u0091Ã¢y").
 * Chỉ nhận kết quả khi số dấu hiệu mojibake giảm, nên tên Unicode hợp lệ được giữ nguyên.
 */
export function normalizeDisplayName(value: string): string {
  let normalized = value;

  // Tối đa 2 vòng để xử lý cả dữ liệu đã bị encode sai nhiều hơn một lần.
  for (let round = 0; round < 2; round += 1) {
    const currentScore = mojibakeScore(normalized);
    if (currentScore === 0) break;

    const decoded = decodeLatin1BytesAsUtf8(normalized);
    if (!decoded || mojibakeScore(decoded) >= currentScore) break;
    normalized = decoded;
  }

  return normalized;
}

const DISPLAY_NAME_FIELDS = new Set(['displayName', 'actorName']);

/** Chuẩn hoá riêng các trường tên trong JSON trả về từ task-service. */
export function normalizeTaskDisplayNames<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTaskDisplayNames(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      DISPLAY_NAME_FIELDS.has(key) && typeof item === 'string'
        ? normalizeDisplayName(item)
        : normalizeTaskDisplayNames(item),
    ]),
  ) as T;
}
