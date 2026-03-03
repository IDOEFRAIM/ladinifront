import { NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { buildAccessContext } from '@/lib/access-context';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  // Try to read session from the incoming request (supports cookie or Authorization header)
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });

  try {
    const ctx = await buildAccessContext(session.userId);

    // Load organization names for client-friendly display
    const orgIds = ctx.orgScopes.map((o) => o.organizationId);
    const orgs = orgIds.length > 0
      ? await prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })
      : [];

    const orgNameById: Record<string, string> = {};
    for (const o of orgs) orgNameById[o.id] = o.name;

    const payload = {
      role: ctx.role,
      producerId: ctx.producerId || null,
      organizations: ctx.orgScopes.map((o) => ({ organizationId: o.organizationId, role: o.orgRole, name: orgNameById[o.organizationId] || undefined })),
      permissions: Array.from(ctx.permissions || []),
      permissionVersion: ctx.permissionVersion,
    };

    return NextResponse.json({ success: true, user: payload });
  } catch (err: any) {
    console.log('er.message:',err.message)
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }
    console.error('[api/me] buildAccessContext error', err);
    return NextResponse.json({ success: false, error: "Erreur de vérification d'identité." }, { status: 500 });
  }
}
