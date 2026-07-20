"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { WebAppContainer } from "@/features/chat/components/webapp/WebAppContainer";
import { useWebAppLaunch } from "@/features/chat/hooks/useWebAppLaunch";
import type { ConversationType } from "@/features/chat/types";

type WebAppDeepLinkPageProps = {
  params: Promise<{ botUsername: string; appShortName: string }>;
};

const CHAT_TYPES = new Set(["SELF", "DIRECT", "GROUP", "CHANNEL"]);

function parseChatType(value: string | null): ConversationType | null {
  if (!value || !CHAT_TYPES.has(value)) return null;
  return value as ConversationType;
}

export default function WebAppDeepLinkPage({
  params,
}: WebAppDeepLinkPageProps) {
  const search = useSearchParams();
  const launchedRef = useRef(false);
  const chatUuid = search.get("chatUuid");
  const chatType = parseChatType(search.get("chatType"));
  const webapp = useWebAppLaunch({
    conversationId: chatUuid,
    conversationType: chatType,
  });

  useEffect(() => {
    if (launchedRef.current || !chatUuid || !chatType) return;
    launchedRef.current = true;
    void params.then(({ botUsername, appShortName }) => {
      void webapp.launch({ botUsername, appShortName });
    });
  }, [chatType, chatUuid, params, webapp]);

  const missingChat = !chatUuid || !chatType;

  return (
    <main className="flex h-full min-h-[420px] flex-1 items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-base font-semibold text-foreground">WebApp</h1>
        <p className="text-sm text-muted-foreground">
          {missingChat
            ? "Liên kết WebApp cần chatUuid và chatType để mở trong đúng cuộc trò chuyện."
            : webapp.session
              ? "WebApp đang mở."
              : "Đang mở WebApp..."}
        </p>
      </div>
      <WebAppContainer
        session={webapp.session}
        onSendData={webapp.sendData}
        onClose={webapp.close}
        onInvokeCustomMethod={webapp.invokeCustomMethod}
      />
    </main>
  );
}
