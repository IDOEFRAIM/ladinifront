/**
 * GUARD D'AUTHENTIFICATION — AgriConnect v3 (Drizzle)
 * ──────────────────────────────────────────────────────────────────────────
 * Protège les API Routes côté serveur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { db } from '@/src/db';
import { userOrganizations, zones } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildAccessContext, type AccessContext } from '@/lib/access-context';
import { getSessionFromRequest } from '@/lib/session';

export type { AccessContext };

export interface OrgMembership {
  organizationId: string;
  role: string;
  scopedLocationId?: string | null;
  managedZoneId?: string | null;
  dynRolePermissions?: string[];
}

export type SystemRole = 'SUPERADMIN' | 'ADMIN' | 'USER' | 'PRODUCER' | 'BUYER' | 'AGENT';

export interface AuthenticatedUser {
  id: string;
  role: string;
  name: string | null;
  producerId?: string;
  organizations: OrgMembership[];
  permissions: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// getAccessContext
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne l'AccessContext complet. 
 * Note : requiredPermissions vérifie que l'utilisateur possède TOUTES les permissions demandées.
 */
export async function getAccessContext(
  requiredRoles?: SystemRole[],
  requiredPermissions?: string[]
): Promise<{ ctx: AccessContext | null; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const headerStore = await headers(); // Next.js 15 nécessite await

  // Tentative de récupération de session (Cookie puis Header)
  let session = await getSessionFromRequest({ cookies: cookieStore } as any);
  
  if (!session?.userId) {
    try {
      session = await getSessionFromRequest({ headers: headerStore } as any);
    } catch (e) { /* ignore */ }
  }

  const userId = session?.userId;

  if (!userId || userId.length < 10) {
    return {
      ctx: null,
      error: NextResponse.json(
        { error: 'Authentification requise. Veuillez vous connecter.' },
        { status: 401 }
      ),
    };
  }

  try {
    const ctx = await buildAccessContext(userId);

    // 1. Bypass SUPERADMIN
    if (ctx.role === 'SUPERADMIN') return { ctx, error: null };

    // 2. Vérification du Rôle Système
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(ctx.role as SystemRole)) {
        return {
          ctx: null,
          error: NextResponse.json({ error: 'Accès non autorisé pour votre rôle.' }, { status: 403 }),
        };
      }
    }

    // 3. Vérification des Permissions (ADMIN bypass)
    if (requiredPermissions && requiredPermissions.length > 0 && ctx.role !== 'ADMIN') {
      // .every() pour exiger toutes les permissions, .some() si une seule suffit
      const hasAllPerms = requiredPermissions.every((p) => ctx.permissions.has(p as any));
      if (!hasAllPerms) {
        return {
          ctx: null,
          error: NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 }),
        };
      }
    }

    return { ctx, error: null };
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return { ctx: null, error: NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 }) };
    }
    console.error('[getAccessContext] Fatal error:', err);
    return { ctx: null, error: NextResponse.json({ error: "Erreur serveur d'authentification." }, { status: 500 }) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE TRANSITION (Mappe AccessContext vers AuthenticatedUser)
// ─────────────────────────────────────────────────────────────────────────────

function mapCtxToUser(ctx: AccessContext): AuthenticatedUser {
  return {
    id: ctx.userId,
    role: ctx.role,
    name: null,
    producerId: ctx.producerId,
    organizations: (ctx.orgScopes || []).map((s) => ({
      organizationId: s.organizationId,
      role: s.orgRole,
      scopedLocationId: s.managedZoneIds?.[0] || null,
      managedZoneId: s.managedZoneIds?.[0] || null,
      dynRolePermissions: Array.from(s.permissions || []),
    })),
    permissions: Array.from(ctx.permissions || []),
  };
}

export async function requireProducer(req?: NextRequest) {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) return { user: null, error };

  const user = mapCtxToUser(ctx);

  // Un producteur est soit lié à un profil producerId, soit gestionnaire d'une org
  const isOrgManager = user.organizations.some(o => 
    ['OWNER', 'ADMIN', 'MANAGER'].includes(o.role.toUpperCase())
  );

  if (!user.producerId && !isOrgManager && !ctx.isGlobalAdmin) {
    return { user: null, error: NextResponse.json({ error: 'Profil producteur requis.' }, { status: 403 }) };
  }

  return { user, error: null };
}

export async function requireAdmin(req?: NextRequest) {
  const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
  if (error || !ctx) return { user: null, error };
  return { user: mapCtxToUser(ctx), error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS D'ORGANISATION (Optimisés avec recherche en mémoire si possible)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie l'appartenance à une organisation.
 * Utilise la DB en fallback, mais l'AccessContext est privilégié pour la perf.
 */
export async function requireMembershipFromRequest(req: Request | NextRequest, organizationId: string) {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) return { membership: null, error };

  // Vérification rapide en mémoire via le context
  const scope = ctx.orgScopes.find(s => s.organizationId === organizationId);
  
  if (!scope) {
    return { membership: null, error: NextResponse.json({ error: 'Accès interdit à cette organisation.' }, { status: 403 }) };
  }

  return { membership: scope, error: null };
}

/**
 * Guard pour actions scorées par organisation et zone géographique.
 */
export async function requireOrgAction(req: Request | NextRequest, organizationId: string, zoneId?: string) {
  const { membership, error } = await requireMembershipFromRequest(req, organizationId);
  if (error || !membership) return { membership: null, error };

  const managedZones = membership.managedZoneIds || [];
  
  // Si l'action est liée à une zone et que l'utilisateur a une restriction géographique
  if (zoneId && managedZones.length > 0) {
    // 1. Accès direct
    if (managedZones.includes(zoneId)) return { membership, error: null };

    // 2. Vérification de la hiérarchie (si zoneId est un enfant d'une zone gérée)
    const zone = await db.query.zones.findFirst({ where: eq(zones.id, zoneId) });
    if (!zone) return { membership: null, error: NextResponse.json({ error: 'Zone introuvable.' }, { status: 404 }) };

    const zonePath = (zone as any).path as string | undefined;
    // Sécurité : on découpe le path pour éviter que l'ID "1" match "10"
    const pathIds = zonePath?.split('.') || []; 
    const hasJurisdiction = managedZones.some(mId => pathIds.includes(mId));

    if (!hasJurisdiction) {
      return { membership: null, error: NextResponse.json({ error: 'Hors juridiction territoriale.' }, { status: 403 }) };
    }
  }

  return { membership, error: null };
}

/**
 * Require membership and at least one permission from requiredPermissions.
 * Returns { membership, error } where error is a NextResponse on failure.
 */
export async function requireMembershipAndPermission(req: Request | NextRequest, organizationId: string, requiredPermissions: string[]) {
  const { membership, error } = await requireMembershipFromRequest(req, organizationId);
  if (error || !membership) return { membership: null, error };

  // membership may include dynRole permissions in the AccessContext mapping
  const perms: string[] = (membership as any).dynRole?.permissions || (membership as any).permissions || [];
  const ok = requiredPermissions.length === 0 || requiredPermissions.some(p => perms.includes(p));
  if (!ok) {
    return { membership: null, error: NextResponse.json({ error: 'Permissions insuffisantes pour cette action.' }, { status: 403 }) };
  }

  return { membership, error: null };
}