import { todoDb } from '@/lib/db/in-memory-todos';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card/Card';
import { TodoList, TodoForm, TodoFilterBar } from '@/features/todo';

/**
 * Server Component (default).
 * - Fetch initial data ở server (no waterfall).
 * - Truyền data đã serialize sang Client Component qua props.
 */
export default async function Home() {
  const initialTodos = todoDb.list();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-2xl">vibe-chat — Todo example</CardTitle>
          <CardDescription>
            Feature mẫu thể hiện đầy đủ pattern: Server Component pre-fetch, TanStack Query
            hydrate, React Hook Form + Zod, Server Action + Result, Zustand UI state, 4-state UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TodoForm />
          <TodoFilterBar />
          <TodoList initialTodos={initialTodos} />
        </CardContent>
      </Card>
    </main>
  );
}
