'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useDeleteWorkspace } from '@/features/notes/hooks/use-mutations';
import { useWorkspaces } from '@/features/notes/hooks/use-query';
import type { Workspace } from '@/features/notes/types';
import { toast } from 'sonner';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface WorkspaceSwitcherProps {
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
}

interface WorkspaceMenuProps extends WorkspaceSwitcherProps {
  workspaces: Workspace[];
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
}

function WorkspaceMenu({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
}: WorkspaceMenuProps) {
  const activeWorkspace = workspaces.find(({ id }) => id === activeWorkspaceId);

  return (
    <div className="px-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              aria-label="Chọn workspace"
              className={`h-11 w-full justify-start rounded-xl px-2 text-sm text-foreground hover:bg-sidebar-accent hover:text-foreground md:h-10 [&>div]:min-w-0 [&>div]:w-full ${focusRingClassName}`}
            >
              <Avatar
                className="h-6 w-6 text-xs"
                alt={activeWorkspace?.name ?? 'Chưa chọn workspace'}
                fallback={activeWorkspace?.icon || undefined}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {activeWorkspace?.name ?? 'Chọn workspace'}
              </span>
              <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="border-border bg-sidebar">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            return (
              <DropdownMenuItem
                key={workspace.id}
                aria-current={isActive ? 'true' : undefined}
                className={`${isActive ? 'text-foreground' : 'text-muted-foreground'} focus:bg-sidebar-accent focus:text-foreground ${focusRingClassName}`}
                onClick={() => onSelectWorkspace(workspace.id)}
              >
                {isActive ? (
                  <Check data-testid="active-workspace-check" aria-hidden="true" />
                ) : (
                  <span className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="min-w-0 truncate">{workspace.name}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            className={`text-foreground focus:bg-sidebar-accent focus:text-foreground ${focusRingClassName}`}
            onClick={onCreateWorkspace}
          >
            <Plus aria-hidden="true" />
            Tạo workspace mới
          </DropdownMenuItem>
          {activeWorkspace?.type === 'TEAM' && activeWorkspace.myRole === 'OWNER' && (
            <>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className={`text-danger focus:bg-danger/10 focus:text-danger ${focusRingClassName}`}
                onClick={() => onDeleteWorkspace(activeWorkspace)}
              >
                <Trash2 aria-hidden="true" />
                Xóa workspace hiện tại
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function WorkspaceSwitcher({
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceSwitcherProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const deleteWorkspace = useDeleteWorkspace();
  const { data, isLoading, isError, refetch } = useWorkspaces();

  function handleDeleteDialogChange(nextOpen: boolean) {
    if (!nextOpen && !deleteWorkspace.isPending) setWorkspaceToDelete(null);
  }

  function handleDeleteWorkspace() {
    if (!workspaceToDelete || !data) return;
    const deletedWorkspace = workspaceToDelete;
    const nextWorkspace = data.find(({ id }) => id !== deletedWorkspace.id);
    deleteWorkspace.mutate(deletedWorkspace.id, {
      onSuccess: () => {
        toast.success(`Đã xóa workspace “${deletedWorkspace.name}”`);
        setWorkspaceToDelete(null);
        if (deletedWorkspace.id === activeWorkspaceId && nextWorkspace) {
          onSelectWorkspace(nextWorkspace.id);
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="px-2">
        <Skeleton
          data-testid="workspace-switcher-skeleton"
          rounded="md"
          className="h-11 w-full md:h-10"
        />
      </div>
    );
  }
  if (isError) return <ErrorState size="sm" onRetry={refetch} />;
  if (!data || data.length === 0) {
    return (
      <>
        <EmptyState
          size="sm"
          icon={<Plus aria-hidden="true" />}
          title="Chưa có workspace"
          action={
            <Button
              size="xs"
              variant="ghost"
              className="border border-border text-foreground hover:bg-sidebar-accent"
              onClick={() => setIsDialogOpen(true)}
            >
              Tạo workspace đầu tiên
            </Button>
          }
        />
        <CreateWorkspaceDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCreated={onSelectWorkspace}
        />
      </>
    );
  }

  return (
    <>
      <WorkspaceMenu
        workspaces={data}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={() => setIsDialogOpen(true)}
        onDeleteWorkspace={setWorkspaceToDelete}
      />
      <CreateWorkspaceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={onSelectWorkspace}
      />
      <AlertDialog
        open={workspaceToDelete !== null}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa workspace này?</AlertDialogTitle>
            <AlertDialogDescription>
              Workspace{' '}
              <span className="font-semibold text-foreground">
                {workspaceToDelete?.name}
              </span>{' '}
              cùng toàn bộ trang bên trong sẽ không còn truy cập được. Thao tác này không thể
              hoàn tác trong ứng dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              disabled={deleteWorkspace.isPending}
              onClick={() => setWorkspaceToDelete(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              isLoading={deleteWorkspace.isPending}
              onClick={handleDeleteWorkspace}
            >
              Xóa workspace
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
