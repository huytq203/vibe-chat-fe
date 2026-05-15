export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type TodoFilter = 'all' | 'active' | 'done';
