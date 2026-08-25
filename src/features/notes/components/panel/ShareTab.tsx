'use client';

import { Lock, Share2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { usePage, usePermissions, useWorkspaceMembers } from '@/features/notes/hooks/use-query';
import { InternalPermissionSection } from './InternalPermissionSection';
import { PublicShareSection } from './PublicShareSection';

interface ShareTabProps {
  pageId: string;
  workspaceId: string;
}

function ShareTabSkeleton() {
  return (
    <div data-testid="share-tab-loading" className="space-y-3 p-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

/** Nội bộ + công khai đều 403 với người không có `FULL`, nên chặn từ đây thay
 * vì để hai section con tự bắn lỗi 403 riêng lẻ. */
function ShareTabContent({ pageId, workspaceId }: ShareTabProps) {
  const membersQuery = useWorkspaceMembers(workspaceId);
  const permissionsQuery = usePermissions(pageId);

  if (membersQuery.isLoading || permissionsQuery.isLoading) return <ShareTabSkeleton />;
  if (membersQuery.isError || permissionsQuery.isError) {
    return (
      <ErrorState
        size="sm"
        message="Không tải được dữ liệu chia sẻ"
        onRetry={() => { void membersQuery.refetch(); void permissionsQuery.refetch(); }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <InternalPermissionSection
        pageId={pageId}
        members={membersQuery.data ?? []}
        permissions={permissionsQuery.data ?? []}
      />
      <PublicShareSection pageId={pageId} />
    </div>
  );
}

export function ShareTab({ pageId, workspaceId }: ShareTabProps) {
  const pageQuery = usePage(pageId);

  if (pageQuery.isLoading) return <ShareTabSkeleton />;
  if (pageQuery.isError) {
    return (
      <ErrorState
        size="sm"
        message="Không tải được thông tin trang"
        onRetry={() => void pageQuery.refetch()}
      />
    );
  }
  if (!pageQuery.data) {
    return <EmptyState icon={<Share2 aria-hidden="true" />} title="Không tìm thấy trang" size="sm" />;
  }
  if (pageQuery.data.myRole !== 'FULL') {
    return (
      <EmptyState
        icon={<Lock aria-hidden="true" />}
        title="Chỉ người có toàn quyền mới quản lý chia sẻ"
        hint="Nhờ người có toàn quyền trên trang này cấp quyền hoặc tạo liên kết công khai."
        size="sm"
      />
    );
  }

  return <ShareTabContent pageId={pageId} workspaceId={workspaceId} />;
}
