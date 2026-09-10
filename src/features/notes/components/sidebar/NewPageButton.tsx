'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCreatePage } from '@/features/notes/hooks/use-mutations';

interface NewPageButtonProps {
  workspaceId: string;
  onSelectPage: (id: string) => void;
}

/** Tạo trang ở gốc workspace. Trước đây chỉ có nút "trang con" trên từng hàng và
 * nút trong empty state, nên khi cây đã có trang thì không còn lối tạo trang gốc. */
export function NewPageButton({ workspaceId, onSelectPage }: NewPageButtonProps) {
  const createPage = useCreatePage();

  function handleCreatePage() {
    createPage.mutate(
      { workspaceId, parentId: undefined },
      { onSuccess: (page) => onSelectPage(page.id) },
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      aria-label="Tạo trang mới"
      title="Tạo trang mới"
      isLoading={createPage.isPending}
      onClick={handleCreatePage}
    >
      <Plus aria-hidden="true" className="size-4" />
    </Button>
  );
}
