'use client';

import { useState } from 'react';
import { Bell, MessageSquare, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { cn } from '@/lib/utils/cn';
import {
  FindFriendsPanel,
  useIncomingFriendRequests,
  type UserSearchItem,
} from '@/features/friends';
import { NotificationPanel } from '@/features/notifications';
import { useAuthStore } from '@/features/auth';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { UserMenu } from '@/features/chat/components/common/UserMenu';

type TabId = 'chat' | 'friends' | 'notifications' | 'me';

type TabButtonProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
};

function TabButton({ icon, label, active, badge, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <span className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-danger-foreground">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

/**
 * Bottom tab bar cho mobile (< 768px). Ẩn khi bàn phím ảo đang mở.
 * 4 tab: Chat · Bạn bè · Thông báo · Tôi.
 */
export function MobileTabBar() {
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const { setSelected } = useSelectedConversation();
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  const incomingRequests = useIncomingFriendRequests();
  const incomingCount = incomingRequests.data?.items.length ?? 0;

  const qc = useQueryClient();
  const openDirectMut = useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
      setMobilePanel('chat');
      setFriendsOpen(false);
      setActiveTab('chat');
    },
  });

  function handleMessageUser(user: UserSearchItem) {
    openDirectMut.mutate(user.id);
  }

  function handleOpenConversation(id: string) {
    setSelected(id);
    setMobilePanel('chat');
    setFriendsOpen(false);
    setActiveTab('chat');
  }

  return (
    <>
      <nav className="flex shrink-0 items-stretch border-t border-border bg-sidebar pb-safe">
        <TabButton
          icon={<MessageSquare className="h-[22px] w-[22px]" />}
          label="Chat"
          active={activeTab === 'chat' && (mobilePanel === 'list' || mobilePanel === 'chat')}
          onClick={() => {
            setActiveTab('chat');
            // Bấm tab Chat khi đang ở chat → về list; nếu đã ở list thì giữ.
            if (mobilePanel === 'contact') setMobilePanel('chat');
          }}
        />
        <TabButton
          icon={<Users className="h-[22px] w-[22px]" />}
          label="Bạn bè"
          active={activeTab === 'friends'}
          badge={incomingCount}
          onClick={() => {
            setActiveTab('friends');
            setFriendsOpen(true);
          }}
        />
        <TabButton
          icon={<Bell className="h-[22px] w-[22px]" />}
          label="Thông báo"
          active={activeTab === 'notifications'}
          onClick={() => {
            setActiveTab('notifications');
            setNotiOpen(true);
          }}
        />
        {/* UserMenu tự render trigger của nó; wrap để fit vào tab */}
        <div className="relative flex flex-1 flex-col items-center gap-0.5 py-1 text-muted-foreground">
          <UserMenu />
          <span className="text-[10px] font-medium">Tôi</span>
        </div>
      </nav>

      <FindFriendsPanel
        open={friendsOpen}
        onOpenChange={(open) => {
          setFriendsOpen(open);
          if (!open) setActiveTab('chat');
        }}
        meId={meId}
        onMessageUser={handleMessageUser}
        onOpenConversation={handleOpenConversation}
      />
      <NotificationPanel
        open={notiOpen}
        onOpenChange={(open) => {
          setNotiOpen(open);
          if (!open) setActiveTab('chat');
        }}
      />
    </>
  );
}
