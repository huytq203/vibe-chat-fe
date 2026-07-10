"use client";

import { RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/features/chat/types";
import {
  useDiscardFailedMessage,
  useResendMessage,
} from "@/features/chat/hooks/use-mutations";

type MessageFailedActionsProps = {
  message: Message;
};

/** Hàng "Gửi lại / Bỏ" dưới bong bóng khi tin gửi thất bại (chỉ tin của mình). */
export function MessageFailedActions({ message }: MessageFailedActionsProps) {
  const resendMut = useResendMessage();
  const discardFailed = useDiscardFailedMessage();

  return (
    <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-danger">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-danger/10"
        disabled={resendMut.isPending}
        onClick={() =>
          resendMut.mutate({
            conversationId: message.conversationId,
            tempId: message.id,
          })
        }
        aria-label="Gửi lại"
        title="Gửi lại"
      >
        <RotateCw
          className={cn("h-3 w-3", resendMut.isPending && "animate-spin")}
        />
        Gửi lại
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
        onClick={() => discardFailed(message.conversationId, message.id)}
        aria-label="Bỏ"
        title="Bỏ"
      >
        <X className="h-3 w-3" />
        Bỏ
      </button>
    </div>
  );
}
