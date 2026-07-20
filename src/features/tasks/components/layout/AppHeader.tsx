'use client';

import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useProjectsInfinite } from '../../hooks/useProjectsInfinite';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { ActivityNotifications } from './ActivityNotifications';

interface AppHeaderProps {
  onCreateProject: () => void;
}

export function AppHeader({ onCreateProject }: AppHeaderProps) {
  const projectSearch = useTasksUIStore((s) => s.projectSearch);
  const setProjectSearch = useTasksUIStore((s) => s.setProjectSearch);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);

  // Cùng query key với Dashboard/ProjectsPage → dùng chung cache, không gọi thừa.
  const debounced = useDebouncedValue(projectSearch, 300);
  const { data } = useProjectsInfinite(debounced);
  const firstMatch = data?.pages[0]?.data[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Enter → vào thẳng board của dự án khớp đầu tiên; không có thì mở trang danh sách.
    if (firstMatch) setSelected(firstMatch.id);
    else setActiveView('projects');
  };

  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-border bg-background px-7">
      <div className="flex-1" />

      <Input
        icon={<Search className="h-4 w-4" />}
        value={projectSearch}
        onChange={(e) => setProjectSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tìm dự án… (Enter để mở)"
        className="hidden h-10 w-[280px] rounded-xl md:flex"
        aria-label="Tìm dự án"
      />

      <ActivityNotifications />

      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateProject}>
        Tạo mới
      </Button>
    </header>
  );
}
