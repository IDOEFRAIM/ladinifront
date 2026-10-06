import type { NextRequest } from 'next/server';
import { commercialListProxy } from '@/features/commercial/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return commercialListProxy(req);
}
