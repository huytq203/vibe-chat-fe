"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import type { Conversation } from "@/features/chat/types";
import { ConversationItem } from "./ConversationItem";

type StrangerOverlayProps = {
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  onBack: () => void;
  onSelectConversation: (id: string) => void;
  onAvatarError?: () => void;
};

/** Overlay thay danh sách chính: liệt kê hội thoại với người chưa kết bạn. */
export function StrangerOverlay({
  conversations,
  meId,
  selectedConversationId,
  onBack,
  onSelectConversation,
  onAvatarError,
}: StrangerOverlayProps) {
  return (
    <div className="flex flex-1 flex-col ">
      <div className="flex shrink-0 items-center gap-1 px-2 py-2.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Quay lại" className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Tin nhắn của người lạ</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">
            Không còn tin nhắn của người lạ
          </p>
        ) : (
          conversations.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              selected={selectedConversationId === c.id}
              meId={meId}
              onSelect={onSelectConversation}
              onAvatarError={onAvatarError}
            />
          ))
        )}
      </div>
    </div>
  );
}
