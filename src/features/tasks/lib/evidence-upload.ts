export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-7z-compressed', 'application/gzip', 'application/x-rar-compressed',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
] as const;
export const MAX_EVIDENCE_FILE_BYTES = 100 * 1024 * 1024;

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_EVIDENCE_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    return 'Định dạng tệp không được hỗ trợ';
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    return 'Tệp không được vượt quá 100 MB';
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Number((bytes / 1024).toFixed(1))} KB`;
  return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
}
