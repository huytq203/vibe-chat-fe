"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiAuth } from "@/lib/api/client";
import { getSocket } from "@/lib/ws/socket";
import type { ConversationType } from "@/features/chat/types";

type WebAppOpenPayload = {
  url: string;
  initData: string;
  title?: string;
};

type WebAppAck =
  { ok: true; url?: string } | { ok: false; message?: string; error?: string };

export type WebAppSession = {
  url: string;
  initData: string;
  botUsername: string;
  title?: string;
};

export type WebAppCustomMethodRequest = {
  reqId: string;
  method: string;
  params: Record<string, unknown>;
};

const WEBAPP_TIMEOUT_MS = 8_000;
const WEBAPP_DATA_MAX_BYTES = 4096;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function useWebAppLaunch(input: {
  conversationId: string | null;
  conversationType: ConversationType | null;
}) {
  const [session, setSession] = useState<WebAppSession | null>(null);
  const [pendingBotUsername, setPendingBotUsername] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;
    const handler = (payload: WebAppOpenPayload) => {
      const botUsername = pendingBotUsername;
      if (!botUsername) return;
      setSession({
        url: payload.url,
        initData: payload.initData,
        botUsername,
        ...(payload.title?.trim() ? { title: payload.title.trim() } : {}),
      });
    };
    socket.on("webapp:open", handler);
    return () => {
      socket.off("webapp:open", handler);
    };
  }, [pendingBotUsername]);

  const launch = useCallback(
    async (payload: {
      botUsername: string;
      appShortName?: string;
      buttonPayload?: string;
    }) => {
      if (!input.conversationId || !input.conversationType) return;
      const socket = getSocket(apiAuth.getToken());
      if (!socket?.connected) {
        toast.error("Chưa có kết nối realtime");
        return;
      }
      const botUsername = payload.botUsername.replace(/^@/, "").trim();
      setPendingBotUsername(botUsername);
      try {
        const ack = (await socket
          .timeout(WEBAPP_TIMEOUT_MS)
          .emitWithAck("webapp:launch", {
            botUsername,
            appShortName: payload.appShortName,
            chatUuid: input.conversationId,
            chatType: input.conversationType,
            buttonPayload: payload.buttonPayload,
          })) as WebAppAck;
        if (!ack || ack.ok !== true) {
          throw new Error(ack?.message ?? ack?.error ?? "Không mở được WebApp");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Không mở được WebApp",
        );
        setPendingBotUsername(null);
      }
    },
    [input.conversationId, input.conversationType],
  );

  const sendData = useCallback(
    (data: string) => {
      if (!session || !input.conversationId) return;
      if (byteLength(data) > WEBAPP_DATA_MAX_BYTES) {
        toast.error("Dữ liệu WebApp vượt quá 4096 bytes");
        return;
      }
      const socket = getSocket(apiAuth.getToken());
      socket?.emit("webapp:data", {
        botUsername: session.botUsername,
        chatUuid: input.conversationId,
        data,
      });
    },
    [input.conversationId, session],
  );

  const close = useCallback(() => {
    setSession(null);
    setPendingBotUsername(null);
  }, []);

  const invokeCustomMethod = useCallback(
    async (request: WebAppCustomMethodRequest): Promise<unknown> => {
      if (!session) throw new Error("WebApp chưa sẵn sàng");
      const socket = getSocket(apiAuth.getToken());
      if (!socket?.connected) throw new Error("Chưa có kết nối realtime");
      const ack = (await socket
        .timeout(WEBAPP_TIMEOUT_MS)
        .emitWithAck("webapp:custom-method", {
          reqId: request.reqId,
          botUsername: session.botUsername,
          method: request.method,
          params: request.params,
        })) as
        | { ok: true; result: unknown }
        | { ok: false; message?: string; error?: string };
      if (!ack || ack.ok !== true) {
        throw new Error(ack?.message ?? ack?.error ?? "WebApp method thất bại");
      }
      return ack.result;
    },
    [session],
  );

  return { session, launch, sendData, close, invokeCustomMethod };
}
