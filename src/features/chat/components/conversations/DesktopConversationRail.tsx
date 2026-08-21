'use client';

import { ConversationDock } from './ConversationDock';
import { ConversationList } from './ConversationList';

/** Giữ list và dock desktop ở hai surface độc lập, cùng một rail. */
export function DesktopConversationRail() {
  return (
    <div
      data-testid="desktop-conversation-rail"
      className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col gap-3"
    >
      <div className="min-h-0 flex-1">
        <ConversationList showDock={false} />
      </div>
      <ConversationDock variant="card" />
    </div>
  );
}
