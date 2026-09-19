/**
 * ACCESS CONTEXT — AgriConnect v3 (Drizzle)
 * ──────────────────────────────────────────────────────────────────────────
 * Centralise les permissions de l'utilisateur pour la durée de la requête.
 */

import { db } from '@/src/db';
import { eq } from 'drizzle-orm';
import { users, producers, userOrganizations, roleDefs } from '@/src/db/schema';
import type { Permission } from '@/lib/permissions';

// Cache mémoire par process (partagé entre HMR via globalThis) + dédoublonnage des
// requêtes en vol : N requêtes simultanées du même user = 1 seul aller-retour DB.
const g = globalThis as unknown as {
  __ctxCache?: Map<string, { ctx: AccessContext; expiresAt: number }>;
  __ctxInflight?: Map<string, Promise<AccessContext>>;
};
const ctxCache = (g.__ctxCache ??= new Map());
const inflight = (g.__ctxInflight ??= new Map());
const CACHE_TTL_MS = 30_000; // 30 s — invalider via invalidateAccessContext() après changement de rôle
const CACHE_MAX = 500;

/** À appeler après tout changement de rôle / appartenance / permissions. */
export function invalidateAccessContext(userId?: string) {
  if (userId) ctxCache.delete(userId);
  else ctxCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgScope {
  organizationId: string;
  orgRole: string; 
  managedZoneIds: string[]; // IDs des zones où l'utilisateur a autorité
  permissions: Set<Permission>; // Permissions spécifiques via le dynRole de l'org
}

export interface AccessContext {
  userId: string;
  role: string; // Rôle système (ADMIN, USER, etc.)
  isGlobalAdmin: boolean;
  organizationIds: string[];
  permissions: Set<Permission>; // Union de toutes les permissions org
  managedZoneIds: Set<string>;  // Union de toutes les zones gérées
  producerId?: string;
  permissionVersion: number;
  orgScopes: OrgScope[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit le contexte d'accès : 3 requêtes plates (index PK / unique / user_id)
 * exécutées en parallèle, au lieu d'un LEFT JOIN LATERAL monolithique multi-schémas.
 */
export function buildAccessContext(userId: string): Promise<AccessContext> {
  const cached = ctxCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.ctx);

  const pending = inflight.get(userId);
  if (pending) return pending;

  const p = loadAccessContext(userId).finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

async function loadAccessContext(userId: string): Promise<AccessContext> {
  const now = Date.now();

  const [userRows, producerRows, memberships] = await Promise.all([
    db.select({ id: users.id, role: users.role, updatedAt: users.updatedAt })
      .from(users).where(eq(users.id, userId)).limit(1),
    db.select({ id: producers.id })
      .from(producers).where(eq(producers.userId, userId)).limit(1),
    db.select({
        organizationId: userOrganizations.organizationId,
        role: userOrganizations.role,
        managedZoneId: userOrganizations.managedZoneId,
        permissions: roleDefs.permissions,
      })
      .from(userOrganizations)
      .leftJoin(roleDefs, eq(roleDefs.id, userOrganizations.roleId))
      .where(eq(userOrganizations.userId, userId)),
  ]);

  const user = userRows[0]
    ? { ...userRows[0], producer: producerRows[0], userOrganizations: memberships }
    : undefined;

  if (!user) throw new Error('USER_NOT_FOUND');

  const role = (user.role || 'USER').toUpperCase();
  const isGlobalAdmin = role === 'SUPERADMIN' || role === 'ADMIN';

  // Préparation des accumulateurs
  const organizationIds: string[] = [];
  const globalPermissions = new Set<Permission>();
  const allManagedZoneIds = new Set<string>();
  const orgScopes: OrgScope[] = [];

  // Traitement des memberships
  for (const membership of (user.userOrganizations ?? [])) {
    const orgId = membership.organizationId;
    organizationIds.push(orgId);

    // Extraction des permissions du rôle dynamique (Cast sécurisé)
    const rawPerms = (membership.permissions as Permission[]) ?? [];
    const orgPerms = new Set<Permission>(rawPerms);
    
    // On alimente le set global pour les checks "toutes orgs confondues"
    rawPerms.forEach(p => globalPermissions.add(p));

    // Gestion de la zone (Territorialité)
    const orgZones: string[] = [];
    if (membership.managedZoneId) {
      allManagedZoneIds.add(membership.managedZoneId);
      orgZones.push(membership.managedZoneId);
    }

    orgScopes.push({
      organizationId: orgId,
      orgRole: membership.role || 'MEMBER',
      managedZoneIds: orgZones,
      permissions: orgPerms,
    });
  }

  const ctx: AccessContext = {
    userId: user.id,
    role,
    isGlobalAdmin,
    organizationIds,
    permissions: globalPermissions,
    managedZoneIds: allManagedZoneIds,
    producerId: user.producer?.id,
    permissionVersion: user.updatedAt?.getTime() || now,
    orgScopes,
  };

  // Mise en cache
  ctxCache.set(userId, { ctx, expiresAt: now + CACHE_TTL_MS });

  // Nettoyage périodique sommaire du cache si trop volumineux
  if (ctxCache.size > CACHE_MAX) {
    const firstKey = ctxCache.keys().next().value;
    if (firstKey) ctxCache.delete(firstKey);
  }

  return ctx;
}

/**
 * Vérifie si le contexte doit être rafraîchi (ex: après un changement de rôle en DB).
 */
export async function isContextStale(ctx: AccessContext): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { updatedAt: true },
  });
  
  if (!user || !user.updatedAt) return true;
  return user.updatedAt.getTime() > ctx.permissionVersion;
}