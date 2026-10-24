import type { NextRequest } from 'next/server';
import { validateCampaign } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return validateCampaign(req, id);
}
