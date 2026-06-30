'use client';

import { create } from 'zustand';
import type { TaskPriority } from '../types';

/**
 * Cây subtask (UI-only demo, chưa có API parent/child). Mỗi root task giữ một
 * mảng node; mỗi node lại có children → lồng nhau không giới hạn.
 */
export interface SubtaskNode {
  id: string;
  title: string;
  /** Trạng thái = id cột (BoardColumn) của board; '' = chưa đặt. */
  status: string;
  priority: TaskPriority | null;
  tagIds: string[];
  assigneeIds: string[];
  description: string; // HTML từ editor
  children: SubtaskNode[];
}

export type SubtaskPatch = Partial<Omit<SubtaskNode, 'id' | 'children'>>;

/** Tham chiếu ổn định cho cây rỗng — tránh selector trả về `[]` mới gây vòng lặp. */
export const EMPTY_SUBTASKS: readonly SubtaskNode[] = [];

type SubtasksState = {
  /** Cây subtask theo rootTaskId. */
  treesByRoot: Record<string, SubtaskNode[]>;
  /** Đường dẫn node đang xem (id từ root xuống). Rỗng = đang xem task cha. */
  path: string[];
  addSubtask: (rootId: string, parentId: string | null, title: string, status?: string) => void;
  updateSubtask: (rootId: string, nodeId: string, patch: SubtaskPatch) => void;
  removeSubtask: (rootId: string, nodeId: string) => void;
  navigateInto: (nodeId: string) => void;
  navigateBack: () => void;
  resetPath: () => void;
};

function createNode(title: string, status: string): SubtaskNode {
  return {
    id: crypto.randomUUID(),
    title,
    status,
    priority: null,
    tagIds: [],
    assigneeIds: [],
    description: '',
    children: [],
  };
}

/** Map đệ quy: trả về cây mới với node khớp id đã biến đổi qua `fn`. */
function mapTree(nodes: SubtaskNode[], fn: (n: SubtaskNode) => SubtaskNode): SubtaskNode[] {
  return nodes.map((n) => fn({ ...n, children: mapTree(n.children, fn) }));
}

function insertChild(nodes: SubtaskNode[], parentId: string, child: SubtaskNode): SubtaskNode[] {
  return mapTree(nodes, (n) =>
    n.id === parentId ? { ...n, children: [...n.children, child] } : n,
  );
}

function removeNode(nodes: SubtaskNode[], nodeId: string): SubtaskNode[] {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => ({ ...n, children: removeNode(n.children, nodeId) }));
}

export function findNode(nodes: readonly SubtaskNode[], nodeId: string): SubtaskNode | null {
  for (const n of nodes) {
    if (n.id === nodeId) return n;
    const found = findNode(n.children, nodeId);
    if (found) return found;
  }
  return null;
}

export const useSubtasksStore = create<SubtasksState>((set) => ({
  treesByRoot: {},
  path: [],
  addSubtask: (rootId, parentId, title, status = '') =>
    set((s) => {
      const tree = s.treesByRoot[rootId] ?? [];
      const node = createNode(title, status);
      const next = parentId ? insertChild(tree, parentId, node) : [...tree, node];
      return { treesByRoot: { ...s.treesByRoot, [rootId]: next } };
    }),
  updateSubtask: (rootId, nodeId, patch) =>
    set((s) => {
      const tree = s.treesByRoot[rootId] ?? [];
      const next = mapTree(tree, (n) => (n.id === nodeId ? { ...n, ...patch } : n));
      return { treesByRoot: { ...s.treesByRoot, [rootId]: next } };
    }),
  removeSubtask: (rootId, nodeId) =>
    set((s) => {
      const tree = s.treesByRoot[rootId] ?? [];
      return {
        treesByRoot: { ...s.treesByRoot, [rootId]: removeNode(tree, nodeId) },
        path: s.path.filter((id) => id !== nodeId), // nếu đang xem node bị xoá → thoát
      };
    }),
  navigateInto: (nodeId) => set((s) => ({ path: [...s.path, nodeId] })),
  navigateBack: () => set((s) => ({ path: s.path.slice(0, -1) })),
  resetPath: () => set({ path: [] }),
}));
