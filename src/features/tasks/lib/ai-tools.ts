export const DEFAULT_STATUS = 'Đang xử lý…';

const MUTATING_TOOLS = new Set(['create_project', 'create_task', 'update_task']);
const TOOL_LABELS: Record<string, string> = {
  list_projects: 'Đang xem project…', create_project: 'Đang tạo project…',
  list_project_members: 'Đang xem thành viên…', list_tasks: 'Đang tìm task…',
  create_task: 'Đang tạo task…', update_task: 'Đang cập nhật task…',
  my_tasks: 'Đang lấy việc của bạn…', project_stats: 'Đang tính tiến độ…',
  project_leaderboard: 'Đang xếp hạng…',
  my_performance: 'Đang tính hiệu suất…',
  search_pages: 'Đang tìm ghi chú…', read_page: 'Đang đọc ghi chú…',
};

export function toolStatusLabel(name: string): string {
  return TOOL_LABELS[name] ?? DEFAULT_STATUS;
}

/** Công cụ làm đổi dữ liệu task → panel phải làm mới cache sau khi lượt AI xong. */
export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}
