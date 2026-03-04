import { NextResponse } from 'next/server';
import { buildAccessContext } from '@/lib/access-context';
import { getSessionFromRequest } from '@/lib/session';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    try {
      console.log('[api/me] request url:', (req as any).url || 'n/a');
      try { console.log('[api/me] headers:', Object.fromEntries((req as any).headers || [])); } catch (e) { /* ignore */ }
      try { console.log('[api/me] cookie header:', (req as any).headers?.get ? (req as any).headers.get('cookie') : undefined); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('[api/me] pre-log error', e);
    }
    // 1. Récupération de la session
    const session = await getSessionFromRequest(req as any);
    console.log('[api/me] session:', { hasUser: !!session?.userId, preview: session?.userId ? String(session.userId).slice(0,8) : null });
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });
    }

    // 2. Construction du contexte d'accès (Permissions, Rôles, etc.)
    let ctx: any;
    try {
      ctx = await buildAccessContext(session.userId);
      console.log('[api/me] buildAccessContext success:', { role: ctx?.role || null, orgScopes: Array.isArray(ctx?.orgScopes) ? ctx.orgScopes.length : 0 });
    } catch (buildErr) {
      console.error('[api/me] buildAccessContext error for userId=', session.userId, buildErr);
      throw buildErr;
    }

    // 3. Récupération des infos de profil manquantes dans le contexte (Name, Email)
    const userProfile = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
      columns: { name: true, email: true },
    });

    if (!userProfile) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });
    }

    // 4. Chargement des noms d'organisations
    const orgIds = ctx.orgScopes.map(((o: any) => o.organizationId));
    const orgs = orgIds.length > 0
      ? await db.query.organizations.findMany({
          where: inArray(schema.organizations.id, orgIds),
          columns: { id: true, name: true },
        })
      : [];

    const orgNameById: Record<string, string> = {};
    for (const o of orgs) orgNameById[o.id] = o.name;

    // 5. Construction du Payload final
    interface Organization {
      organizationId: string;
      role: string;
      name: string;
    }

    interface UserPayload {
      name: string | null;
      email: string | null;
      role: string;
      producerId: string | null;
      organizations: Organization[];
      permissions: string[];
      permissionVersion: number;
    }

    const payload: UserPayload = {
      name: userProfile.name,
      email: userProfile.email,
      role: ctx.role,
      producerId: ctx.producerId || null,
      organizations: ctx.orgScopes.map((o: any) => ({ 
      organizationId: o.organizationId, 
      role: o.orgRole, 
      name: orgNameById[o.organizationId] || 'Organisation inconnue' 
      })),
      permissions: Array.from(ctx.permissions || []),
      permissionVersion: ctx.permissionVersion,
    };

    // 6. Réponse avec headers anti-cache
    return NextResponse.json(
      { success: true, user: payload },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );

  } catch (err: any) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }
    
    console.error('[api/me] Error:', err);
    return NextResponse.json(
      { success: false, error: "Erreur serveur interne." }, 
      { status: 500 }
    );
  }
} 