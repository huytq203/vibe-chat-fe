"use client";

import type { ReactElement } from "react";
import type { Conversation } from "@/features/chat/types";
import { GroupMembersPanel } from "./GroupMembersPanel";
import { GroupSettingsPanel } from "./GroupSettingsPanel";
import { BannedMembersPanel } from "./BannedMembersPanel";
import { AdminsPanel } from "./AdminsPanel";
import { JoinRequestsPanel } from "./JoinRequestsPanel";
import { MessageSearchPanel } from "./MessageSearchPanel";
import { PinnedMessagesPanel } from "./PinnedMessagesPanel";

export type ContactView =
  | "info"
  | "members"
  | "requests"
  | "settings"
  | "banned"
  | "admins"
  | "search"
  | "pinned";

type ContactSubPanelArgs = {
  view: ContactView;
  conversation: Conversation;
  meId: string | null;
  isDirect: boolean;
  onView: (view: ContactView) => void;
  onClose: () => void;
};

/**
 * Trả panel con điều hướng (settings/members/…) tương ứng với `view`, hoặc `null`
 * khi đang ở "info" → ContactInfo tự render nội dung chính. Guard giữ NGUYÊN như cũ.
 */
export function renderContactSubPanel({
  view,
  conversation,
  meId,
  isDirect,
  onView,
  onClose,
}: ContactSubPanelArgs): ReactElement | null {
  if (!isDirect && view === "settings") {
    return (
      <GroupSettingsPanel
        conversation={conversation}
        meId={meId}
        onBack={() => onView("info")}
        onClose={onClose}
        onManageBanned={() => onView("banned")}
        onManageAdmins={() => onView("admins")}
      />
    );
  }

  if (!isDirect && view === "banned") {
    return (
      <BannedMembersPanel
        conversationId={conversation.id}
        onBack={() => onView("settings")}
        onClose={onClose}
      />
    );
  }

  if (!isDirect && view === "admins") {
    return (
      <AdminsPanel
        conversation={conversation}
        meId={meId}
        onBack={() => onView("settings")}
        onClose={onClose}
      />
    );
  }

  if (!isDirect && view === "members") {
    return (
      <GroupMembersPanel
        conversation={conversation}
        meId={meId}
        onBack={() => onView("info")}
        onClose={onClose}
        onShowRequests={() => onView("requests")}
      />
    );
  }

  if (!isDirect && view === "requests") {
    return <JoinRequestsPanel conversation={conversation} onBack={() => onView("members")} onClose={onClose} />;
  }

  if (view === "search") {
    return <MessageSearchPanel conversation={conversation} onBack={() => onView("info")} onClose={onClose} />;
  }

  if (view === "pinned") {
    return <PinnedMessagesPanel conversation={conversation} meId={meId} onBack={() => onView("info")} onClose={onClose} />;
  }

  return null;
}
