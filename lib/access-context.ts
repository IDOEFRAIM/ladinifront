/**
 * ACCESS CONTEXT — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * Construit une fois par requête à partir d'une seule query Prisma.
 * Toutes les validations de permission se font ensuite en mémoire,
 * sans ré-interroger la base de données.
 *
 * Usage dans une API Route :
 *   const ctx = await buildAccessContext(userId);
 *   AccessManager.can(ctx).permission(PERMISSIONS.STOCK_EDIT).inOrg(orgId).assert();
 */

import { prisma } from '@/lib/prisma';
import type { Permission } from '@/lib/permissions';

// Short-lived in-memory cache to avoid repeated DB queries for the same user
// during a burst of requests (e.g. multiple guards called in the same
// request lifecycle). TTL is intentionally short to avoid stale permission
// data; permission changes should update user.updatedAt which invalidates
// cached contexts when TTL expires.
const ctxCache = new Map<string, { ctx: AccessContext; expiresAt: number }>();
const CACHE_TTL_MS = 1000; // 1s

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgScope {
  organizationId: string;
  orgRole: string;          // OrgRole (ex. ADMIN, FIELD_AGENT, ZONE_MANAGER, …)
  managedZoneIds: string[]; // zones directement gérées dans cette org
  permissions: Set<Permission>; // permissions du dynRole pour cette org
}

/**
 * Contexte d'accès compilé une fois et valide pour toute la durée de la requête.
 * JAMAIS de requête DB supplémentaire après buildAccessContext().
 */
export interface AccessContext {
  userId: string;

  /** Rôle système global (ex. SUPERADMIN, ADMIN, PRODUCER, BUYER, AGENT, USER) */
  role: string;

  /** true si SUPERADMIN ou ADMIN → bypass de toutes les checks */
  isGlobalAdmin: boolean;

  /** IDs de toutes les organisations auxquelles l'utilisateur appartient */
  organizationIds: string[];

  /**
   * Union de toutes les permissions de tous les dynRoles de l'utilisateur.
   * Un SUPERADMIN/ADMIN a un Set vide ici — c'est isGlobalAdmin qui bypass.
   */
  permissions: Set<Permission>;

  /**
   * Union de tous les zoneIds gérés dans n'importe quelle organisation.
   * Set vide = pas de restriction géographique dans son périmètre org.
   */
  managedZoneIds: Set<string>;

  /** ID producteur (si l'utilisateur est lié à un profil producteur) */
  producerId?: string;

  /**
   * Version de permission basée sur updatedAt du User.
   * Permet d'invalider les contextes mis en cache si le rôle change.
   */
  permissionVersion: number;

  /** Memberships détaillés par organisation (pour checks d'org spécifique) */
  orgScopes: OrgScope[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge le contexte d'accès complet pour un userId en une seule requête.
 * À appeler en début de route API ; résultat passé à AccessManager.can().
 *
 * @throws Error('USER_NOT_FOUND') si l'utilisateur n'existe pas en base.
 */
export async function buildAccessContext(userId: string): Promise<AccessContext> {
  const now = Date.now();
  const cached = ctxCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.ctx;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      updatedAt: true,
      producer: { select: { id: true } },
      organizations: {
        select: {
          organizationId: true,
          role: true,
          managedZoneId: true,
          dynRole: {
            select: { permissions: true },
          },
        },
      },
    },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const role = String(user.role).toUpperCase();
  const isGlobalAdmin = role === 'SUPERADMIN' || role === 'ADMIN';

  const organizationIds: string[] = [];
  const globalPermissions = new Set<Permission>();
  const managedZoneIds = new Set<string>();
  const orgScopes: OrgScope[] = [];

  for (const membership of user.organizations) {
    const orgId = membership.organizationId;
    organizationIds.push(orgId);

    const orgPerms = new Set<Permission>();
    for (const p of (membership.dynRole?.permissions ?? [])) {
      const perm = p as Permission;
      globalPermissions.add(perm);
      orgPerms.add(perm);
    }

    const orgZones: string[] = [];
    if (membership.managedZoneId) {
      managedZoneIds.add(membership.managedZoneId);
      orgZones.push(membership.managedZoneId);
    }

    orgScopes.push({
      organizationId: orgId,
      orgRole: String(membership.role),
      managedZoneIds: orgZones,
      permissions: orgPerms,
    });
  }

  // build the context object (used for both return and cache)
  const ctx: AccessContext = {
    userId: user.id,
    role,
    isGlobalAdmin,
    organizationIds,
    permissions: globalPermissions,
    managedZoneIds,
    producerId: user.producer?.id,
    permissionVersion: user.updatedAt.getTime(),
    orgScopes,
  };

  // store in cache for short TTL
  try {
    ctxCache.set(userId, { ctx, expiresAt: now + CACHE_TTL_MS });
  } catch (_) {
    // ignore cache set failures
  }

  return ctx;
}

/**
 * Vérifie si la version en cache d'un contexte est toujours valide.
 * À utiliser si tu stockes le contexte quelque part (session cache, Redis, …).
 */
export async function isContextStale(ctx: AccessContext): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { updatedAt: true },
  });
  if (!user) return true;
  return user.updatedAt.getTime() > ctx.permissionVersion;
}
