/**
 * ACCESS CONTEXT — AgriConnect v3 (Drizzle)
 * ──────────────────────────────────────────────────────────────────────────
 * Centralise les permissions de l'utilisateur pour la durée de la requête.
 */

import { dbAuth as db } from '@/src/db';
import { eq, sql } from 'drizzle-orm';
import { users } from '@/src/db/schema';
import type { Permission } from '@/lib/permissions';
import { dbOp } from '@/lib/db-observe';

/**
 * CLASSIFICATION DES DONNÉES (règles fail-open / fail-closed)
 * ──────────────────────────────────────────────────────────────────────────
 *  A. AUTORISATION  — rôle système, permissions, appartenance aux organisations, zones gérées, producerId.
 *     → FAIL CLOSED. Jamais servie depuis un cache périmé quand la DB est indisponible :
 *       la requête échoue (503) plutôt que d'autoriser sur une donnée possiblement révoquée.
 *       Seul un cache FRAIS (TTL très court, invalidé sur changement) est utilisé.
 *  B. ACTIONS SENSIBLES — administration, changement de rôle, paiement, suppression, validation financière,
 *     accès tenant critique. → `fresh: true` : le cache est ignoré, la DB est relue à chaque appel.
 *  C. AFFICHAGE non décisionnel (profil public, listes, catalogue) : n'utilise PAS ce module ; ces lectures
 *     peuvent se rabattre sur des données périmées dans leur propre couche. /api/me relit aussi le profil en
 *     base : il échoue donc en 503 comme A (le client garde alors son état déjà hydraté, voir hooks/useAuth).
 *  Invariant testé : aucun contexte périmé n'est JAMAIS servi (__tests__/lib/access-context-failclosed.test.ts).
 *
 * Le cache est local au process : invalidateAccessContext() ne purge pas les autres instances (voir le TTL).
 */
const g = globalThis as unknown as {
  __ctxCache?: Map<string, { ctx: AccessContext; expiresAt: number }>;
  __ctxInflight?: Map<string, Promise<AccessContext>>;
};
const ctxCache = (g.__ctxCache ??= new Map());
const inflight = (g.__ctxInflight ??= new Map());
/** TTL du cache d'autorisation (A) : très court, multi-instance ⇒ pas de purge croisée. */
export const AUTHZ_CACHE_TTL_MS = 10_000;
const CACHE_MAX = 500;

export interface BuildAccessOptions {
  /** Ignore le cache (actions sensibles, catégorie B). */
  fresh?: boolean;
}

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
  /** Données d'AFFICHAGE chargées dans le même aller-retour (jamais utilisées pour décider d'un accès). */
  profile?: { name: string | null; email: string | null; onboardingCompleted: boolean; organizationNames: Record<string, string> };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit le contexte d'accès : 3 requêtes plates (index PK / unique / user_id)
 * exécutées en parallèle, au lieu d'un LEFT JOIN LATERAL monolithique multi-schémas.
 */
export function buildAccessContext(userId: string, options: BuildAccessOptions = {}): Promise<AccessContext> {
  if (!options.fresh) {
    const cached = ctxCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.ctx);
  }

  const key = options.fresh ? `${userId}#fresh` : userId;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = dbOp('auth.access_context.load', { category: 'auth', kind: 'read' }, () => loadAccessContext(userId))
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

interface AccessRow {
  id: string;
  role: string | null;
  updated_at: Date | null;
  name: string | null;
  email: string | null;
  onboarding_completed: boolean;
  producer_id: string | null;
  memberships: Array<{
    organizationId: string;
    role: string | null;
    managedZoneId: string | null;
    permissions: string[] | null;
    organizationName: string | null;
  }>;
}

/**
 * UN SEUL aller-retour réseau (et une seule connexion du pool) pour tout le contexte + profil d'affichage.
 * Mesuré : le débit du pool est borné par (connexions ÷ latence réseau) ; avec ~220 ms d'aller-retour, 3 requêtes
 * parallèles occupaient 3 connexions pour un seul contexte. Les plans (EXPLAIN ANALYZE) sont des index scans PK/index
 * (< 0,05 ms d'exécution) : c'est le nombre d'allers-retours, pas le SQL, qui coûte.
 * Sous-requêtes scalaires corrélées sur UNE ligne PK — pas de LATERAL, pas de SELECT *.
 */
async function loadAccessContext(userId: string): Promise<AccessContext> {
  const now = Date.now();

  const rows = (await db.execute(sql`
    select u.id, u.role, u.updated_at, u.name, u.email, u.onboarding_completed,
      (select p.id from marketplace.producers p where p.user_id = u.id limit 1) as producer_id,
      coalesce((
        select json_agg(json_build_object(
          'organizationId', uo.organization_id, 'role', uo.role, 'managedZoneId', uo.managed_zone_id,
          'permissions', rd.permissions, 'organizationName', o.name))
        from governance.user_organizations uo
        left join governance.role_definitions rd on rd.id = uo.role_id
        left join governance.organizations o on o.id = uo.organization_id
        where uo.user_id = u.id
      ), '[]'::json) as memberships
    from auth.users u
    where u.id = ${userId}
    limit 1
  `)) as unknown as AccessRow[];

  const row = rows[0];
  const user = row
    ? {
        id: row.id,
        role: row.role,
        updatedAt: row.updated_at ? new Date(row.updated_at) : null,
        producer: row.producer_id ? { id: row.producer_id } : undefined,
        userOrganizations: row.memberships ?? [],
      }
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
    const rawPerms = (membership.permissions ?? []) as Permission[];
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
    profile: { name: row.name, email: row.email, onboardingCompleted: row.onboarding_completed, organizationNames: Object.fromEntries(user.userOrganizations.map((m) => [m.organizationId, m.organizationName ?? ''])) },
    permissionVersion: user.updatedAt?.getTime() || now,
    orgScopes,
  };

  // Mise en cache
  ctxCache.set(userId, { ctx, expiresAt: now + AUTHZ_CACHE_TTL_MS });

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