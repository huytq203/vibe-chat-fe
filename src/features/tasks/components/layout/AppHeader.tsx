'use client';

import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useProjectsInfinite } from '../../hooks/useProjectsInfinite';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { getViewTitle } from '../../lib/view-title';
import { ActivityNotifications } from './ActivityNotifications';
import { AppSidebar } from './AppSidebar';

interface AppHeaderProps {
  onCreateProject: () => void;
}

export function AppHeader({ onCreateProject }: AppHeaderProps) {
  const activeView = useTasksUIStore((s) => s.activeView);
  const projectSearch = useTasksUIStore((s) => s.projectSearch);
  const setProjectSearch = useTasksUIStore((s) => s.setProjectSearch);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);

  // Cùng query key với Dashboard/ProjectsPage → dùng chung cache, không gọi thừa.
  const debounced = useDebouncedValue(projectSearch, 300);
  const { data } = useProjectsInfinite(debounced);
  const firstMatch = data?.pages[0]?.data[0];

  // Board đã có ProjectSwitcher hiển thị tên dự án ngay dưới header → tránh lặp tên.
  const meta =
    activeView === 'board'
      ? { title: 'Nhiệm vụ', sub: 'Bảng công việc của dự án đang mở' }
      : getViewTitle(activeView);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Enter → vào thẳng board của dự án khớp đầu tiên; không có thì mở trang danh sách.
    if (firstMatch) setSelected(firstMatch.id);
    else setActiveView('projects');
  };

  return (
    <header className="flex shrink-0 items-center gap-2 rounded-2xl border bg-background px-3 py-2 sm:gap-3 sm:px-4">
      <div className="hidden min-w-0 flex-1 lg:block">
        <h1 className="truncate text-[14.5px] font-bold leading-tight text-foreground">
          {meta.title}
        </h1>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{meta.sub}</p>
      </div>

      <AppSidebar activeView={activeView} onNavigate={setActiveView} />

      {/* Input bọc BaseField.Root w-full → phải khoá bề rộng ở ngoài, nếu không
          nó nuốt hết chỗ của tiêu đề bên trái. */}
      <div className="hidden w-[240px] shrink-0 lg:block">
        <Input
          icon={<Search className="h-4 w-4" />}
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm dự án… (Enter để mở)"
          className="h-9 rounded-xl"
          aria-label="Tìm dự án"
        />
      </div>

      <ActivityNotifications />

      <Button
        size="sm"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={onCreateProject}
        aria-label="Tạo dự án mới"
        className="px-2.5 sm:px-3"
      >
        <span className="hidden sm:inline">Tạo mới</span>
      </Button>
    </header>
  );
}
