import type { NextRequest } from 'next/server';
import { adminEndpoint } from '@/features/monitoring/cockpit/http';
import { fetchOverview } from '@/features/monitoring/cockpit/overview';
import { fetchHealth } from '@/features/monitoring/cockpit/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, async ({ period, thresholds }) => {
    const [overview, health] = await Promise.all([fetchOverview(period, thresholds.abandonedMinutes), fetchHealth(60, thresholds)]);
    return {
      ...overview,
      health: { overall: health.overall, dependencies: health.dependencies.map((d) => ({ key: d.key, label: d.label, state: d.state })) },
    };
  });
}
