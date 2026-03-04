import { NextResponse } from 'next/server';
import { buildAccessContext } from '@/lib/access-context';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // 1. Récupération de la session
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });
    }

    // 2. Construction du contexte d'accès (Permissions, Rôles, etc.)
    const ctx = await buildAccessContext(session.userId);

    // 3. Récupération des infos de profil manquantes dans le contexte (Name, Email)
    // On peut optimiser cela en les incluant directement dans buildAccessContext si nécessaire
    const userProfile = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true }
    });

    if (!userProfile) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 401 });
    }

    // 4. Chargement des noms d'organisations
    const orgIds = ctx.orgScopes.map((o) => o.organizationId);
    const orgs = orgIds.length > 0
      ? await prisma.organization.findMany({ 
          where: { id: { in: orgIds } }, 
          select: { id: true, name: true } 
        })
      : [];

    const orgNameById: Record<string, string> = {};
    for (const o of orgs) orgNameById[o.id] = o.name;

    // 5. Construction du Payload final
    const payload = {
      name: userProfile.name,
      email: userProfile.email,
      role: ctx.role,
      producerId: ctx.producerId || null,
      organizations: ctx.orgScopes.map((o) => ({ 
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