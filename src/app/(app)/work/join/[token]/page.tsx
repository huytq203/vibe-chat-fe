'use client';

import { useParams, useRouter } from 'next/navigation';
import { AuthBootstrap } from '@/features/auth';
import { Button } from '@/components/ui/button/Button';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { useResolveInvite, useRequestJoin } from '@/features/tasks/hooks/useSharing';
import { useTasksUIStore } from '@/features/tasks/stores/tasks-ui.store';

export default function JoinPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : (params.token ?? '');

  return (
    <div className="flex min-h-full w-full items-center justify-center p-6">
      {/* Gate auth: chưa đăng nhập → chuyển tới /login */}
      <AuthBootstrap requireAuth redirectTo="/login" />
      <JoinCard token={token} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      {children}
    </div>
  );
}

function JoinCard({ token }: { token: string }) {
  const router = useRouter();
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data, isPending, isError } = useResolveInvite(token);
  const requestJoin = useRequestJoin(token);

  if (isPending) {
    return (
      <Card>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Đang tải…</p>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <XCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Link không hợp lệ hoặc đã bị tắt</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hãy xin chủ dự án gửi lại link mời mới.
        </p>
      </Card>
    );
  }

  const openProject = () => {
    setSelectedProjectId(data.projectId);
    router.push('/work');
  };

  if (data.alreadyMember) {
    return (
      <Card>
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="mt-3 text-sm font-medium">Bạn đã là thành viên của</p>
        <p className="text-base font-semibold">{data.projectName}</p>
        <Button className="mt-4 w-full" onClick={openProject}>
          Mở dự án
        </Button>
      </Card>
    );
  }

  if (data.requestStatus === 'PENDING') {
    return (
      <Card>
        <Clock className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3 text-sm font-medium">Yêu cầu đang chờ duyệt</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Chủ dự án <span className="font-medium">{data.projectName}</span> sẽ xét duyệt yêu cầu
          của bạn.
        </p>
      </Card>
    );
  }

  // Chưa có yêu cầu, hoặc từng bị từ chối → cho gửi (lại).
  return (
    <Card>
      <p className="text-sm text-muted-foreground">Bạn được mời tham gia dự án</p>
      <p className="mt-1 text-lg font-semibold">{data.projectName}</p>
      {data.requestStatus === 'REJECTED' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Yêu cầu trước đã bị từ chối. Bạn có thể gửi lại.
        </p>
      )}
      <Button
        className="mt-4 w-full"
        onClick={() => requestJoin.mutate()}
        disabled={requestJoin.isPending}
      >
        {requestJoin.isPending ? 'Đang gửi…' : 'Gửi yêu cầu tham gia'}
      </Button>
      {requestJoin.isError && (
        <p className="mt-2 text-xs text-destructive">Gửi yêu cầu thất bại, thử lại sau.</p>
      )}
    </Card>
  );
}
