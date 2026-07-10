// Barrel domain types của feature chat. Import cũ `@/features/chat/types` giữ nguyên.
// Re-export tường minh (isolatedModules yêu cầu `export type` cho type).

export type {
  ConversationMember,
  MemberRole,
  BannedMember,
  PermissionScope,
  GroupSettings,
} from './member';

export type { ConversationType, Conversation } from './conversation';

export type {
  EncryptionType,
  MessageType,
  LastMessagePreview,
  Attachment,
  AttachmentUrl,
  Message,
  Mention,
  EditMessageInput,
  DeleteMessageInput,
  SendMessageInput,
  OptimisticMeta,
  MessagesPage,
  SharedContentType,
} from './message';

export type {
  ReactionType,
  MessageReaction,
  ReactionState,
  Reactor,
  ReactorsPage,
} from './reaction';

export type { PollOption, PollData } from './poll';

export type {
  JoinRequestStatus,
  JoinRequestRequester,
  JoinRequest,
} from './join-request';

export type {
  RichMarkType,
  RichMark,
  RichBlock,
  RichText,
} from './rich-text';

export type { ShareContactTarget, ContactCardMetadata } from './contact-card';
export { readContactCard } from './contact-card';

export type {
  MediaCategory,
  MediaStatus,
  MediaResponse,
  PresignResponse,
  PresignInput,
  MediaDimensions,
} from './media';

export type { Presence } from './presence';

export type { CommonGroupItem, CommonGroupsPage } from './common-group';

export type {
  ScheduledMessageStatus,
  ScheduledMessage,
  CreateScheduledMessageInput,
  UpdateScheduledMessageInput,
} from './scheduled-message';
