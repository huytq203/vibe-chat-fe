const ACTION_LABELS: Record<string, string> = {
  'task.created': 'đã tạo task',
  'task.updated': 'đã cập nhật task',
  'task.moved': 'đã di chuyển task',
  'task.deleted': 'đã xoá task',
  'task.completed': 'đã hoàn thành task',
  'task.reopened': 'đã mở lại task',
  'comment.created': 'đã bình luận',
  'column.created': 'đã tạo cột',
  'column.updated': 'đã cập nhật cột',
  'column.deleted': 'đã xoá cột',
  'member.added': 'đã thêm thành viên',
  'member.removed': 'đã gỡ thành viên',
  'tag.created': 'đã tạo nhãn',
  'tag.updated': 'đã cập nhật nhãn',
  'tag.deleted': 'đã xoá nhãn',
  'tag.attached': 'đã gắn nhãn vào task',
  'tag.detached': 'đã gỡ nhãn khỏi task',
  'project.updated': 'đã cập nhật dự án',
  'project.deleted': 'đã xoá dự án',
  'assignee.added': 'đã thêm người thực hiện',
};

/** Nhãn tiếng Việt cho mã hành động; chưa map thì trả nguyên mã để không nuốt thông tin. */
export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} ngày trước` : new Date(iso).toLocaleDateString('vi-VN');
}
