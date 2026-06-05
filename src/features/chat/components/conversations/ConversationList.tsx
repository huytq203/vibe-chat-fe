'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { MessageSquare, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { useAuthStore } from '@/features/auth';
import {
  FindFriendsPanel,
  useIncomingFriendRequests,
  type UserSearchItem,
} from '@/features/friends';
import { NotificationPanel, useUnreadCount } from '@/features/notifications';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { useConversations, useLockedConversations } from '@/features/chat/hooks/use-query';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { getConversationName } from '@/features/chat/utils';
import { ConversationItem } from './ConversationItem';
import { SearchOverlay } from './SearchOverlay';
import { UserMenu } from '@/features/chat/components/common/UserMenu';

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
  const incomingRequests = useIncomingFriendRequests();
  const incomingCount = incomingRequests.data?.items.length ?? 0;
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [lockedExpanded, setLockedExpanded] = useState(false);
  const { data: lockedConversations = [] } = useLockedConversations();

  const qc = useQueryClient();
  const openDirectMut = useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
      setFindOpen(false);
    },
  });

  const handleMessageUser = (user: UserSearchItem) => {
    openDirectMut.mutate(user.id);
    if (isMobile) setMobilePanel('chat');
  };

  function handleSelectConversation(id: string) {
    setSelected(id);
    if (isMobile) setMobilePanel('chat');
  }

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0),
    [conversations],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = conversations.filter((conversation) => {
      if (conversation.isLocked) return false;
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
  }, [conversations, activeTab, search, me?.id]);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
            <MessageSquare className="h-[18px] w-[18px] text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">VibeChat</span>
        </div>
        
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {searchFocused ? (
          <SearchOverlay
            query={search}
            onQueryChange={setSearch}
            onBack={() => { setSearchFocused(false); setSearch(''); }}
            conversations={conversations}
            meId={me?.id ?? null}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelected}
            onMessageFriend={(user) => { handleMessageUser(user); setSearchFocused(false); setSearch(''); }}
          />
        ) : (
          <>
            <div className="shrink-0 px-3 pb-2.5">
              <Input
                variant="filled"
                icon={<Search className="h-[15px] w-[15px]" />}
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="h-9 text-[13px]"
              />
            </div>

            <div className="shrink-0 px-3 pb-2">
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
              {!isLoading && filtered.length === 0 && (
                <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                  {search ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện'}
                </div>
              )}
              {filtered.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  selected={selectedConversationId === c.id}
                  meId={me?.id ?? null}
                  onSelect={handleSelectConversation}
                />
              ))}
         
            </div>
          </>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-around border-t border-border px-2 py-3">
        <Button variant="ghost" size="icon-sm" title="Chat" aria-label="Chat">
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Bạn bè"
          aria-label="Bạn bè"
          onClick={() => setFindOpen(true)}
          className="relative"
        >
          <Users className="h-5 w-5" />
          {incomingCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
              {incomingCount > 9 ? '9+' : incomingCount}
            </span>
          )}
        </Button>

        <UserMenu />
      </footer>

      <FindFriendsPanel
        open={findOpen}
        onOpenChange={setFindOpen}
        onMessageUser={handleMessageUser}
      />

      <NotificationPanel open={notiOpen} onOpenChange={setNotiOpen} />
    </aside>
  );
}
