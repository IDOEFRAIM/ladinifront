import { NextResponse, type NextRequest } from 'next/server';
import { analyticsProxy, METRIC_RE } from '@/features/analytics/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ metric: string }> }) {
  const { metric } = await ctx.params;
  // Validé APRÈS l'authentification admin (voir analyticsProxy) : un anonyme n'apprend rien.
  return analyticsProxy(req, `metrics/${metric}/timeseries`, () =>
    METRIC_RE.test(metric) ? null : NextResponse.json({ error: 'Métrique invalide.' }, { status: 400 }), 'producers');
}
