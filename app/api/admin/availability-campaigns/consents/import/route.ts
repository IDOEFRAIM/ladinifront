import type { NextRequest } from 'next/server';
import { importConsents } from '@/features/availability-campaigns/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return importConsents(req);
}
