"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar/Avatar";
import { Button } from "@/components/ui/button/Button";
import {
  Calendar,
  CheckCircle2,
  Eye,
  Flag,
  Gem,
  Hash,
  Tag as TagIcon,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover/Popover";
import { DatePicker } from "@/components/ui/datepicker/DatePicker";
import { useUpdateTask } from "../../hooks/useTaskDetail";
import {
  useAssignees,
  useAddAssignee,
  useRemoveAssignee,
} from "../../hooks/useAssignees";
import {
  useTaskTags,
  useProjectTags,
  useAttachTag,
  useDetachTag,
} from "../../hooks/useTaskTags";
import { useMembers } from "../../hooks/useMembers";
import { toast } from "sonner";
import { aiApi } from "@/services/ai.api";
import { getCurrentUser } from "../../lib/current-user";
import type { TaskDetail, TaskPriority } from "../../types";

/**
 * Định dạng khoảng thời gian hoàn thành (ms) sang tiếng Việt.
 * Ví dụ: "2 ngày 3 giờ", "5 giờ 12 phút", "8 phút".
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; dot: string; active: string }
> = {
  P1: { label: "Cao", dot: "#EF4444", active: "bg-red-100 text-red-700" },
  P2: {
    label: "Trung bình",
    dot: "#F59E0B",
    active: "bg-yellow-100 text-yellow-700",
  },
  P3: { label: "Thấp", dot: "#22C55E", active: "bg-green-100 text-green-700" },
};

function SidebarSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

interface TaskDetailSidebarProps {
  projectId: string;
  taskId: string;
  task: TaskDetail;
}

export function TaskDetailSidebar({
  projectId,
  taskId,
  task,
}: TaskDetailSidebarProps) {
  const updateTask = useUpdateTask(projectId, taskId);
  const [gemDraft, setGemDraft] = useState(
    task.gem === null ? "" : String(task.gem),
  );
  const [gemReason, setGemReason] = useState("");
  const [isEstimatingGem, setIsEstimatingGem] = useState(false);
  const { data: projectTags = [] } = useProjectTags(projectId);
  const { data: members = [] } = useMembers(projectId);

  // Nhãn: attach/detach có optimistic update trong hook → UI hiện ngay, rollback khi lỗi.
  const { data: tags = [] } = useTaskTags(projectId, taskId);
  const attachTag = useAttachTag(projectId, taskId);
  const detachTag = useDetachTag(projectId, taskId);

  // Người thực hiện: hook chưa optimistic → disable control khi đang mutate.
  const { data: assignees = [] } = useAssignees(projectId, taskId);
  const addAssignee = useAddAssignee(projectId, taskId);
  const removeAssignee = useRemoveAssignee(projectId, taskId);
  const assigneeMutating = addAssignee.isPending || removeAssignee.isPending;

  const availableMembers = members.filter(
    (m) => !assignees.some((a) => a.userId === m.userId),
  );

  // Tự gán bản thân — luôn khả dụng khi mình chưa được giao (không phụ thuộc list members)
  const currentUser = getCurrentUser();
  const currentMember = members.find(
    (member) => member.userId === currentUser?.userId,
  );
  const canManageAssignees =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";
  const isSelfAssigned =
    !!currentUser && assignees.some((a) => a.userId === currentUser.userId);
  const assignSelf = () => {
    if (!currentUser || assigneeMutating) return;
    addAssignee.mutate(
      {
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
      },
      {
        onError: (e) =>
          toast.error(
            e instanceof Error && e.message
              ? `Giao việc thất bại: ${e.message}`
              : "Giao việc cho bạn thất bại",
          ),
      },
    );
  };
  const availableTags = projectTags.filter(
    (pt) => !tags.some((t) => t.id === pt.id),
  );

  // Thời gian hoàn thành (từ lúc tạo tới lúc done) — chỉ tính khi task đã DONE.
  const completedDurationLabel =
    task.status === "DONE" && task.completedAt
      ? formatDuration(
          new Date(task.completedAt).getTime() -
            new Date(task.createdAt).getTime(),
        )
      : null;

  const handleDueDateChange = (
    value: Date | import("react-day-picker").DateRange | undefined,
  ) => {
    const date = value instanceof Date ? value : undefined;
    updateTask.mutate({ dueDate: date ? date.toISOString() : null });
  };

  const parsedGem = gemDraft === "" ? null : Number(gemDraft);
  const isGemValid =
    parsedGem === null ||
    (Number.isInteger(parsedGem) && parsedGem >= 1 && parsedGem <= 100);
  const hasGemChanged = parsedGem !== task.gem;

  const handleEstimateGem = async (): Promise<void> => {
    setIsEstimatingGem(true);
    try {
      const result = await aiApi.estimateGem({
        title: task.title,
        ...(task.description ? { description: task.description } : {}),
      });
      setGemDraft(result.gem === null ? "" : String(result.gem));
      setGemReason(result.reason);
    } catch {
      toast.error("AI chưa thể chấm gem. Vui lòng thử lại.");
    } finally {
      setIsEstimatingGem(false);
    }
  };

  const handleSaveGem = (): void => {
    if (!isGemValid || !hasGemChanged) return;
    updateTask.mutate({ gem: parsedGem });
  };

  return (
    <div className="flex max-h-[45%] w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-muted/30 md:max-h-none md:w-72 md:border-l md:border-t-0">
      {/* Due date */}
      <SidebarSection
        icon={<Calendar className="h-4 w-4" />}
        title="Ngày hết hạn"
      >
        <DatePicker
          mode="single"
          value={task.dueDate ? new Date(task.dueDate) : undefined}
          onChange={handleDueDateChange}
          placeholder="Chưa lên lịch"
        />
      </SidebarSection>

      {/* Priority */}
      <SidebarSection
        icon={<Flag className="h-4 w-4" />}
        title="Mức độ ưu tiên"
      >
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => {
            const meta = PRIORITY_META[p];
            const active = task.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() =>
                  updateTask.mutate({ priority: active ? null : p })
                }
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? meta.active
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: meta.dot }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection icon={<Gem className="h-4 w-4" />} title="Gem">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={gemDraft}
            title={gemReason || undefined}
            aria-label="Điểm gem"
            placeholder="1–100"
            onChange={(event) => setGemDraft(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="shrink-0"
            onClick={() => void handleEstimateGem()}
            isLoading={isEstimatingGem}
            aria-label="AI chấm gem"
          >
            AI chấm gem
          </Button>
        </div>
        <div className="mt-2 flex min-h-7 items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={handleSaveGem}
            disabled={!isGemValid || !hasGemChanged || updateTask.isPending}
            aria-label="Lưu gem"
          >
            Lưu
          </Button>
          {task.gemSource === "AI" && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              AI chấm
            </span>
          )}
          {!isGemValid && (
            <span className="text-xs text-danger">Nhập số từ 1 đến 100</span>
          )}
        </div>
      </SidebarSection>

      {/* Assignees */}
      <SidebarSection
        icon={<Eye className="h-4 w-4" />}
        title="Người thực hiện"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {assignees.map((a) => (
            <span
              key={a.userId}
              className="flex items-center gap-1 rounded-full bg-background py-0.5 pl-0.5 pr-1.5"
            >
              <Avatar
                src={a.avatarUrl ?? undefined}
                alt={a.displayName}
                fallback={a.displayName.charAt(0).toUpperCase()}
                className="h-5 w-5 text-[9px]"
              />
              <span className="text-xs">{a.displayName}</span>
              {canManageAssignees && (
                <button
                  type="button"
                  onClick={() => removeAssignee.mutate(a.userId)}
                  disabled={assigneeMutating}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={`Bỏ ${a.displayName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {/* Tự giao việc cho bản thân — một chạm, luôn hiện khi chưa được giao */}
          {canManageAssignees && currentUser && !isSelfAssigned && (
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-1.5 text-xs"
              onClick={assignSelf}
              disabled={assigneeMutating}
            >
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Giao cho tôi
            </Button>
          )}
          {canManageAssignees && availableMembers.length > 0 && (
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-7 px-1.5 text-xs"
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" /> Thêm
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-52 p-2"
                showArrow={false}
                align="start"
              >
                <div className="max-h-60 overflow-y-auto">
                  {availableMembers.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() =>
                        addAssignee.mutate({
                          userId: m.userId,
                          displayName: m.displayName,
                          avatarUrl: m.avatarUrl,
                        })
                      }
                      disabled={assigneeMutating}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      <Avatar
                        src={m.avatarUrl ?? undefined}
                        alt={m.displayName}
                        fallback={m.displayName.charAt(0).toUpperCase()}
                        className="h-5 w-5 text-[9px]"
                      />
                      {m.displayName}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {assignees.length === 0 &&
            availableMembers.length === 0 &&
            (isSelfAssigned || !currentUser) && (
              <span className="text-xs text-muted-foreground">
                Chưa có thành viên
              </span>
            )}
        </div>
      </SidebarSection>

      {/* Tags */}
      <SidebarSection icon={<TagIcon className="h-4 w-4" />} title="Nhãn">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => detachTag.mutate(tag.id)}
                aria-label={`Xoá nhãn ${tag.name}`}
                className="hover:opacity-80"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {availableTags.length > 0 && (
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-7 px-1.5 text-xs"
                >
                  <TagIcon className="mr-1 h-3.5 w-3.5" /> Nhãn
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-44 p-2"
                showArrow={false}
                align="start"
              >
                <div className="max-h-60 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => attachTag.mutate(tag)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {tags.length === 0 && availableTags.length === 0 && (
            <span className="text-xs text-muted-foreground">Chưa có nhãn</span>
          )}
        </div>
      </SidebarSection>

      {/* Metadata footer */}
      <div className="space-y-2 px-4 py-4 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/70">Tạo lúc</span>
          <p className="mt-0.5">
            {new Date(task.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div>
          <span className="font-medium text-foreground/70">Cập nhật</span>
          <p className="mt-0.5">
            {new Date(task.updatedAt).toLocaleString("vi-VN")}
          </p>
        </div>
        {completedDurationLabel && (
          <div className="rounded-lg bg-green-500/10 px-2.5 py-2 text-green-500">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Hoàn thành trong {completedDurationLabel}
            </span>
            {task.completedAt && (
              <p className="mt-0.5 text-green-500/80">
                {new Date(task.completedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground/70">Task ID</span>
          <span className="truncate font-mono">{task.id}</span>
        </div>
      </div>
    </div>
  );
}
