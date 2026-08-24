import {
  HocuspocusProvider,
  type onStatusParameters,
} from '@hocuspocus/provider';
import type { Doc as YDoc } from 'yjs';

import { env } from '@/config/env';

import { collabDocumentName } from './constants';

export type CollabConnectionStatus = onStatusParameters['status'];
export type CollabProvider = HocuspocusProvider;

export interface CreateCollabProviderOptions {
  pageId: string;
  doc: YDoc;
  getToken: () => string | null | Promise<string | null>;
  onStatus: (status: CollabConnectionStatus) => void;
}

/** Tạo kết nối trực tiếp tới collab server và lấy token mới ở mỗi lần nối lại. */
export function createCollabProvider({
  pageId,
  doc,
  getToken,
  onStatus,
}: CreateCollabProviderOptions): CollabProvider {
  return new HocuspocusProvider({
    url: env.NEXT_PUBLIC_NOTION_WS_URL,
    name: collabDocumentName(pageId),
    document: doc,
    token: async () => (await getToken()) ?? '',
    onStatus: ({ status }) => onStatus(status),
  });
}

/** Huỷ provider cùng các listener và kết nối WebSocket do nó quản lý. */
export function destroyCollabProvider(provider: CollabProvider): void {
  provider.destroy();
}
