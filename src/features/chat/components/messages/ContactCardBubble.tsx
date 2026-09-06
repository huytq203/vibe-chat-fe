"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Avatar } from "@/features/chat/components/common/Avatar";
import type { ContactCardMetadata } from "@/features/chat/types";
import { QRCode } from "@/components/ui/qrcode";

type ContactCardBubbleProps = {
  contact: ContactCardMetadata;
  onMessage: (contactUserId: string) => void;
  onCardClick?: () => void;
};

function buildContactLink(contactUserId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/chat?contact=${encodeURIComponent(contactUserId)}`;
}

export function ContactCardBubble({
  contact,
  onMessage,
  onCardClick,
}: ContactCardBubbleProps) {
  return (
    <div data-contact-card className="w-full overflow-hidden rounded-xl">
      <div
        style={{
          backgroundImage: "url('/asset/banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay tối để chữ/avatar luôn đọc được dù ảnh nền sáng */}
        <div className="flex min-h-[104px] bg-black/45">
          {/* Avatar + info */}
          <button
            type="button"
            onClick={onCardClick}
            disabled={!onCardClick}
            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left disabled:cursor-default"
          >
            <Avatar
              name={contact.displayName}
              src={contact.avatarUrl}
              size="md"
            />
            <span className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-white drop-shadow">
                {contact.displayName}
              </p>
              {contact.username && (
                <p className="mt-0.5 truncate text-xs text-white/80">
                  @{contact.username}
                </p>
              )}
            </span>
          </button>

          {/* QR code */}

          <div className="flex shrink-0 items-center justify-center bg-tranparent p-2">
            <QRCode
              value={buildContactLink(contact.contactUserId)}
              level="H"
              pixelSize={80}
              imageSettings={{
                src: "/icon-512.png",
                width: 22,
                height: 22,
                excavate: true,
              }}
            />
          </div>
        </div>
        {/* Nhắn tin button */}
        <div className="border-t border-white/15 bg-black/45 px-3 py-3">
          <Button
            size="lg"
            className="w-full bg-primary/85 hover:bg-primary"
            onClick={() => onMessage(contact.contactUserId)}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Nhắn tin
          </Button>
        </div>
      </div>
    </div>
  );
}
