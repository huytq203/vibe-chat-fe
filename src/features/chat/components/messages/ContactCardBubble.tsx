"use client";

import { useEffect, useState } from "react";
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
    <div className="w-[270px] overflow-hidden rounded-xl">
      <div
        style={{
          backgroundImage:
            "url('/asset/banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay tối để chữ/avatar luôn đọc được dù ảnh nền sáng */}
        <div className="flex bg-black/45">
          {/* Avatar + info */}
          <button
            type="button"
            onClick={onCardClick}
            disabled={!onCardClick}
            className="flex w-full items-center px-4 pb-3 pt-3 text-left disabled:cursor-default"
          >
            <div className="pr-2">
              <Avatar
                name={contact.displayName}
                src={contact.avatarUrl}
                size="md"
              />
            </div>
            <span className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-white drop-shadow">
                {contact.displayName}
              </p>
              {contact.username && (
                <p className="truncate text-[11.5px] text-white/75">
                  @{contact.username}
                </p>
              )}
            </span>
          </button>

          {/* QR code */}

          <div className="bg-card px-3 py-3 flex justify-center">
            <QRCode
              value={buildContactLink(contact.contactUserId)}
              level="H"
              size={"sm"}
              imageSettings={{
                src: "/icon-512.png",
                width: 20,
                height: 20,
                excavate: true,
              }}
            />
          </div>
        </div>
        {/* Nhắn tin button */}
        <div className="border-t border-border bg-card px-3 py-2.5 bg-black/45">
          <Button
            size="md"
            className="w-full bg-primary/80 hover:bg-primary"
            onClick={() => onMessage(contact.contactUserId)}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Nhắn tin
          </Button>
        </div>
      </div>
    </div>
  );
}
