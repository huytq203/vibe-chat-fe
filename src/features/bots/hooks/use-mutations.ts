'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { botsApi } from '@/services/bots.api';
import { botKeys, botTokenKeys, chatKeys } from '@/services/keys';
import { botTokensApi } from '@/services/bot-tokens.api';
import { sendBotDemoMessage } from '@/lib/bot-demo';
import { toast } from 'sonner';
import { usersApi } from '@/services/users.api';
import { chatApi } from '@/services/chat.api';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import type {
  BotDemoCommand,
  IssueTokenInput,
  UpdateBotInlineInput,
  UpdateBotWebappInput,
  UpdateBotInput,
} from '../schemas';

const BOTFATHER_USERNAME = 'botfather';

/** Sửa displayName/description của 1 bot. */
export function useUpdateBot(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBotInput) => botsApi.update(botId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Bật/tắt inline mode cho bot. */
export function useUpdateBotInline(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBotInlineInput) => botsApi.updateInline(botId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Bật/tắt mini app WebApp cho bot. */
export function useUpdateBotWebapp(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBotWebappInput) => {
      const allowedDomains = (input.allowedDomainsText ?? '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
      return botsApi.updateWebapp(botId, {
        enabled: input.enabled,
        menuUrl: input.menuUrl?.trim() || undefined,
        menuText: input.menuText?.trim() || undefined,
        allowedDomains,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Xoá (soft-delete) bot — BE tự thu hồi toàn bộ token. */
export function useDeleteBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) => botsApi.remove(botId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: botKeys.all }),
  });
}

/** Cấp token mới cho bot (ngoài token mặc định lúc tạo, hoặc khi cần thêm scope). */
export function useIssueToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTokenInput) => botTokensApi.issue(botId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token cũ + cấp token mới ngay lập tức (token cũ ngừng hoạt động). */
export function useRotateToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tokenId, input }: { tokenId: string; input: IssueTokenInput }) =>
      botTokensApi.rotate(botId, tokenId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Thu hồi token, không cấp lại. */
export function useRevokeToken(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => botTokensApi.revoke(botId, tokenId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: botTokenKeys.list(botId) }),
  });
}

/** Demo: bot gửi 1 tin nhắn "vui" vào conversation qua route nội bộ /api/bot-demo. */
export function useSendBotDemoMessage() {
  return useMutation({
    mutationFn: ({
      conversationUuid,
      command,
    }: {
      conversationUuid: string;
      command: BotDemoCommand;
    }) => sendBotDemoMessage(conversationUuid, command),
  });
}

/**
 * Mở (hoặc tạo) hội thoại DIRECT với BotFather rồi điều hướng sang màn hình
 * chat. `@`-prefix bắt buộc backend match CHÍNH XÁC theo username (xem
 * comment ở users.api.ts) — tránh prefix-search mờ khớp nhầm bot khác.
 */
export function useOpenBotFatherChat() {
  const queryClient = useQueryClient();
  const { setSelected } = useSelectedConversation();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);

  return useMutation({
    mutationFn: async () => {
      const page = await usersApi.search({ q: `@${BOTFATHER_USERNAME}`, limit: 5 });
      const botFather = page.items.find((u) => u.username === BOTFATHER_USERNAME);
      if (!botFather) {
        throw new Error('Không tìm thấy BotFather, thử lại sau');
      }
      return chatApi.createDirect(botFather.id);
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
      setMobilePanel('chat');
    },
    onError: (err: Error) => toast.error(err.message || 'Không mở được cuộc trò chuyện'),
  });
}
