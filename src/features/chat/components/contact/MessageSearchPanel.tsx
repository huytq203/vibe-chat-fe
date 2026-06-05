'use client';

import { useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';
import type { Conversation } from '@/features/chat/types';
import { MessageSearchResults } from './MessageSearchResults';

type MessageSearchPanelProps = {
  conversation: Conversation;
  onBack: () => void;
  onClose: () => void;
};

export function MessageSearchPanel({ conversation, onBack, onClose }: MessageSearchPanelProps) {
  const [key, setKey] = useState('');
  const isMobile = useIsMobile();
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const requestJump = useMessageJumpStore((s) => s.requestJump);

  function handleJump(messageId: string, createdAt: string) {
    requestJump({ id: messageId, createdAt });
    if (isMobile) setMobilePanel('chat');
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Tìm tin nhắn</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="shrink-0 px-3 py-2.5">
        <Input
          variant="filled"
          icon={<Search className="h-[15px] w-[15px]" />}
          placeholder="Tìm trong tin nhắn văn bản…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          className="h-9 text-[13px]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <MessageSearchResults conversation={conversation} query={key} onJump={handleJump} />
      </div>
    </aside>
  );
}
