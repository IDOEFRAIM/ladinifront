import type { NextRequest } from 'next/server';
import { adminEndpoint } from '@/features/monitoring/cockpit/http';
import { fetchHealth } from '@/features/monitoring/cockpit/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, ({ url, thresholds }) => fetchHealth(Number(url.searchParams.get('windowMinutes') || 60), thresholds));
}
