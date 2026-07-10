'use client';

import { useEffect, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useAuthStore } from '@/features/auth';
import {
  useElectronBadge,
  useFaviconBadge,
  useFcmSetup,
  useNotificationRealtime,
} from '@/features/notifications';
import { useFriendRealtime } from '@/features/friends';
import { CallContainer, useCallRealtime } from '@/features/call';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { getDefaultBackgroundImage } from '@/lib/theme/themes';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSectionNav } from '@/features/chat/hooks/useSectionNav';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useConversations } from '@/features/chat/hooks/use-query';
import { useChatRealtime } from '@/features/chat/hooks/useChatRealtime';
import { useWallpaper } from '@/features/chat/hooks/useWallpaper';
import { ConversationList } from '@/features/chat/components/conversations/ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactInfo } from '@/features/chat/components/contact/ContactInfo';
import { InviteProfileModal } from '@/features/share-links/components/InviteProfileModal';
import { MyStoreLayout } from '@/features/my-store';
import { NavSidebar } from './NavSidebar';
import { AiChatPanel } from './AiChatPanel';
import { AiChatPage } from './AiChatPage';
import { TaskManagementLayout } from '@/features/tasks';

export function ChatLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const rightPanelOpen = useChatUIStore((s) => s.rightPanelOpen);
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const { activeSection, goToSection } = useSectionNav();
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const isMobile = useIsMobile();
  const { data: conversations } = useConversations();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Wallpaper của hội thoại đang chọn — áp cho toàn bộ khung layout (không chỉ cột chat),
  // để nền hiển thị xuyên qua các khe hở giữa các card nổi, giống bố cục design gốc.
  const wallpaperStyle = useWallpaper(selectedConversationId);
  // Chưa chọn wallpaper riêng cho hội thoại → dùng ảnh nền mặc định theo độ sáng/tối
  // của theme đang chọn (background-1 = sáng, background-2 = tối/indigo), thay vì
  // màu --background phẳng.
  const { currentTheme } = useTheme();
  const backgroundStyle: CSSProperties =
    Object.keys(wallpaperStyle).length > 0
      ? wallpaperStyle
      : {
          // Lớp phủ tối nhẹ (35%) đè lên ảnh nền mặc định để giảm loá mắt,
          // không áp cho wallpaper người dùng tự chọn (đã qua bước xem trước riêng).
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${getDefaultBackgroundImage(currentTheme)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };

  useChatRealtime();
  useNotificationRealtime();
  useFriendRealtime();
  useCallRealtime();
  useFcmSetup();
  useFaviconBadge();
  useElectronBadge();

  useEffect(() => {
    // Chỉ auto-chọn hội thoại khi ở khu vực chat — tránh replace về /chat khi ở /ai, /work, /store.
    if (activeSection === 'ai-full' || activeSection === 'tasks' || activeSection === 'store') return;
    if (selectedConversationId) return;
    if (searchParams.get('invite')) return;
    const first = conversations?.[0];
    if (first) setSelected(first.id);
  }, [activeSection, conversations, selectedConversationId, setSelected, searchParams]);

  // SW post message khi user click OS notification → điều hướng trong tab.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; link?: string } | null;
      if (data?.type === 'NOTIFICATION_CLICK' && data.link) {
        try {
          const url = new URL(data.link, window.location.origin);
          // Backend cũ có thể gửi /chat?c=<id> → chuẩn hoá về /chat/<id>.
          const legacyId = url.pathname === '/chat' && url.searchParams.get('c');
          if (legacyId) router.push(`/chat/${legacyId}`);
          else router.push(`${url.pathname}${url.search}`);
        } catch {
          router.push(data.link);
        }
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  if (!hydrated || !isAuthed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="md" variant="primary" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        style={backgroundStyle}
        className="flex h-full w-full flex-col gap-3 overflow-hidden p-3"
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobilePanel === 'list' && <ConversationList />}
          {mobilePanel === 'chat' && <ChatPanel />}
          {mobilePanel === 'contact' && selectedConversationId && <ContactInfo />}
        </div>
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }

  if (activeSection === 'ai-full') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <AiChatPage />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }

  if (activeSection === 'tasks') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <TaskManagementLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }

  if (activeSection === 'store') {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden p-3">
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />
        <MyStoreLayout />
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }

  // Xác định panel trái hiển thị dựa theo activeSection
  const leftPanel =
    activeSection === 'ai' ? (
      <AiChatPanel />
    ) : (
      <ConversationList />
    );

  return (
    <div style={backgroundStyle} className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Desktop nav sidebar */}
        <NavSidebar activeSection={activeSection} onSectionChange={goToSection} />

        {/* Left panel: ConversationList hoặc AiChatPanel */}
        {leftPanel}

        <ChatPanel />
        {rightPanelOpen && selectedConversationId && <ContactInfo />}
      </div>

      <CallContainer />
      <InviteProfileModal />
    </div>
  );
}
