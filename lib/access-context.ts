/**
 * ACCESS CONTEXT — AgriConnect v3 (Drizzle)
 * ──────────────────────────────────────────────────────────────────────────
 * Centralise les permissions de l'utilisateur pour la durée de la requête.
 */

import { db } from '@/src/db';
import { eq } from 'drizzle-orm';
import { users } from '@/src/db/schema';
import type { Permission } from '@/lib/permissions';

// Cache court pour éviter les requêtes redondantes lors d'un même cycle de rendu
// Note : Dans un environnement Serverless (Vercel), ce Map survit tant que le "warm" lambda est actif.
const ctxCache = new Map<string, { ctx: AccessContext; expiresAt: number }>();
const CACHE_TTL_MS = 1000; // 1 seconde

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
 * Construit le contexte d'accès en une seule requête Drizzle.
 */
export async function buildAccessContext(userId: string): Promise<AccessContext> {
  const now = Date.now();
  const cached = ctxCache.get(userId);
  
  if (cached && cached.expiresAt > now) {
    return cached.ctx;
  }

  // Requête optimisée avec tous les joins nécessaires
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      role: true,
      updatedAt: true,
    },
    with: {
      producer: {
        columns: { id: true },
      },
      userOrganizations: {
        columns: {
          organizationId: true,
          role: true,
          managedZoneId: true,
        },
        with: {
          dynRole: { 
            columns: { permissions: true } 
          },
        },
      },
    },
  });

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
    const rawPerms = (membership.dynRole?.permissions as Permission[]) ?? [];
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
  if (ctxCache.size > 500) {
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