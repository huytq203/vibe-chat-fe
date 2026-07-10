// ─── Media ────────────────────────────────────────────────────────────────────
// Tham chiếu doc FRONTEND/14-media-upload.md

export type MediaCategory =
  | 'AVATAR'
  | 'THUMBNAIL'
  | 'VOICE'
  | 'VIDEO'
  | 'ATTACHMENT';

export type MediaStatus = 'PENDING' | 'READY' | 'DELETED';

export type MediaResponse = {
  id: string;
  category: MediaCategory;
  status: MediaStatus;
  mimeType: string;
  size: number;
  originalName: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  downloadUrl: string | null;
  createdAt: string;
};

export type PresignResponse = {
  id: string;
  uploadUrl: string;
  method: 'PUT';
  contentType: string;
  expiresIn: number;
};

export type PresignInput = {
  category: MediaCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type MediaDimensions = {
  width?: number;
  height?: number;
  duration?: number;
};
