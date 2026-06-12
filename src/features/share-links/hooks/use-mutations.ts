'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shareLinksApi } from '@/services/share-links.api';
import { shareLinkKeys } from '@/services/keys';
import type { CreateShareLinkInput, ShareLink, UseShareLinkResult } from '@/features/share-links/types';

export function useCreateShareLink() {
  const qc = useQueryClient();
  return useMutation<ShareLink, Error, CreateShareLinkInput>({
    mutationFn: (input) => shareLinksApi.create(input),
    onSuccess: (link) => {
      qc.setQueryData<ShareLink[]>(shareLinkKeys.my(), (prev) => (prev ? [link, ...prev] : [link]));
    },
    onError: (e) => toast.error(e.message || 'Tạo link thất bại'),
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (code) => shareLinksApi.revoke(code),
    onSuccess: (_res, code) => {
      qc.setQueryData<ShareLink[]>(shareLinkKeys.my(), (prev) =>
        prev ? prev.map((l) => (l.code === code ? { ...l, isRevoked: true } : l)) : prev,
      );
      toast.success('Đã thu hồi link');
    },
    onError: (e) => toast.error(e.message || 'Thu hồi link thất bại'),
  });
}

/** Dùng link — caller tự xử lý kết quả (kết bạn / vào nhóm) + lỗi theo mã. */
export function useUseShareLink() {
  return useMutation<UseShareLinkResult, Error, string>({
    mutationFn: (code) => shareLinksApi.use(code),
  });
}
