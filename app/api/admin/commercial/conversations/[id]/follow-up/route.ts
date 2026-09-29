import type { NextRequest } from 'next/server';
import { commercialFollowUpProxy } from '@/features/commercial/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return commercialFollowUpProxy(req, id);
}
