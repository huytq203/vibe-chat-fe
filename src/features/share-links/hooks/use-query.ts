'use client';

import { useQuery } from '@tanstack/react-query';
import { shareLinksApi } from '@/services/share-links.api';
import { shareLinkKeys } from '@/services/keys';

/** Danh sách share link của tôi (chỉ fetch khi cần — vd khi mở dialog). */
export function useMyShareLinks(enabled = true) {
  return useQuery({
    queryKey: shareLinkKeys.my(),
    queryFn: () => shareLinksApi.listMine(),
    enabled,
    staleTime: 30_000,
  });
}

/** Xem trước 1 link theo code (không tiêu hao lượt dùng). */
export function useResolveShareLink(code: string) {
  return useQuery({
    queryKey: shareLinkKeys.resolve(code),
    queryFn: () => shareLinksApi.resolve(code),
    enabled: Boolean(code),
    retry: 1,
  });
}
