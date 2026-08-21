'use client';

import { useState } from 'react';
import { Bell, MessageSquare, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { cn } from '@/lib/utils/cn';
import {
  FindFriendsPanel,
  useIncomingFriendRequests,
  type UserSearchItem,
} from '@/features/friends';
import { NotificationPanel, useSystemNotifCount } from '@/features/notifications';
import { useAuthStore } from '@/features/auth';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { UserMenu } from '@/features/chat/components/common/UserMenu';

type TabId = 'chat' | 'friends' | 'notifications' | 'me';

interface ConversationDockProps {
  variant?: 'embedded' | 'card';
}

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
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <span className="relative flex h-6 items-center justify-center">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-danger-foreground">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

/** Dock embedded trên mobile, và là card sibling riêng trong rail desktop. */
export function ConversationDock({ variant = 'embedded' }: ConversationDockProps) {
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const { setSelected } = useSelectedConversation();
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  const incomingRequests = useIncomingFriendRequests();
  const incomingCount = incomingRequests.data?.items.length ?? 0;
  const unreadNotiCount = useSystemNotifCount().data?.unreadCount ?? 0;

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
    onError: (e: Error) => toast.error(e.message || 'Không mở được cuộc trò chuyện'),
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
      <div
        className={cn(
          'shrink-0',
          variant === 'card'
            ? 'rounded-2xl border bg-sidebar/75 p-2 shadow-subtle backdrop-blur-md'
            : 'mobile-conversation-dock px-2 pt-2',
        )}
      >
        <nav
          aria-label="Điều hướng trò chuyện"
          className={cn(
            'flex items-center justify-center p-1',
            variant === 'card'
              ? 'rounded-xl'
              : 'rounded-2xl bg-sidebar/95 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]',
          )}
        >
          <TabButton
            icon={<MessageSquare className="h-5 w-5" />}
            label="Chat"
            active={
              activeTab === 'chat' && (mobilePanel === 'list' || mobilePanel === 'chat')
            }
            onClick={() => {
              setActiveTab('chat');
              // Bấm tab Chat khi đang ở chat → về list; nếu đã ở list thì giữ.
              if (mobilePanel === 'contact') setMobilePanel('chat');
            }}
          />
          <TabButton
            icon={<Users className="h-5 w-5" />}
            label="Bạn bè"
            active={activeTab === 'friends'}
            badge={incomingCount}
            onClick={() => {
              setActiveTab('friends');
              setFriendsOpen(true);
            }}
          />
          <TabButton
            icon={<Bell className="h-5 w-5" />}
            label="Thông báo"
            active={activeTab === 'notifications'}
            badge={unreadNotiCount}
            onClick={() => {
              setActiveTab('notifications');
              setNotiOpen(true);
            }}
          />
          <div className="min-w-0 flex-1">
            <UserMenu variant="dock" />
          </div>
        </nav>
      </div>

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
