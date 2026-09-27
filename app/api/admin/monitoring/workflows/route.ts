import type { NextRequest } from 'next/server';
import { adminEndpoint, safeToken } from '@/features/monitoring/cockpit/http';
import { fetchWorkflows, fetchWorkflowSteps } from '@/features/monitoring/cockpit/workflows';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, async ({ url, period, thresholds }) => {
    const workflow = safeToken(url.searchParams.get('workflow'));
    const [workflows, steps] = await Promise.all([fetchWorkflows(period, thresholds), workflow ? fetchWorkflowSteps(period, workflow) : Promise.resolve(null)]);
    return { workflows, steps };
  });
}
