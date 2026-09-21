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

export function useUpdateCommitment(
  projectId: string,
  commitmentId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.update>[1]) =>
      commitmentsApi.update(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      void qc.invalidateQueries({
        queryKey: taskKeys.commitments(projectId),
      });
      toast.success('Đã cập nhật cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể cập nhật cam kết',
      ),
  });
}

export function useLinkExistingTask(
  projectId: string,
  commitmentId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      commitmentsApi.linkTask(commitmentId, taskId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      void qc.invalidateQueries({
        queryKey: taskKeys.commitments(projectId),
      });
      toast.success('Đã gắn task vào cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể gắn task',
      ),
  });
}

export function useUnlinkTask(projectId: string, commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      commitmentsApi.unlinkTask(commitmentId, taskId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      void qc.invalidateQueries({
        queryKey: taskKeys.commitments(projectId),
      });
      toast.success('Đã gỡ task khỏi cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể gỡ task',
      ),
  });
}

export function useAddEvidence(commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.addEvidence>[1]) =>
      commitmentsApi.addEvidence(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      toast.success('Đã thêm bằng chứng');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Không thể thêm bằng chứng',
      ),
  });
}

export function useTransitionCommitment(
  projectId: string,
  commitmentId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof commitmentsApi.transition>[1]) =>
      commitmentsApi.transition(commitmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      void qc.invalidateQueries({
        queryKey: taskKeys.commitments(projectId),
      });
      toast.success('Đã chuyển trạng thái cam kết');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể chuyển trạng thái cam kết',
      ),
  });
}

export function useRemoveSourceRef(commitmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId: string) =>
      commitmentsApi.removeSourceRef(commitmentId, refId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: taskKeys.commitmentDetail(commitmentId),
      });
      toast.success('Đã gỡ nguồn tham chiếu');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể gỡ nguồn tham chiếu',
      ),
  });
}
