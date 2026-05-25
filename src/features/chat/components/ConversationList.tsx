'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Plus, Search, Users } from 'lucide-react';
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
import { useConversations } from '../hooks/use-query';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useSelectedConversation } from '../hooks/useSelectedConversation';
import { getConversationName } from '../utils';
import { ConversationItem } from './ConversationItem';
import { SearchOverlay } from './SearchOverlay';
import { UserMenu } from './UserMenu';

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
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const { data: conversations = [], isLoading } = useConversations();
  const incomingRequests = useIncomingFriendRequests();
  const incomingCount = incomingRequests.data?.items.length ?? 0;
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const notiUnread = useUnreadCount();
  const notiUnreadCount = notiUnread.data?.unreadCount ?? 0;

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
  };

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0),
    [conversations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (activeTab === 'unread' && c.unreadCount === 0) return false;
      if (activeTab === 'group' && c.type === 'DIRECT') return false;
      if (!q) return true;
      const name = getConversationName(c, me?.id ?? null).toLowerCase();
      const preview = (c.lastMessage?.preview ?? '').toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, activeTab, search, me?.id]);

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
            <MessageSquare className="h-[18px] w-[18px] text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">VibeChat</span>
        </div>
        <Button
          variant="solid"
          size="icon-sm"
          title="Thông báo"
          aria-label="Thông báo"
          className="relative"
          onClick={() => setNotiOpen(true)}
        >
          <Bell className="h-[18px] w-[18px]" />
          {notiUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
              {notiUnreadCount > 9 ? '9+' : notiUnreadCount}
            </span>
          )}
        </Button>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
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
              onSelect={setSelected}
            />
          ))}
        </div>

        {searchFocused && (
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
