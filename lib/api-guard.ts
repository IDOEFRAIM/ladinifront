/**
 * GUARD D'AUTHENTIFICATION — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * Protège les API Routes côté serveur.
 *
 * Deux niveaux d'API :
 *  1. getAccessContext()   → nouveau (recommandé) — retourne un AccessContext
 *     complet, compatible avec AccessManager.can(ctx)...
 *  2. getAuthenticatedUser() → legacy, conservé pour compatibilité ascendante.
 *
 * Règle Zero-Trust :
 *  - Toutes les données envoyées par le client (body, params) sont ignorées
 *    pour établir l'identité. On lit UNIQUEMENT le JWT signé `session-token`.
 *  - Le scope org/zone est TOUJOURS recalculé depuis la DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { buildAccessContext, type AccessContext } from '@/lib/access-context';
import { getSessionFromRequest } from '@/lib/session';

export type { AccessContext };

export interface OrgMembership {
  organizationId: string;
  role: string; // OrgRole as string
  scopedLocationId?: string | null;
  // legacy field used in tests and some services
  managedZoneId?: string | null;
  dynRolePermissions?: string[];
}

// Expand to match Prisma `Role` enum values and normalize handling
export type SystemRole = 'SUPERADMIN' | 'ADMIN' | 'USER' | 'PRODUCER' | 'BUYER' | 'AGENT';

export interface AuthenticatedUser {
  id: string;
  role: string;
  name: string | null;
  producerId?: string;
  organizations: OrgMembership[];
  permissions: string[]; // effective permissions across orgs
}

// ─────────────────────────────────────────────────────────────────────────────
// NOUVEAU — getAccessContext (recommandé pour tout nouveau code)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne l'AccessContext complet pour la requête courante.
 * Construit en une seule query DB ; toutes les vérifications ensuite en mémoire.
 *
 * @param requiredRoles  Si fourni, vérifie que le rôle système est dans la liste.
 * @param requiredPerms  Si fourni, vérifie au moins une permission (ADMIN bypass).
 *
 * @example
 *   const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
 *   if (error) return error;
 *   AccessManager.can(ctx).permission(PERMISSIONS.STOCK_EDIT).inOrg(orgId).assert();
 */
export async function getAccessContext(
  requiredRoles?: SystemRole[],
  requiredPermissions?: string[]
): Promise<{ ctx: AccessContext | null; error: NextResponse | null }> {
  const cookieStore = await cookies();
  let session = await getSessionFromRequest({ cookies: cookieStore } as any);
  // If no session found via cookie, try Authorization header or x-session-token
  if (!session?.userId) {
    try {
      const hdrs = headers();
      session = await getSessionFromRequest({ headers: hdrs } as any);
    } catch (e) {
      // ignore
    }
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

    // SUPERADMIN bypass
    if (ctx.role === 'SUPERADMIN') return { ctx, error: null };

    // Rôle requis
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(ctx.role as SystemRole)) {
        return {
          ctx: null,
          error: NextResponse.json({ error: 'Accès non autorisé pour votre rôle.' }, { status: 403 }),
        };
      }
    }

    // Permission requise (ADMIN bypass)
    if (requiredPermissions && requiredPermissions.length > 0 && ctx.role !== 'ADMIN') {
      const ok = requiredPermissions.every((p) => ctx.permissions.has(p as any));
      if (!ok) {
        return {
          ctx: null,
          error: NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 }),
        };
      }
    }

    return { ctx, error: null };
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return {
        ctx: null,
        error: NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 }),
      };
    }
    console.error('[getAccessContext]', err);
    return {
      ctx: null,
      error: NextResponse.json({ error: "Erreur de vérification d'identité." }, { status: 500 }),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — getAuthenticatedUser (conservé pour compatibilité)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait et vérifie l'userId depuis le JWT signé, récupère les memberships
 * organisationnels et compile les permissions effectives.
 * @deprecated Utiliser getAccessContext() dans le nouveau code.
 */
export async function getAuthenticatedUser(
  req?: NextRequest,
  requiredRoles?: SystemRole[],
  requiredPermissions?: string[]
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  const cookieStore = await cookies();
  let session = await getSessionFromRequest({ cookies: cookieStore } as any);
  if (!session?.userId) {
    try {
      const hdrs = headers();
      session = await getSessionFromRequest({ headers: hdrs } as any);
    } catch (e) {
      // ignore
    }
  }
  const userId = session?.userId;

  if (!userId || userId.length < 10) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentification requise. Veuillez vous connecter.' },
        { status: 401 }
      ),
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        producer: { select: { id: true } },
        organizations: {
          select: {
            organizationId: true,
            role: true,
            managedZoneId: true,
            dynRole: { select: { permissions: true } },
          },
        },
      },
    });

    if (!user) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 }),
      };
    }

    const orgs: OrgMembership[] = (user.organizations || []).map((o: any) => ({
      organizationId: o.organizationId,
      role: o.role,
      scopedLocationId: o.managedZoneId,
      managedZoneId: o.managedZoneId,
      dynRolePermissions: o.dynRole?.permissions || [],
    }));

    // Merge permissions from all org-level dynamic roles
    const permissionsSet = new Set<string>();
    orgs.forEach((o) => {
      (o.dynRolePermissions || []).forEach((p) => permissionsSet.add(p));
    });

    const permissions = Array.from(permissionsSet);

    // SUPERADMIN bypasses all checks
    if (String(user.role) === 'SUPERADMIN') {
      return {
        user: {
          id: user.id,
          role: String(user.role),
          name: user.name,
          producerId: user.producer?.id,
          organizations: orgs,
          permissions,
        },
        error: null,
      };
    }

    // Legacy role check (normalize to uppercase string to avoid mismatches)
    const userRoleStr = String(user.role).toUpperCase();
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(userRoleStr as SystemRole)) {
      return {
        user: null,
        error: NextResponse.json({ error: "Accès non autorisé pour votre rôle." }, { status: 403 }),
      };
    }

    // Permission-based check (ADMIN bypass)
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (String(user.role) !== 'ADMIN') {
        const ok = requiredPermissions.every((p) => permissions.includes(p));
        if (!ok) {
          return {
            user: null,
            error: NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 }),
          };
        }
      }
    }

    return {
      user: {
        id: user.id,
        role: String(user.role).toUpperCase(),
        name: user.name,
        producerId: user.producer?.id,
        organizations: orgs,
        permissions,
      },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Erreur de vérification d\'identité.' }, { status: 500 }),
    };
  }
}

