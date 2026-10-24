import type { NextRequest } from 'next/server';
import { listCampaigns, createCampaign } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return listCampaigns(req);
}

export async function POST(req: NextRequest) {
  return createCampaign(req);
}
