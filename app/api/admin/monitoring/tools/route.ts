import type { NextRequest } from 'next/server';
import { adminEndpoint } from '@/features/monitoring/cockpit/http';
import { fetchTools } from '@/features/monitoring/cockpit/tools';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, async ({ period }) => ({ tools: await fetchTools(period) }));
}
