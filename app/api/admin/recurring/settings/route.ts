import type { NextRequest } from 'next/server';
import { recurringSettingsGetProxy, recurringSettingsPutProxy } from '@/features/recurring/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return recurringSettingsGetProxy(req);
}

export function PUT(req: NextRequest) {
  return recurringSettingsPutProxy(req);
}
