import type { NextRequest } from 'next/server';
import { campaignDetail, updateCampaign } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return campaignDetail(req, id);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return updateCampaign(req, id);
}
