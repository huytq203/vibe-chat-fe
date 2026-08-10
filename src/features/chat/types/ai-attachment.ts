/** Tệp người dùng đính kèm ở khung chat AI — in-memory, không persist localStorage. */
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  previewUrl?: string; // object URL cho ảnh
};
