import type { NextRequest } from 'next/server';
import { commercialStatusProxy } from '@/features/commercial/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return commercialStatusProxy(req, id);
}
