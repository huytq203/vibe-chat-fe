export { Doc as YDoc } from 'yjs';

export {
  readCollabAwareness,
  setLocalCollabUser,
  subscribeCollabAwareness,
} from './awareness';
export type {
  CollabAwarenessEntry,
  CollabAwarenessUser,
} from './awareness';
export { COLLAB_FRAGMENT_NAME, collabDocumentName } from './constants';
export {
  createCollabCursorElement,
  markLocalCollabCursorMoved,
  startCollabCursorLabels,
} from './cursor-labels';
export {
  collabDocumentStateVectorBytes,
  collabDocumentUpdateBytes,
} from './document-size';
export { attachCollabPersistence } from './persistence';
export type { CollabPersistence } from './persistence';
export { createCollabProvider, destroyCollabProvider } from './provider';
export type {
  CollabConnectionStatus,
  CollabProvider,
  CreateCollabProviderOptions,
} from './provider';
export { createCollabSession } from './session';
export type { CollabSession, CreateCollabSessionOptions } from './session';
