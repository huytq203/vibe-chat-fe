"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input/Input";
import { DatePicker } from "@/components/ui/datepicker/DatePicker";
import { Textarea } from "@/components/ui/textarea/Textarea";
import { Button } from "@/components/ui/button/Button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog/AlertDialog";
import { tasksApi } from "../../services/tasks.api";
import { taskKeys } from "../../services/keys";
import { getCurrentUser } from "../../lib/current-user";
import { useDeleteProject } from "../../hooks/useDeleteProject";
import { useMembers } from "../../hooks/useMembers";
import { useTasksUIStore } from "../../stores/tasks-ui.store";
import type { Board, Project } from "../../types";

/** ISO date → Date (bỏ qua nếu null) */
function toDateValue(iso: string | null): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

/** So sánh 2 ngày theo mốc ngày (bỏ giờ) để phát hiện thay đổi */
function sameDay(a: Date | undefined, b: Date | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.toDateString() === b.toDateString();
}

export function ProjectInfoTab({ project }: { project: Project }) {
  // Remount form khi chuyển project hoặc cache nhận một phiên bản project mới.
  // Nhờ vậy state khởi tạo lại từ props mà không cần setState trong effect.
  return <ProjectInfoForm key={`${project.id}:${project.updatedAt}`} project={project} />;
}

function ProjectInfoForm({ project }: { project: Project }) {
  const qc = useQueryClient();
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.userId === project.ownerId;
  const { data: members = [] } = useMembers(project.id);
  const currentRole = members.find(
    (member) => member.userId === currentUser?.userId,
  )?.role;
  const canDeleteProject = isOwner || currentRole === "OWNER" || currentRole === "ADMIN";
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    toDateValue(project.startDate),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    toDateValue(project.endDate),
  );

  // Ràng buộc business: ngày kết thúc phải >= ngày bắt đầu
  const dateError =
    startDate && endDate && endDate < startDate
      ? "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
      : undefined;

  const updateProject = useMutation({
    mutationFn: () =>
      tasksApi.updateProject(project.id, {
        name: name.trim(),
        description: desc.trim() || undefined,
        // Gửi ISO khi có giá trị; null để xoá ngày đã đặt trước đó
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      }),
    onSuccess: (updatedProject) => {
      // Ghi ngay response vào cả project list và board để ngày vừa lưu hiển thị tức thì,
      // không phải chờ refetch/realtime event quay về.
      qc.setQueryData<Project[]>(taskKeys.projects(), (projects) =>
        projects?.map((item) =>
          item.id === updatedProject.id ? updatedProject : item,
        ),
      );
      qc.setQueryData<Board>(taskKeys.board(project.id), (board) =>
        board ? { ...board, project: updatedProject } : board,
      );

      setName(updatedProject.name);
      setDesc(updatedProject.description ?? "");
      setStartDate(toDateValue(updatedProject.startDate));
      setEndDate(toDateValue(updatedProject.endDate));

      void qc.invalidateQueries({ queryKey: taskKeys.projects() });
      toast.success("Đã lưu thay đổi dự án");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu thay đổi, vui lòng thử lại",
      ),
  });

  const dirty =
    name.trim() !== project.name ||
    desc.trim() !== (project.description ?? "") ||
    !sameDay(startDate, toDateValue(project.startDate)) ||
    !sameDay(endDate, toDateValue(project.endDate));

  // --- Vùng nguy hiểm: xoá dự án (confirm 2 bước — phải gõ đúng tên dự án) ---
  const closeSettings = useTasksUIStore((s) => s.closeSettings);
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const deleteProject = useDeleteProject(project.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const nameMatches = confirmName.trim() === project.name;

  const handleConfirmDelete = () => {
    if (!nameMatches || deleteProject.isPending) return;
    deleteProject.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        closeSettings();
        // setSelectedProjectId(null) đưa activeView về 'home' → ép lại 'projects' sau đó.
        setSelectedProjectId(null);
        setActiveView("projects");
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-cyan-600 text-xl font-bold text-white">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold">Tên dự án</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên dự án"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Mô tả</label>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Mô tả dự án (tuỳ chọn)"
          className="resize-none"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 items-start gap-4">
        <DatePicker
          mode="single"
          editable
          label="Ngày bắt đầu"
          placeholder="dd/mm/yyyy"
          value={startDate}
          onChange={(d) => setStartDate(d instanceof Date ? d : undefined)}
        />
        <DatePicker
          mode="single"
          editable
          label="Ngày kết thúc"
          placeholder="dd/mm/yyyy"
          value={endDate}
          onChange={(d) => setEndDate(d instanceof Date ? d : undefined)}
          error={dateError}
        />
      </div>

      {project.isOverdue && (
        <p className="text-xs text-danger">
          Dự án đã quá hạn kết thúc — cập nhật trạng thái hoặc gia hạn ngày kết
          thúc.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tạo lúc
          </p>
          <p className="mt-0.5">
            {new Date(project.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cập nhật
          </p>
          <p className="mt-0.5">
            {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      {isOwner && (
        <Button
          onClick={() => updateProject.mutate()}
          disabled={
            !name.trim() || !dirty || !!dateError || updateProject.isPending
          }
        >
          {updateProject.isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      )}

      {canDeleteProject && (
        <div className="rounded-lg border border-danger/40 p-4">
          <p className="text-sm font-semibold text-danger">Vùng nguy hiểm</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Xoá dự án sẽ xoá vĩnh viễn toàn bộ cột, nhiệm vụ, bình luận và tệp
            đính kèm. Hành động này không thể hoàn tác.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => setConfirmOpen(true)}
          >
            Xoá dự án
          </Button>
        </div>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setConfirmName("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá dự án?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ dữ liệu của dự án{" "}
              <span className="font-semibold text-foreground">
                {project.name}
              </span>{" "}
              sẽ bị xoá vĩnh viễn. Gõ chính xác tên dự án để xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            aria-label="Nhập tên dự án để xác nhận"
          />
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmName("");
              }}
              disabled={deleteProject.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={!nameMatches}
              isLoading={deleteProject.isPending}
            >
              Xoá vĩnh viễn
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
