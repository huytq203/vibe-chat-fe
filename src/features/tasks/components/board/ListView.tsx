'use client';

import { useBoard } from '../../hooks/useBoard';
import { ListColumn } from './ListColumn';

export function ListView({ projectId }: { projectId: string }) {
  const { data: board, isLoading, isError } = useBoard(projectId);

  if (isLoading) return <div className="p-7 text-muted-foreground">Đang tải danh sách…</div>;
  if (isError) return <div className="p-7 text-red-500">Không tải được danh sách. Vui lòng thử lại.</div>;
  if (!board) return null;

  if (board.columns.length === 0) {
    return <p className="p-7 text-center text-muted-foreground">Chưa có cột nào</p>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/50 px-4 pb-5 pt-4 sm:px-5">
      <div className="mx-auto max-w-[940px]">
        {board.columns.map((column) => (
          <ListColumn key={column.id} projectId={projectId} column={column} />
        ))}
      </div>
    </div>
  );
}
