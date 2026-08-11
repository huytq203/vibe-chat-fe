import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import type { Conversation } from "@/features/chat/types";
import { ChatHeader } from "../ChatHeader";

vi.mock("@/features/call", () => ({
  CallButtons: () => null,
  buildCallDirectory: () => ({}),
}));

function buildConversation(
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id: "conv-1",
    type: "DIRECT",
    name: null,
    description: null,
    avatarUrl: null,
    ownerId: "me",
    encryptionType: "NONE",
    memberCount: 2,
    messageCount: 5,
    memberIds: ["me", "user-2"],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ChatHeader", () => {
  it("renders full-bleed on mobile and as a floating card on desktop", () => {
    const { container } = renderWithProviders(
      <ChatHeader
        conversation={buildConversation()}
        meId="me"
        presence={null}
        rightOpen={false}
        onToggleRight={() => {}}
      />,
    );
    const header = container.firstElementChild as HTMLElement;
    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass("md:rounded-2xl", "md:border", "md:shadow-subtle");
    expect(header).not.toHaveClass("rounded-2xl", "shadow-subtle");
  });
});
