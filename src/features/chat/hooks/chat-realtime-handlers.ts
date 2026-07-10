// Barrel: logic handler realtime được tách sang các sibling module để giữ mỗi file
// < 300 dòng. useChatRealtime import từ đây nên đường dẫn không đổi.

export {
  makePatchConvInList,
  makeShouldBumpUnread,
  makeUpsertMessage,
  type PatchConvInList,
  type ShouldBumpUnread,
  type UpsertMessage,
  type RealtimeHandlerDeps,
} from './chat-realtime-cache';

export {
  makeOnMessageNew,
  makeOnMessageEdited,
  makeOnMessageDeleted,
  makeOnConversationNotify,
  makeOnMessageRead,
  makeOnPresenceUpdate,
  makeOnReactionUpdated,
} from './chat-realtime-message-handlers';

export {
  makeOnTyping,
  makeOnConversationDeleted,
  makeOnMuteUpdated,
  makeOnMembersAdded,
  makeOnMemberRemoved,
  makeOnJoinRequest,
  makeOnJoinRequestResolved,
  makeOnConversationUpdated,
  makeOnUserUpdated,
  makeOnPinUpdated,
  makeOnScheduledUpdate,
  makeOnScheduledSent,
} from './chat-realtime-group-handlers';
