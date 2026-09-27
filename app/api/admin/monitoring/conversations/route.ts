import type { NextRequest } from 'next/server';
import { adminEndpoint, safeToken } from '@/features/monitoring/cockpit/http';
import { fetchConversations, SESSION_STATUSES } from '@/features/monitoring/cockpit/conversations';
import { BadPeriodError } from '@/features/monitoring/cockpit/period';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, ({ url, period, page, thresholds }) => {
    const q = url.searchParams;
    const status = q.get('status') || undefined;
    if (status && !(SESSION_STATUSES as readonly string[]).includes(status)) throw new BadPeriodError('status invalide');
    const minDuration = Number(q.get('minDurationSeconds') || 0);
    return fetchConversations(
      period,
      thresholds,
      {
        status,
        role: safeToken(q.get('role')),
        intent: safeToken(q.get('intent')),
        workflow: safeToken(q.get('workflow')),
        tool: safeToken(q.get('tool')),
        hasError: q.get('error') === '1' || q.get('error') === 'true',
        minDurationSeconds: Number.isFinite(minDuration) && minDuration > 0 ? Math.min(minDuration, 86400) : undefined,
      },
      page,
    );
  });
}
