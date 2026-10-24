import type { NextRequest } from 'next/server';
import { requestConsents } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return requestConsents(req);
}
