/**
 * PERMISSIONS & RBAC — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE DE VÉRITÉ unique pour toutes les permissions de l'application.
 *
 * ⚠️  Synchronisation stricte TypeScript ↔ base de données :
 *     Toutes les valeurs stockées dans `RoleDef.permissions` DOIVENT
 *     correspondre à un key de ce registre.
 *     Il est impossible d'utiliser une permission inexistante côté TS.
 */

import type { AuthenticatedUser } from '@/lib/api-guard';

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION REGISTRY (source de vérité typée)
// ─────────────────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // ── Territories / Zones ───────────────────────────────────────────────────
  ZONE_VIEW:              'ZONE_VIEW',
  ZONE_MANAGE:            'ZONE_MANAGE',
  LOCATION_VIEW:          'LOCATION_VIEW',
  LOCATION_EDIT:          'LOCATION_EDIT',
  LOCATION_DELETE:        'LOCATION_DELETE',

  // ── Stocks / Inventaire ───────────────────────────────────────────────────
  STOCK_VIEW:             'STOCK_VIEW',
  STOCK_EDIT:             'STOCK_EDIT',
  STOCK_DELETE:           'STOCK_DELETE',
  STOCK_VERIFY:           'STOCK_VERIFY',       // validation qualité agent

  // ── Commandes ─────────────────────────────────────────────────────────────
  ORDER_VIEW:             'ORDER_VIEW',
  ORDER_CREATE:           'ORDER_CREATE',
  ORDER_VALIDATE:         'ORDER_VALIDATE',
  ORDER_CANCEL:           'ORDER_CANCEL',

  // ── Produits / Catalogue ──────────────────────────────────────────────────
  PRODUCT_VIEW:           'PRODUCT_VIEW',
  PRODUCT_EDIT:           'PRODUCT_EDIT',
  PRODUCT_DELETE:         'PRODUCT_DELETE',
  PRODUCT_VERIFY:         'PRODUCT_VERIFY',     // validation qualité agent

  // ── Utilisateurs / Rôles ──────────────────────────────────────────────────
  USER_VIEW:              'USER_VIEW',
  USER_EDIT:              'USER_EDIT',
  USER_BAN:               'USER_BAN',
  ROLE_MANAGE:            'ROLE_MANAGE',

  // ── Producteurs ───────────────────────────────────────────────────────────
  PRODUCER_VIEW:          'PRODUCER_VIEW',
  PRODUCER_CREATE:        'PRODUCER_CREATE',    // création via org
  PRODUCER_VALIDATE:      'PRODUCER_VALIDATE',  // validation du statut
  PRODUCER_SUSPEND:       'PRODUCER_SUSPEND',
  PRODUCER_DELETE:        'PRODUCER_DELETE',

  // ── Audit ─────────────────────────────────────────────────────────────────
  AUDIT_VIEW:             'AUDIT_VIEW',

  // ── Monitoring / Agents IA ────────────────────────────────────────────────
  MONITORING_VIEW:        'MONITORING_VIEW',
  AGENT_APPROVE:          'AGENT_APPROVE',
  AGENT_TELEMETRY_VIEW:   'AGENT_TELEMETRY_VIEW',

  // ── Organisation ──────────────────────────────────────────────────────────
  ORG_VIEW:               'ORG_VIEW',
  ORG_MANAGE:             'ORG_MANAGE',
  ORG_INVITE:             'ORG_INVITE',

  // ── Warehouse ─────────────────────────────────────────────────────────────
  WAREHOUSE_VIEW:         'WAREHOUSE_VIEW',
  WAREHOUSE_EDIT:         'WAREHOUSE_EDIT',

  // ── Batches ───────────────────────────────────────────────────────────────
  BATCH_VIEW:             'BATCH_VIEW',
  BATCH_EDIT:             'BATCH_EDIT',

  // ── Finances / KPIs ───────────────────────────────────────────────────────
  FINANCE_VIEW:           'FINANCE_VIEW',
  FORECAST_VIEW:          'FORECAST_VIEW',
  ZONE_METRIC_VIEW:       'ZONE_METRIC_VIEW',
} as const;

