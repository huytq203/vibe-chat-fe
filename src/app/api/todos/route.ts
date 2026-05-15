import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { todoDb } from '@/lib/db/in-memory-todos';

const filterSchema = z.enum(['all', 'active', 'done']).default('all');

export async function GET(req: NextRequest) {
  // TODO: authZ check
  const filterParam = req.nextUrl.searchParams.get('filter');
  const parsed = filterSchema.safeParse(filterParam ?? undefined);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid filter' }, { status: 400 });
  }

  const all = todoDb.list();
  const filtered =
    parsed.data === 'active' ? all.filter((t) => !t.done)
    : parsed.data === 'done' ? all.filter((t) => t.done)
    : all;

  return NextResponse.json(filtered);
}
