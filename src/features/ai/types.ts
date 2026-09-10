/** Tệp người dùng đính kèm ở khung chat AI — in-memory, không persist localStorage. */
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  previewUrl?: string; // object URL cho ảnh
};

export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string; // object URL — chỉ hợp lệ trong phiên hiện tại, không persist
  /**
   * base64 để gửi lại vẫn kèm được tệp thật. Giữ trong bộ nhớ, KHÔNG persist:
   * vài MB base64 sẽ làm vỡ quota localStorage của cả danh sách phiên.
   */
  data?: string;
};

/**
 * `failed` — tin của user, lượt gọi AI hỏng trước khi có chữ nào ⇒ hiện "Gửi lại / Sửa / Bỏ".
 * `incomplete` — tin của AI, stream đứt giữa chừng ⇒ giữ phần đã nhận, hiện "Gửi lại / Bỏ".
 */
export type AiMessageStatus = 'failed' | 'incomplete';

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
  status?: AiMessageStatus;
  /** Lý do hỏng, hiển thị ngay dưới bong bóng thay vì banner rời. */
  errorMessage?: string;
};

export type AiStreamFn = (
  messages: AiMessage[],
  attachments: readonly AiAttachmentMeta[] | undefined,
  options: {
    onDelta: (text: string) => void;
    onTool?: (name: string) => void;
    signal?: AbortSignal;
  },
) => Promise<string>;

export type AiSession = {
  id: string;
  title: string;
  messages: AiMessage[];
  updatedAt: number;
};

/** Thao tác ghi lên một phiên — truyền nguyên cụm xuống khung hội thoại. */
export type AiSessionActions = {
  createSession: () => string;
  pushMessage: (sessionId: string, message: AiMessage) => void;
  dropLastAssistant: (sessionId: string) => AiMessage[];
  markLastUserFailed: (sessionId: string, reason: string) => void;
  prepareResend: (sessionId: string, index: number) => AiMessage[];
  removeMessage: (sessionId: string, index: number) => AiMessage | null;
};
