export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  isBoardLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTask {
  id: string;
  columnId: string;
  title: string;
  position: number;
  isPinned: boolean;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isDoneCol: boolean;
  tasks: BoardTask[];
}

export interface Board {
  project: Project;
  columns: BoardColumn[];
}
