import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { selectOrganizationAction } from '@/app/actions/org.server';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return new Response('Bad Request', { status: 400 });

  const res = await selectOrganizationAction(session.userId, organizationId);
  if (!res.success) return new Response('Forbidden', { status: 403 });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`select-org: user=${session.userId} selected org=${organizationId}`);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
