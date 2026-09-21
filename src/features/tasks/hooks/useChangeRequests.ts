'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { changeRequestsApi } from '../services/commitments.api';
import { taskKeys } from '../services/keys';
import type { ChangeRequestStatusValue } from '../types';

const PAGE_SIZE = 20;

export interface ChangeRequestFilters {
  status?: ChangeRequestStatusValue;
  commitmentId?: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useChangeRequestsInfinite(
  projectId: string,
  filters: ChangeRequestFilters,
) {
  return useInfiniteQuery({
    queryKey: [
      ...taskKeys.changeRequests(projectId),
      'infinite',
      filters,
    ] as const,
    queryFn: ({ pageParam }) =>
      changeRequestsApi.listPaged(projectId, {
        page: pageParam,
        limit: PAGE_SIZE,
        ...filters,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
}

export function useChangeRequestDetail(changeRequestId: string) {
  return useQuery({
    queryKey: taskKeys.changeRequestDetail(changeRequestId),
    queryFn: () => changeRequestsApi.getDetail(changeRequestId),
    enabled: !!changeRequestId,
  });
}

export function useCreateChangeRequest(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.create>[1]) =>
      changeRequestsApi.create(projectId, input, crypto.randomUUID()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequests(projectId),
      });
      toast.success('Đã tạo yêu cầu thay đổi');
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể tạo yêu cầu thay đổi')),
  });
}

export function useUpdateChangeRequest(
  projectId: string,
  changeRequestId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.update>[1]) =>
      changeRequestsApi.update(changeRequestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequestDetail(changeRequestId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequests(projectId),
      });
      toast.success('Đã cập nhật yêu cầu thay đổi');
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể cập nhật yêu cầu thay đổi')),
  });
}

export function useTransitionChangeRequest(
  projectId: string,
  changeRequestId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof changeRequestsApi.transition>[1]) =>
      changeRequestsApi.transition(changeRequestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequestDetail(changeRequestId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequests(projectId),
      });
      toast.success('Đã chuyển trạng thái yêu cầu thay đổi');
    },
    onError: (error) =>
      toast.error(
        errorMessage(error, 'Không thể chuyển trạng thái yêu cầu thay đổi'),
      ),
  });
}

export function useRemoveChangeRequestSourceRef(changeRequestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refId: string) =>
      changeRequestsApi.removeSourceRef(changeRequestId, refId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.changeRequestDetail(changeRequestId),
      });
      toast.success('Đã gỡ nguồn tham chiếu');
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Không thể gỡ nguồn tham chiếu')),
  });
}
