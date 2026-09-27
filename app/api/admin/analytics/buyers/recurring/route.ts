import type { NextRequest } from 'next/server';
import { analyticsProxy } from '@/features/analytics/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return analyticsProxy(req, 'recurring');
}
