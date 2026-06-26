'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { myStoreKeys } from '@/services/keys';
import { myStoreApi } from '@/services/my-store.api';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useStoreConversation } from '@/features/my-store';

type UseOpenMyStore = {
  openMyStore: () => Promise<void>;
  isMyStoreActive: boolean;
};

/** Logic mở "Kho của tôi" (SELF conv) dùng chung cho NavSidebar và SearchOverlay. */
export function useOpenMyStore(): UseOpenMyStore {
  const router = useRouter();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const setMyStoreOpen = useChatUIStore((s) => s.setMyStoreOpen);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const myStoreOpen = useChatUIStore((s) => s.myStoreOpen);
  const { selectedConversationId } = useSelectedConversation();
  const { data: selfConv } = useStoreConversation();

  // Active khi đang mở myStore HOẶC conversation đang chọn chính là SELF conv (sống sót
  // reload — lúc đó myStoreOpen reset về false vì store không persist).
  const isMyStoreActive =
    myStoreOpen || (Boolean(selfConv?.id) && selectedConversationId === selfConv?.id);

  async function openMyStore(): Promise<void> {
    setMyStoreOpen(true);
    if (isMobile) setMobilePanel('chat');
    try {
      // Dùng cache nếu đã có, không thì fetch để lấy SELF conv ID thật
      const cached = qc.getQueryData<{ id: string }>(myStoreKeys.conversation());
      const id =
        cached?.id ??
        (
          await qc.fetchQuery({
            queryKey: myStoreKeys.conversation(),
            queryFn: () => myStoreApi.getConversation(),
          })
        ).id;
      router.replace(`/chat/${id}`, { scroll: false });
    } catch {
      router.replace('/chat', { scroll: false });
    }
  }

  return { openMyStore, isMyStoreActive };
}
