import type { NextRequest } from 'next/server';
import { cancelCampaign } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return cancelCampaign(req, id);
}
