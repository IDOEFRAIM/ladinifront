import type { NextRequest } from 'next/server';
import { adminEndpoint } from '@/features/monitoring/cockpit/http';
import { fetchPerformance } from '@/features/monitoring/cockpit/performance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, ({ period }) => fetchPerformance(period));
}
