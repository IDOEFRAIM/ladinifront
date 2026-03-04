import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { cookies } from 'next/headers';
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return new Response('Bad Request', { status: 400 });

  const membership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(schema.userOrganizations.userId, session.userId),
      eq(schema.userOrganizations.organizationId, organizationId),
    ),
    with: { dynRole: { columns: { permissions: true } } },
  });
  // Allow system admins to select any org even without explicit membership
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.userId), columns: { role: true } });
  const systemRole = String(user?.role || '').toUpperCase();
  if (!membership && systemRole !== 'SUPERADMIN' && systemRole !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  const cookieStore = await cookies();
  const perms = membership?.dynRole?.permissions || [];
  const roleForCookie = membership?.role ?? (systemRole === 'SUPERADMIN' || systemRole === 'ADMIN' ? 'ADMIN' : 'FIELD_AGENT');

  cookieStore.set(COOKIE_NAMES.ACTIVE_ORG_ID, organizationId, publicOpts());
  cookieStore.set(COOKIE_NAMES.USER_PERMISSIONS, JSON.stringify(perms), publicOpts());
  cookieStore.set(COOKIE_NAMES.USER_ORG, JSON.stringify({ organizationId, role: roleForCookie }), publicOpts());

  if (process.env.NODE_ENV !== 'production') {
    console.log(`select-org: user=${session.userId} selected org=${organizationId}; perms=${JSON.stringify(perms)}`);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
