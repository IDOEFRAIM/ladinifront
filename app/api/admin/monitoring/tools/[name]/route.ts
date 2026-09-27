import type { NextRequest } from 'next/server';
import { adminEndpoint, safeToken } from '@/features/monitoring/cockpit/http';
import { fetchToolDetail } from '@/features/monitoring/cockpit/tools';
import { BadPeriodError } from '@/features/monitoring/cockpit/period';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  return adminEndpoint(req, async ({ period, page }) => {
    const name = safeToken(decodeURIComponent((await ctx.params).name));
    if (!name) throw new BadPeriodError('nom d\'outil invalide');
    return fetchToolDetail(name, period, page);
  });
}
