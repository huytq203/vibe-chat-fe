"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { getTaskSocket } from "../lib/task-socket";
import type { TaskDetail } from "../types";

type LiveField = "title" | "description";

interface FieldPatchEvent {
  taskId: string;
  field: LiveField;
  value: string;
  actorId: string;
}

interface PresenceEvent {
  taskId: string;
  userIds: string[];
}

export function useTaskCollaboration(projectId: string, taskId: string | null) {
  const qc = useQueryClient();
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!taskId) return;
    const socket = getTaskSocket();
    if (!socket) return;

    const onPatch = (event: FieldPatchEvent): void => {
      if (event.taskId !== taskId) return;
      const key = ["tasks", projectId, taskId, "detail"] as const;
      qc.setQueryData<TaskDetail>(key, (current) =>
        current ? { ...current, [event.field]: event.value || null } : current,
      );
    };
    const onPresence = (event: PresenceEvent): void => {
      if (event.taskId === taskId) setPresentUserIds(event.userIds);
    };
    const join = (): void => {
      socket.emit(
        "join-task",
        { taskId },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok)
            logger.warn("Task WS join-task bị từ chối", {
              taskId,
              error: ack?.error,
            });
        },
      );
    };

    socket.on("task:field-patch", onPatch);
    socket.on("task:presence", onPresence);
    socket.on("connect", join);
    join();

    return () => {
      socket.off("connect", join);
      socket.off("task:field-patch", onPatch);
      socket.off("task:presence", onPresence);
      socket.emit("leave-task", { taskId });
      setPresentUserIds([]);
    };
  }, [projectId, qc, taskId]);

  const emitFieldPatch = (field: LiveField, value: string): void => {
    if (!taskId) return;
    getTaskSocket()?.emit("task:field-patch", { taskId, field, value });
  };

  return { presentUserIds, emitFieldPatch };
}
