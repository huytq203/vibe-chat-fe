'use client';

import { useBoard } from '../../hooks/useBoard';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function ListView({ projectId }: { projectId: string }) {
  const { data: board, isLoading } = useBoard(projectId);
  const openTask = useTasksUIStore((s) => s.openTask);

  if (isLoading) return <div className="p-4 text-muted-foreground">Đang tải…</div>;
  if (!board) return null;

  const allTasks = board.columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnName: col.name })),
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Tên task</th>
            <th className="pb-2 pr-4 font-medium">Cột</th>
          </tr>
        </thead>
        <tbody>
          {allTasks.map((task) => (
            <tr
              key={task.id}
              className="cursor-pointer border-b border-border hover:bg-muted/50"
              onClick={() => openTask(task.id)}
            >
              <td className="py-2 pr-4">
                {task.isPinned && <span className="mr-1 text-primary">📌</span>}
                {task.title}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{task.columnName}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {allTasks.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Chưa có task nào</p>
      )}
    </div>
  );
}
