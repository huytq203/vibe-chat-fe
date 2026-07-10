'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { useAuthStore } from '@/features/auth';
import { type UserSearchItem } from '@/features/friends';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { useConversations, useLockedConversations } from '@/features/chat/hooks/use-query';
import { useStoreConversation } from '@/features/my-store';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { getConversationName } from '@/features/chat/utils';
import { useStrangerConversations } from '@/features/chat/hooks/useStrangerConversations';
import { ConversationDock } from './ConversationDock';
import { ConversationItem } from './ConversationItem';
import { SearchOverlay } from './SearchOverlay';
import { StrangerInboxItem } from './StrangerInboxItem';
import { StrangerOverlay } from './StrangerOverlay';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'group', label: 'Nhóm' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ConversationList() {
  const me = useAuthStore((s) => s.user);
  const activeTab = useChatUIStore((s) => s.activeTab);
  const setActiveTab = useChatUIStore((s) => s.setActiveTab);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const isMobile = useIsMobile();
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const strangerOpen = useChatUIStore((s) => s.strangerOpen);
  const setStrangerOpen = useChatUIStore((s) => s.setStrangerOpen);
  const { data: selfConv } = useStoreConversation();
  const [lockedExpanded, setLockedExpanded] = useState(false);

  const { isStranger, strangerConversations, strangerUnreadCount } = useStrangerConversations(
    conversations,
    me?.id ?? null,
  );

  const qc = useQueryClient();
  const openDirectMut = useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
    },
    onError: (e: Error) => toast.error(e.message || 'Không mở được cuộc trò chuyện'),
  });

  const handleMessageUser = useCallback(
    (user: UserSearchItem) => {
      openDirectMut.mutate(user.id);
      if (isMobile) setMobilePanel('chat');
    },
    [openDirectMut, isMobile, setMobilePanel],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelected(id);
      if (isMobile) setMobilePanel('chat');
    },
    [setSelected, isMobile, setMobilePanel],
  );

  // Avatar lỗi = presigned URL hết hạn. Refetch list để BE ký lại URL mới (URL mới →
  // base Avatar reset cờ lỗi và tải lại). Cooldown 60s tránh refetch dồn khi nhiều ảnh lỗi.
  const lastAvatarRefetchRef = useRef(0);
  const handleAvatarError = useCallback(() => {
    const now = Date.now();
    if (now - lastAvatarRefetchRef.current < 60_000) return;
    lastAvatarRefetchRef.current = now;
    void qc.refetchQueries({ queryKey: chatKeys.conversationLists() });
  }, [qc]);

  // Bỏ qua conv đang khoá: chúng bị ẩn khỏi danh sách nên không được tính vào
  // badge tab "Chưa đọc" (nếu không badge đỏ sẽ kẹt vĩnh viễn, không cách nào xoá).
  const unreadTotal = useMemo(
    () => conversations.reduce(
      (sum, c) => sum + (!c.isLocked && c.unreadCount > 0 && c.id !== selectedConversationId ? 1 : 0),
      0,
    ),
    [conversations, selectedConversationId],
  );


  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = conversations.filter((conversation) => {
      if (conversation.isLocked) return false;
      if (isStranger(conversation)) return false;
      // SELF conv mở qua icon "Kho của tôi" ở NavSidebar — không render trong list chính.
      if (selfConv?.id && conversation.id === selfConv.id) return false;
      if (activeTab === 'unread' && conversation.unreadCount === 0) return false;
      if (activeTab === 'group' && conversation.type === 'DIRECT') return false;
      if (!query) return true;
      const name = getConversationName(conversation, me?.id ?? null).toLowerCase();
      const preview = (conversation.lastMessage?.preview ?? '').toLowerCase();
      return name.includes(query) || preview.includes(query);
    });

    const toTimestamp = (dateString: string | null) =>
      dateString ? new Date(dateString).getTime() : 0;
    return matched.slice().sort((first, second) => {
      if (Boolean(first.isPinned) !== Boolean(second.isPinned)) return first.isPinned ? -1 : 1;
      return toTimestamp(second.lastMessageAt) - toTimestamp(first.lastMessageAt);
    });
  }, [conversations, activeTab, search, me?.id, isStranger, selfConv]);

  type ListItem =
    | { kind: 'stranger' }
    | { kind: 'conversation'; conv: (typeof conversations)[number] };

  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    if (!isLoading && !search && strangerConversations.length > 0) items.push({ kind: 'stranger' });
    for (const conv of filtered) items.push({ kind: 'conversation', conv });
    return items;
  }, [search, isLoading, strangerConversations.length, filtered]);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col rounded-2xl bg-sidebar/75 backdrop-blur-md  text-sidebar-foreground shadow-subtle md:w-[300px] md:min-w-[260px] border">
      <header className="hidden shrink-0 items-center justify-between px-4 pb-3 pt-[18px] md:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] border border-primary/30 bg-primary/15">
            <Image
              src="/icon-192.png"
              alt="HaloChat"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <span className="text-lg font-bold tracking-tight">HaloChat</span>
        </div>
        
      </header>

      <div className="flex flex-1 flex-col overflow-hidden pt-5 md:pt-0">
        {searchFocused ? (
          <SearchOverlay
            query={search}
            onQueryChange={setSearch}
            onBack={() => { setSearchFocused(false); setSearch(''); }}
            conversations={conversations}
            meId={me?.id ?? null}
            selectedConversationId={selectedConversationId}
            onSelectConversation={(id) => { setSearchFocused(false); setSearch(''); handleSelectConversation(id); }}
            onMessageFriend={(user) => { handleMessageUser(user); setSearchFocused(false); setSearch(''); }}
          />
        ) : strangerOpen ? (
          <StrangerOverlay
            conversations={strangerConversations}
            meId={me?.id ?? null}
            selectedConversationId={selectedConversationId}
            onBack={() => setStrangerOpen(false)}
            onSelectConversation={handleSelectConversation}
            onAvatarError={handleAvatarError}
          />
        ) : (
          <>
            <div className="shrink-0 px-3 pb-2.5">
              <Input
                variant="primary"
                icon={<Search className="h-[15px] w-[15px]" />}
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="h-9 border-0 text-[13px] md:border"
              />
            </div>

            <div className="shrink-0 border-b border-border px-3 pb-2.5 md:border-b-0 md:pb-2">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab((v as TabId) ?? 'all')}
              >
                <TabsList size="xs" className="w-full">
                  {TABS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex-1 gap-1">
                      {tab.label}
                      {tab.id === 'unread' && unreadTotal > 0 && (
                        <Badge variant="default" size="sm">{unreadTotal}</Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {isLoading && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">Đang tải...</div>
              )}
              {!isLoading && filtered.length === 0 && listItems.every((i) => i.kind !== 'conversation') && (Boolean(search) || strangerConversations.length === 0) && (
                <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện'}
                </div>
              )}
              {listItems.map((item) => {
                if (item.kind === 'stranger') {
                  return (
                    <StrangerInboxItem
                      key="stranger"
                      unreadCount={strangerUnreadCount}
                      onClick={() => setStrangerOpen(true)}
                    />
                  );
                }
                return (
                  <ConversationItem
                    key={item.conv.id}
                    conversation={item.conv}
                    selected={selectedConversationId === item.conv.id}
                    meId={me?.id ?? null}
                    onSelect={handleSelectConversation}
                    onAvatarError={handleAvatarError}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0">
        <ConversationDock />
      </div>
    </aside>
  );
}
