'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { commitmentsApi } from '../services/commitments.api';
import { taskKeys } from '../services/keys';
import type { CommitmentRiskCode, DeliveryStatus } from '../types';

const PAGE_SIZE = 20;

export interface CommitmentFilters {
  deliveryStatus?: DeliveryStatus;
  scopeStatus?: 'IN_SCOPE' | 'UNCLEAR' | 'OUT_OF_SCOPE';
  risk?: CommitmentRiskCode;
  ownerId?: string;
}

export function useCommitmentsInfinite(
  projectId: string,
  filters: CommitmentFilters,
) {
  return useInfiniteQuery({
    queryKey: [
      ...taskKeys.commitments(projectId),
      'infinite',
      filters,
    ] as const,
    queryFn: ({ pageParam }) =>
      commitmentsApi.listPaged(projectId, {
        page: pageParam,
        limit: PAGE_SIZE,
        ...filters,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
}

export function useCommitmentDetail(commitmentId: string) {
  return useQuery({
    queryKey: taskKeys.commitmentDetail(commitmentId),
    queryFn: () => commitmentsApi.getDetail(commitmentId),
    enabled: !!commitmentId,
  });
}

export function useCreateCommitment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.create>[1]) =>
      commitmentsApi.create(projectId, input, crypto.randomUUID()),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitments(projectId),
      });
      toast.success('Đã tạo cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể tạo cam kết',
      ),
  });
}
