import { NextResponse } from 'next/server';
import { todoDb } from '@/lib/db/in-memory-todos';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const todo = todoDb.get(id);
  if (!todo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(todo);
}