/** Type strict — seules les valeurs du registre ci-dessus sont acceptées. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Ensemble de toutes les permissions disponibles (utile pour validation runtime).
 */
export const ALL_PERMISSIONS = new Set<string>(Object.values(PERMISSIONS));

/**
 * Vérifie qu'une chaîne est une Permission valide connue du registre.
 * Utile pour valider les permissions en base de données avant insertion.
 */
export function isValidPermission(p: string): p is Permission {
  return ALL_PERMISSIONS.has(p);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY HELPERS (basés sur AuthenticatedUser — conservés pour compatibilité)
// Préférer AccessManager pour tout nouveau code.
// ─────────────────────────────────────────────────────────────────────────────

function isSuperOrAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
}

/**
 * Vérifie si l'utilisateur possède la permission donnée.
 * SUPERADMIN et ADMIN globaux passent toujours (bypass).
 * @deprecated Utiliser AccessManager.hasPermission(ctx, permission) dans le nouveau code.
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  if (isSuperOrAdmin(user)) return true;
  return user.permissions.includes(permission);
}

/**
 * Vérifie si l'utilisateur possède TOUTES les permissions listées.
 * @deprecated Utiliser AccessManager.can(ctx).permission(...).check()
 */
export function hasAllPermissions(user: AuthenticatedUser, permissions: string[]): boolean {
  if (isSuperOrAdmin(user)) return true;
  return permissions.every((p) => user.permissions.includes(p));
}

/**
 * Vérifie si l'utilisateur possède AU MOINS UNE des permissions listées.
 * @deprecated Utiliser AccessManager.can(ctx).permission(...).check()
 */
export function hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
  if (isSuperOrAdmin(user)) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * Retourne les IDs d'organisations auxquelles l'utilisateur appartient.
 * @deprecated Utiliser ctx.organizationIds depuis AccessContext
 */
export function getUserOrganizationIds(user: AuthenticatedUser): string[] {
  return user.organizations.map((o) => o.organizationId);
}

/**
 * Retourne les location IDs que l'utilisateur supervise (scope géo).
 * Null signifie "pas de restriction = accès global dans son org".
 * @deprecated Utiliser ctx.managedZoneIds depuis AccessContext
 */
export function getUserScopedLocationIds(user: AuthenticatedUser): string[] | null {
  const locationIds = user.organizations
    .filter((o) => o.scopedLocationId)
    .map((o) => o.scopedLocationId as string);
  return locationIds.length > 0 ? locationIds : null;
}

/**
 * Construit le filtre Prisma `where` pour les requêtes scopées par organisation.
 * @deprecated Utiliser AccessManager.orgFilter(ctx)
 */
export function orgScopeFilter(
  user: AuthenticatedUser,
  orgField: string = 'organizationId'
): Record<string, any> {
  if (isSuperOrAdmin(user)) return {};
  const orgIds = getUserOrganizationIds(user);
  if (orgIds.length === 0) return { [orgField]: '__NO_ORG__' };
  if (orgIds.length === 1) return { [orgField]: orgIds[0] };
  return { [orgField]: { in: orgIds } };
}

/**
 * Construit un filtre de scope géographique (location) pour les utilisateurs
 * qui ont un `scopedLocationId` défini.
 * @deprecated Utiliser AccessManager.zoneFilter(ctx)
 */
export function locationScopeFilter(
  user: AuthenticatedUser,
  locationField: string = 'zoneId'
): Record<string, any> {
  if (isSuperOrAdmin(user)) return {};
  const locationIds = getUserScopedLocationIds(user);
  if (!locationIds) return {};
  if (locationIds.length === 1) return { [locationField]: locationIds[0] };
  return { [locationField]: { in: locationIds } };
}

// Legacy aliases
export const zoneScopeFilter = locationScopeFilter;
export const getUserManagedZoneIds = getUserScopedLocationIds;
