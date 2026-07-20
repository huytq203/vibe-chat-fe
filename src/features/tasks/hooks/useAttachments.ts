import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../services/tasks.api";
import type { Attachment } from "../types";

const attachmentKey = (projectId: string, taskId: string | null) =>
  ["tasks", projectId, taskId, "attachments"] as const;

export function useAttachments(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: attachmentKey(projectId, taskId),
    queryFn: () => tasksApi.listAttachments(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useUploadAttachment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, attachmentId } = await tasksApi.presignAttachment(
        projectId,
        taskId,
        { fileName: file.name, mimeType: file.type, fileSize: file.size },
      );
      // Upload trực tiếp lên S3 — không gửi auth header
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!s3Res.ok) throw new Error("Upload S3 thất bại");
      return tasksApi.confirmAttachment(projectId, taskId, attachmentId);
    },
    onSuccess: (attachment) => {
      // Write-through để ảnh paste xuất hiện ngay trong "Tệp đính kèm";
      // socket event/refetch sau đó chỉ làm nhiệm vụ reconcile.
      qc.setQueryData<Attachment[]>(
        attachmentKey(projectId, taskId),
        (current = []) => [
          ...current.filter((item) => item.id !== attachment.id),
          attachment,
        ],
      );
      void qc.invalidateQueries({ queryKey: attachmentKey(projectId, taskId) });
    },
  });
}

export function useDeleteAttachment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      tasksApi.deleteAttachment(projectId, taskId, attachmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: attachmentKey(projectId, taskId) }),
  });
}
