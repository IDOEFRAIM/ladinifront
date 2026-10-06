import type { NextRequest } from 'next/server';
import { recurringNeedsListProxy } from '@/features/recurring/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return recurringNeedsListProxy(req);
}
