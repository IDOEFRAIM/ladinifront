import type { NextRequest } from 'next/server';
import { adminEndpoint, UUID_RE } from '@/features/monitoring/cockpit/http';
import { fetchConversation } from '@/features/monitoring/cockpit/conversations';
import { BadPeriodError } from '@/features/monitoring/cockpit/period';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return adminEndpoint(req, async () => {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new BadPeriodError('identifiant de conversation invalide');
    return fetchConversation(id);
  });
}
