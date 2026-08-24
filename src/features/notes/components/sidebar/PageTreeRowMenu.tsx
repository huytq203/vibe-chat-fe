'use client';

import { useState } from 'react';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { useRemovePage } from '@/features/notes/hooks/use-mutations';
import type { Page } from '@/features/notes/types';

interface PageTreeRowMenuProps {
  page: Page;
}

export function PageTreeRowMenu({ page }: PageTreeRowMenuProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const removePage = useRemovePage();
  const pageTitle = page.title || 'Không có tiêu đề';

  function handleCopyLink() {
    if (!navigator.clipboard) {
      toast.error('Trình duyệt không hỗ trợ sao chép liên kết');
      return;
    }

    const link = new URL(`/notes/${page.workspaceId}/${page.id}`, window.location.origin);
    void navigator.clipboard.writeText(link.toString()).then(
      () => toast.success('Đã sao chép liên kết trang'),
      () => toast.error('Không sao chép được liên kết'),
    );
  }

  function handleDelete() {
    removePage.mutate(
      { id: page.id, workspaceId: page.workspaceId, parentId: page.parentId },
      {
        onSuccess: () => {
          toast.success('Đã chuyển trang vào thùng rác');
          setIsDeleteOpen(false);
        },
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Tuỳ chọn trang ${pageTitle}`}
              title="Tuỳ chọn"
              className="h-6 w-6 shrink-0 rounded-sm p-0 text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <MoreHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="border-border bg-sidebar">
          <DropdownMenuItem
            className="text-secondary-foreground focus:bg-sidebar-accent focus:text-foreground"
            onClick={handleCopyLink}
          >
            <Copy aria-hidden="true" />
            Sao chép liên kết
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-danger focus:bg-sidebar-accent focus:text-danger"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá trang “{pageTitle}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Trang sẽ được chuyển vào thùng rác, không mất hẳn và có thể khôi phục sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
            <Button
              variant="danger"
              size="sm"
              isLoading={removePage.isPending}
              onClick={handleDelete}
            >
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
