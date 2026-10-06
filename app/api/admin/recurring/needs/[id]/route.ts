import type { NextRequest } from 'next/server';
import { recurringNeedDetailProxy } from '@/features/recurring/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return recurringNeedDetailProxy(req, id);
}
