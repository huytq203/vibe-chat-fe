'use client';

import { useMemo, useState } from 'react';
import { Bell, MessageSquare, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { useAuthStore, useLogout } from '@/features/auth';
import { useConversations } from '../hooks/use-query';
import { useChatUIStore } from '../stores/chat-ui.store';
import { getConversationName } from '../utils';
import { ConversationItem } from './ConversationItem';
import { Avatar } from './Avatar';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'group', label: 'Nhóm' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ConversationList() {
  const me = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { selectedConversationId, activeTab, setSelected, setActiveTab } = useChatUIStore();
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState('');

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
        <Button variant="solid" size="icon-sm" title="Tạo chat mới" aria-label="Tạo chat mới">
          <Plus className="h-[18px] w-[18px]" />
        </Button>
      </header>

      <div className="shrink-0 px-3 pb-2.5">
        <Input
          variant="filled"
          icon={<Search className="h-[15px] w-[15px]" />}
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      <footer className="flex shrink-0 items-center justify-around border-t border-border px-2 py-3">
        <Button variant="ghost" size="icon-sm" title="Chat" aria-label="Chat" className="text-primary bg-primary/10">
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Bạn bè" aria-label="Bạn bè">
          <Users className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Thông báo" aria-label="Thông báo">
          <Bell className="h-5 w-5" />
        </Button>
        <button
          type="button"
          onClick={() => logout.mutate()}
          title={me?.displayName ?? me?.username ?? 'Đăng xuất'}
          aria-label="Tài khoản"
        >
          <Avatar
            name={me?.displayName ?? me?.username}
            seed={me?.id ?? 'me'}
            size="sm"
            status="online"
          />
        </button>
      </footer>
    </aside>
  );
}
