import {
  HocuspocusProvider,
  type onAuthenticationFailedParameters,
  type onStatelessParameters,
} from '@hocuspocus/provider';
import type { Doc as YDoc } from 'yjs';

import { env } from '@/config/env';

import { collabDocumentName } from './constants';

export type CollabConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export type CollabProvider = HocuspocusProvider;

export const TOKEN_TIMEOUT_MS = 10_000;

export interface CreateCollabProviderOptions {
  pageId: string;
  doc: YDoc;
  getToken: () => string | null | Promise<string | null>;
  onStatus: (status: CollabConnectionStatus) => void;
  onAuthenticationFailed?: (reason: string) => void;
  /** Bắn khi SERVER đã đồng bộ xong, khác hẳn với việc nạp xong IndexedDB. */
  onServerSynced?: () => void;
  onStateless?: (payload: string) => void;
}

/** Tạo kết nối trực tiếp tới collab server và lấy token mới ở mỗi lần nối lại. */
export function createCollabProvider({
  pageId,
  doc,
  getToken,
  onStatus,
  onAuthenticationFailed,
  onServerSynced,
  onStateless,
}: CreateCollabProviderOptions): CollabProvider {
  return new HocuspocusProvider({
    url: env.NEXT_PUBLIC_NOTION_WS_URL,
    name: collabDocumentName(pageId),
    document: doc,
    token: async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        return await Promise.race([
          Promise.resolve().then(getToken).then((token) => token ?? ''),
          new Promise<string>((resolve) => {
            timeoutId = setTimeout(() => {
              onAuthenticationFailed?.(
                'Không lấy được phiên đăng nhập, hãy tải lại trang',
              );
              resolve('');
            }, TOKEN_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    },
    onStatus: ({ status }) => onStatus(status),
    onSynced: () => onServerSynced?.(),
    onStateless: ({ payload }: onStatelessParameters) => onStateless?.(payload),
    onAuthenticationFailed: ({ reason }: onAuthenticationFailedParameters) =>
      onAuthenticationFailed?.(reason),
  });
}

/** Huỷ provider cùng các listener và kết nối WebSocket do nó quản lý. */
export function destroyCollabProvider(provider: CollabProvider): void {
  provider.destroy();
}
