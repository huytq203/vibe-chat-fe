"use client";

import { useEffect, useState } from "react";
import { MessageSquare, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Avatar } from "@/features/chat/components/common/Avatar";
import { toQrDataUrl } from "@/lib/qr";
import type { ContactCardMetadata } from "@/features/chat/types";

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
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void toQrDataUrl(buildContactLink(contact.contactUserId)).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, [contact.contactUserId]);

  return (
    <div className="w-[270px] overflow-hidden rounded-xl ">
      <div className="flex bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
        {" "}
        {/* Avatar + info */}
        <button
          type="button"
          onClick={onCardClick}
          disabled={!onCardClick}
          className="flex w-full  items-center px-4 pb-3 pt-0 text-center disabled:cursor-default bg-card"
        >
          <div className="pr-2">
            <Avatar
              name={contact.displayName}
              src={contact.avatarUrl}
              seed={contact.contactUserId}
              size="md"
            />
          </div>
          <span className="text-[14px] font-bold leading-tight text-card-foreground">
            {contact.displayName}
            {contact.username && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                @{contact.username}
              </p>
            )}
          </span>
        </button>
        {/* QR code */}
        {qr && (
          <div className="bg-card px-4 p-3">
            <div className="flex justify-center  rounded-lg bg-white p-2.5 shadow-inner flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR là data URL cục bộ */}
              <img
                src={qr}
                alt={`Mã QR danh thiếp ${contact.displayName}`}
                className="w-28 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Nhắn tin button */}
      <div className="border-t border-border bg-card px-3 py-2.5 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
        <Button
          size="sm"
          className="w-full  via-accent/20 to-secondary/20"
          onClick={() => onMessage(contact.contactUserId)}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Nhắn tin
        </Button>
      </div>
    </div>
  );
}
