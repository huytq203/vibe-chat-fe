import { Doc as YDoc } from 'yjs';

import { collabDocumentName } from './constants';
import { attachCollabPersistence } from './persistence';
import {
  createCollabProvider,
  destroyCollabProvider,
  type CollabConnectionStatus,
  type CollabProvider,
} from './provider';

export interface CreateCollabSessionOptions {
  pageId: string;
  getToken: () => Promise<string | null>;
  onProvider: (provider: CollabProvider) => void;
  onStatus: (status: CollabConnectionStatus) => void;
  onLocalReady: () => void;
  onServerSynced: () => void;
  onAuthenticationFailed: (reason: string) => void;
  onError: (message: string) => void;
}

export interface CollabSession {
  readonly doc: YDoc;
  readonly provider: CollabProvider | null;
  destroy(): void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Không thể khởi tạo dữ liệu cộng tác cục bộ';
}

/** Nạp bản cục bộ trước khi nối server và gom toàn bộ vòng đời vào một phiên. */
export function createCollabSession(
  options: CreateCollabSessionOptions,
): CollabSession {
  const doc = new YDoc();
  const persistence = attachCollabPersistence(
    collabDocumentName(options.pageId),
    doc,
  );
  let provider: CollabProvider | null = null;
  let destroyed = false;

  void persistence.whenSynced
    .then(() => {
      if (destroyed) return;
      // CHỈ có nghĩa "đã nạp xong bản trong IndexedDB của máy này". KHÔNG được
      // hiểu là đã đồng bộ với server — provider bên dưới còn chưa nối.
      options.onLocalReady();
      provider = createCollabProvider({
        pageId: options.pageId,
        doc,
        getToken: options.getToken,
        onStatus: options.onStatus,
        onAuthenticationFailed: options.onAuthenticationFailed,
        onServerSynced: options.onServerSynced,
      });
      options.onProvider(provider);
    })
    .catch((error: unknown) => {
      if (!destroyed) options.onError(errorMessage(error));
    });

  return {
    doc,
    get provider() {
      return provider;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (provider) destroyCollabProvider(provider);
      const persistenceDestruction = persistence.destroy();
      doc.destroy();
      void persistenceDestruction.catch(() => undefined);
    },
  };
}