/**
 * Vérifie qu'un producteur est bien authentifié.
 */
export async function requireProducer(req?: NextRequest) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return { user: null, error };

  if (!user.producerId) {
    const isOrgProducer = user.organizations.some(o =>
      ['OWNER', 'ADMIN', 'MANAGER'].includes(o.role)
    );
    if (!isOrgProducer && !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Profil producteur requis.' }, { status: 403 }),
      };
    }
  }

  return { user, error: null };
}

/**
 * Vérifie qu'un administrateur est bien authentifié.
 */
export async function requireAdmin(req?: NextRequest) {
  return getAuthenticatedUser(req, ['ADMIN', 'SUPERADMIN'] as SystemRole[]);
}

/**
 * Require that the current session (from request) belongs to the given organization.
 * Returns { membership, error } where error is a NextResponse when check fails.
 */
export async function requireMembershipFromRequest(req: Request | NextRequest, organizationId: string) : Promise<{ membership: any | null; error: NextResponse | null }> {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) {
    return { membership: null, error: NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }) };
  }

  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId,
      }
    },
    include: { dynRole: { select: { permissions: true } } }
  });

  if (!membership) {
    return { membership: null, error: NextResponse.json({ error: 'Accès interdit à cette organisation.' }, { status: 403 }) };
  }

  return { membership, error: null };
}

/**
 * Higher-level guard for organization-scoped actions.
 * - verifies membership
 * - optionally verifies territorial jurisdiction (zoneId)
 */
export async function requireOrgAction(req: Request | NextRequest, organizationId: string, zoneId?: string) {
  const { membership, error } = await requireMembershipFromRequest(req, organizationId);
  if (error || !membership) return { membership: null, error };

  // If membership has a managedZoneId and action references a zone, ensure jurisdiction
  const managed = membership.managedZoneId;
  if (zoneId && managed) {
    if (managed === zoneId) return { membership, error: null };
    // Fallback: check materialized path (requires `path` field on zone)
    // Fetch zone (path may not exist on all schemas — use any to be defensive)
    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) return { membership: null, error: NextResponse.json({ error: 'Zone introuvable.' }, { status: 404 }) };
    const zonePath = (zone as any).path as string | undefined;
    if (!zonePath || !zonePath.includes(managed)) {
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

  // dynRole may include permissions
  const perms: string[] = (membership.dynRole && membership.dynRole.permissions) || [];
  const ok = requiredPermissions.length === 0 || requiredPermissions.some(p => perms.includes(p));
  if (!ok) {
    return { membership: null, error: NextResponse.json({ error: 'Permissions insuffisantes pour cette action.' }, { status: 403 }) };
  }

  return { membership, error: null };
}