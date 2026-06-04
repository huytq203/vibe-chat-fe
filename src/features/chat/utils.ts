import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Conversation, ConversationMember, Message } from './types';

// ─── Sửa / gỡ tin & tin tự huỷ ───────────────────────────────────────────────
// Xem FRONTEND/15-edit-recall-selfdestruct.md

/** Cửa sổ cho phép sửa tin = 5 phút kể từ createdAt. Quá hạn → 422. */
export const EDIT_WINDOW_MS = 5 * 60 * 1000;

/** Khoảng selfDestructTtl hợp lệ (giây): 5s → 30 ngày. Ngoài khoảng → 400. */
export const SELF_DESTRUCT_MIN_SECONDS = 5;
export const SELF_DESTRUCT_MAX_SECONDS = 2_592_000;

/** Tuỳ chọn hẹn giờ tự huỷ cho ô soạn tin (giây). `null` = tắt (tin thường). */
export const SELF_DESTRUCT_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: 'Tắt hẹn giờ', seconds: null },
  { label: '5 giây', seconds: 5 },
  { label: '30 giây', seconds: 30 },
  { label: '1 phút', seconds: 60 },
  { label: '5 phút', seconds: 5 * 60 },
  { label: '1 giờ', seconds: 60 * 60 },
  { label: '1 ngày', seconds: 24 * 60 * 60 },
  { label: '1 tuần', seconds: 7 * 24 * 60 * 60 },
];

/**
 * Tin TEXT của chính mình, chưa gỡ, còn trong cửa sổ 5 phút → cho phép sửa.
 * Ẩn nút Sửa khi false để giảm số lần ăn lỗi 422 (xem doc 15).
 */
export function canEditMessage(msg: Message, meId: string | null): boolean {
  return (
    msg.senderId === meId &&
    msg.type === 'TEXT' &&
    !msg.isDeleted &&
    Date.now() - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS
  );
}

/** Nhãn preview cho tin media (không có caption) — dùng trong banner reply & quote. */
const MEDIA_SNIPPET: Partial<Record<Message['type'], string>> = {
  IMAGE: '[Hình ảnh]',
  VIDEO: '[Video]',
  AUDIO: '[Âm thanh]',
  FILE: '[Tệp]',
  STICKER: '[Nhãn dán]',
  LOCATION: '[Vị trí]',
  CONTACT: '[Danh thiếp]',
};

/**
 * Preview ngắn 1 dòng của tin nhắn cho banner trả lời & khối trích dẫn (ReplyQuote).
 * Ưu tiên text; tin media không caption → nhãn theo loại; đã gỡ / E2E → nhãn riêng.
 */
export function getMessageSnippet(msg: Message): string {
  if (msg.isDeleted) return 'Tin nhắn đã thu hồi';
  if (msg.encryptionType === 'E2E') return 'Tin nhắn mã hoá';
  const text = (msg.plaintext ?? msg.contentPreview ?? '').trim();
  if (text) return text;
  return MEDIA_SNIPPET[msg.type] ?? '[Tin nhắn]';
}

/** Định dạng thời gian còn lại (ms) thành nhãn ngắn cho đồng hồ tự huỷ. */
export function formatTimeLeft(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const AVATAR_PALETTE = [
  '#7132f5', '#e0495e', '#49a0e0', '#149e61',
  '#e0c849', '#e07849', '#9e75e7', '#e049c8',
];

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE', { locale: vi });
  return format(d, 'dd/MM');
}

export function formatBubbleTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

// ─── Media helpers ──────────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type FileIconMeta = { label: string; color: string };

const FILE_ICON_MAP: Record<string, FileIconMeta> = {
  pdf: { label: 'PDF', color: '#e0495e' },
  fig: { label: 'FIG', color: '#9e75e7' },
  doc: { label: 'DOC', color: '#49a0e0' },
  docx: { label: 'DOC', color: '#49a0e0' },
  xls: { label: 'XLS', color: '#149e61' },
  xlsx: { label: 'XLS', color: '#149e61' },
  ppt: { label: 'PPT', color: '#e07849' },
  pptx: { label: 'PPT', color: '#e07849' },
  zip: { label: 'ZIP', color: '#e0c849' },
  rar: { label: 'RAR', color: '#e0c849' },
  mp4: { label: 'MP4', color: '#49e0b0' },
  mp3: { label: 'MP3', color: '#e049c8' },
  txt: { label: 'TXT', color: '#8778a0' },
};

export function getFileIconMeta(ext: string | null | undefined): FileIconMeta {
  const key = (ext ?? '').toLowerCase();
  return (
    FILE_ICON_MAP[key] ?? {
      label: (key || 'FILE').toUpperCase().slice(0, 4),
      color: '#9e75e7',
    }
  );
}

export function fileExtFromName(name: string | null | undefined): string {
  if (!name) return '';
  return (name.split('.').pop() ?? '').toLowerCase();
}

/**
 * Ép tải Blob về máy qua object URL same-origin (URL ký sẵn S3 là cross-origin
 * nên thuộc tính `download` của <a> bị bỏ qua → phải tạo object URL cục bộ).
 */
export function triggerSave(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function getMemberName(member: ConversationMember | undefined | null): string | null {
  if (!member) return null;
  return member.nickname || member.displayName || member.username || null;
}

export function buildMemberNameMap(conv: Conversation | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  conv?.members?.forEach((m) => {
    const name = getMemberName(m);
    if (name) map[m.userId] = name;
  });
  return map;
}

export function getConversationName(conv: Conversation, meId: string | null): string {
  if (conv.name) return conv.name;
  if (conv.type === 'DIRECT') {
    const other = conv.members?.find((m) => m.userId !== meId);
    if (other) return other.nickname || other.displayName || other.username || 'Trò chuyện';
    const otherId = conv.memberIds.find((id) => id !== meId);
    return otherId ?? 'Trò chuyện';
  }
  return 'Nhóm chưa đặt tên';
}

export function getConversationSeed(conv: Conversation, meId: string | null): string {
  if (conv.type === 'DIRECT') {
    const other = conv.members?.find((m) => m.userId !== conv.ownerId);
    if (other) return other.userId;
    return conv.memberIds.find((id) => id !== meId) ?? conv.id;
  }
  return conv.id;
}
