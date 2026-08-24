export { Doc as YDoc } from 'yjs';

export { COLLAB_FRAGMENT_NAME, collabDocumentName } from './constants';
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
