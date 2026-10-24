import type { NextRequest } from 'next/server';
import { eligibleOffers } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return eligibleOffers(req);
}
