import { IndexeddbPersistence } from 'y-indexeddb';
import type { Doc as YDoc } from 'yjs';

export interface CollabPersistence {
  whenSynced: Promise<void>;
  destroy(): Promise<void>;
}

/** Gắn bản lưu IndexedDB vào cùng Y.Doc để tài liệu tiếp tục hoạt động khi mất mạng. */
export function attachCollabPersistence(
  documentName: string,
  doc: YDoc,
): CollabPersistence {
  const persistence = new IndexeddbPersistence(documentName, doc);

  return {
    whenSynced: persistence.whenSynced.then(() => undefined),
    destroy: async () => {
      await persistence.destroy();
    },
  };
}
