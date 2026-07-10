'use client';

// Barrel: các mutation hook của chat được tách theo domain sang các file
// use-*-mutations.ts. Giữ file này để mọi import '@/features/chat/hooks/use-mutations'
// (và useChatRealtime) tiếp tục hoạt động không đổi.

export {
  registerOptimisticNonce,
  unregisterOptimisticNonce,
  peekOptimisticNonce,
} from './optimistic-nonce';

export {
  useSendMessage,
  useResendMessage,
  useDiscardFailedMessage,
} from './use-message-send-mutations';

export {
  useEditMessage,
  useDeleteMessage,
  useMarkRead,
} from './use-message-mutations';

export {
  useDeleteConversation,
  useCreateGroup,
  useSetNickname,
  useTogglePinConversation,
  useMuteConversation,
  useUpdateConversation,
  useUpdateGroupSettings,
  useOpenDirectConversation,
  useUpdateBackground,
} from './use-conversation-mutations';

export {
  useAddMembers,
  useRemoveMember,
  useLeaveConversation,
  useAcceptJoinRequest,
  useRejectJoinRequest,
  useBanMember,
  useUnbanMember,
  useSetMemberRole,
  useTransferOwnership,
} from './use-member-mutations';

export {
  useLockConversation,
  useRemoveLock,
  useChangeLockPassword,
  useVerifyLock,
} from './use-lock-mutations';

export { usePinMessage, useUnpinMessage } from './use-pin-mutations';
