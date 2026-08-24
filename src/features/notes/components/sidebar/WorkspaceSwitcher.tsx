'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
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
import { useWorkspaces } from '@/features/notes/hooks/use-query';
import type { Workspace } from '@/features/notes/types';
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
}

function WorkspaceMenu({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
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
              className={`h-10 w-full justify-start rounded-sm px-2 text-sm text-foreground hover:bg-sidebar-accent hover:text-foreground [&>div]:min-w-0 [&>div]:w-full ${focusRingClassName}`}
            >
              <Avatar
                className="h-5 w-5 text-xs"
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
                className={`${isActive ? 'text-foreground' : 'text-secondary-foreground'} focus:bg-sidebar-accent focus:text-foreground ${focusRingClassName}`}
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
  const { data, isLoading, isError, refetch } = useWorkspaces();

  if (isLoading) {
    return (
      <div className="px-2">
        <Skeleton
          data-testid="workspace-switcher-skeleton"
          rounded="sm"
          className="h-10 w-full"
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
      />
      <CreateWorkspaceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={onSelectWorkspace}
      />
    </>
  );
}
