import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useAttachments(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'attachments'],
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
        { originalName: file.name, mimeType: file.type, size: file.size },
      );
      // Upload trực tiếp lên S3 — không gửi auth header
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!s3Res.ok) throw new Error('Upload S3 thất bại');
      return tasksApi.confirmAttachment(projectId, taskId, attachmentId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'attachments'] }),
  });
}

export function useDeleteAttachment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      tasksApi.deleteAttachment(projectId, taskId, attachmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'attachments'] }),
  });
}
