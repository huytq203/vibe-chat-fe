'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Bell, ListTodo, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Progress } from '@/components/ui/progress/Progress';
import { Badge } from '@/components/ui/badge/Badge';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Separator } from '@/components/ui/separator/Separator';
import { Heading, Text } from '@/components/ui/typography/Typography';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { cn } from '@/lib/utils/cn';
import { useProjects } from '../hooks/useProjects';
import { useBoard } from '../hooks/useBoard';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import { NewProjectModal } from './NewProjectModal';
import type { Project } from '../types';

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function todayLabel(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
}

/** 1 dòng project — tự fetch board để tính tiến độ (done tasks / tổng). */
function ProjectRow({ project }: { project: Project }) {
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const { data: board, isLoading } = useBoard(project.id);

  const stats = useMemo(() => {
    if (!board) return null;
    let total = 0;
    let done = 0;
    for (const col of board.columns) {
      total += col.tasks.length;
      if (col.isDoneCol) done += col.tasks.length;
    }
    return { total, done, open: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [board]);

  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5"
      onClick={() => setSelected(project.id)}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <ListTodo className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Text size="sm" weight="medium" truncate className="text-left">
          {project.name}
        </Text>
        <div className="flex items-center gap-2">
          <Progress
            value={stats?.pct ?? 0}
            size="sm"
            variant="gradient"
            className="max-w-[160px]"
          />
          <Text size="xs" color="muted" numeric>
            {isLoading ? '…' : `${stats?.pct ?? 0}%`}
          </Text>
        </div>
      </div>
      <Badge variant="outline" size="sm" className="shrink-0">
        {isLoading ? '…' : `${stats?.open ?? 0} mở`}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
  );
}

type ChecklistItem = { id: string; text: string; done: boolean };

export function Dashboard() {
  const { data: projects, isLoading } = useProjects();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  // "My checklist" — local-only (BE chưa có endpoint checklist cá nhân).
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [draft, setDraft] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects ?? [];
    return (projects ?? []).filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const addItem = () => {
    const t = draft.trim();
    if (!t) return;
    setItems((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, text: t, done: false }]);
    setDraft('');
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Greeting */}
        <div className="mb-6 text-center">
          <Text size="sm" color="muted">
            {todayLabel()}
          </Text>
          <Heading level={2} className="mt-1">
            Bắt tay vào việc nào 👋
          </Heading>
        </div>

        {/* Search */}
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Tìm project, task…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 rounded-xl"
        />

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* My Tasks */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Task của tôi</CardTitle>
              <Tabs defaultValue="all">
                <TabsList size="xs">
                  <TabsTrigger value="all">Tất cả</TabsTrigger>
                  <TabsTrigger value="mentions">Nhắc đến</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <Text weight="medium">Chưa có task nào được giao cho bạn</Text>
              <Text size="sm" color="muted">
                Gán task cho thành viên sẽ có ở bản cập nhật tới.
              </Text>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Thông báo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
              <Text weight="medium">Yên bình quá…</Text>
              <Text size="sm" color="muted">
                Chưa có thông báo nào.
              </Text>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Projects</CardTitle>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
                Tạo project
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading && <Text size="sm" color="muted">Đang tải…</Text>}
              {!isLoading && filtered.length === 0 && (
                <Text size="sm" color="muted">
                  {query ? 'Không có project khớp tìm kiếm.' : 'Chưa có project. Tạo mới để bắt đầu.'}
                </Text>
              )}
              <div className="flex flex-col">
                {filtered.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* My checklist (local) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Checklist của tôi</CardTitle>
              <Badge variant="soft-primary" size="sm">
                Cục bộ
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-2">
              {items.length === 0 && (
                <Text size="sm" color="muted">
                  Thêm việc cần nhớ trong phiên này.
                </Text>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) =>
                      setItems((prev) =>
                        prev.map((it) => (it.id === item.id ? { ...it, done: checked === true } : it)),
                      )
                    }
                  />
                  <Text size="sm" className={cn('flex-1', item.done && 'text-muted-foreground line-through')}>
                    {item.text}
                  </Text>
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addItem();
                  }}
                  placeholder="Thêm mục…"
                  className="h-9"
                />
                <Button size="icon-sm" aria-label="Thêm mục" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NewProjectModal open={newOpen} onOpenChange={setNewOpen} />
    </ScrollArea>
  );
}
