// Contexte d'organisation partagé : session + appartenance vérifiée en base + gardes ADMIN / MANAGER.
import { cookies } from 'next/headers';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OrgContext {
  userId: string;
  orgId: string;
  orgRole: string;       // OrgRole enum value from UserOrganization
  systemRole: string;    // Role enum value from User
  isOrgAdmin: boolean;   // true if orgRole === 'ADMIN' or systemRole in [ADMIN, SUPERADMIN]
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts org context from cookies + verifies membership in DB.
 * Returns null with error message if any check fails.
 */
export async function getOrgContext(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const cookieStore = await cookies();

  // 1. JWT session
  const session = await getSessionFromRequest({ cookies: cookieStore });
  const userId = session?.userId;
  if (!userId) {
    return { ctx: null, error: 'Session expirée. Reconnectez-vous.' };
  }

  // 2. Active org cookie
  let orgId = cookieStore.get(COOKIE_NAMES.ACTIVE_ORG_ID)?.value;
  // Fallback: session token may carry activeOrgId
  if (!orgId && session?.activeOrgId) {
    orgId = session.activeOrgId;
    if (process.env.NODE_ENV !== 'production') console.log(`getOrgContext: using activeOrgId from session=${orgId}`);
  }
  // Fallback: client may cache the first org in `user-org` cookie
  if (!orgId) {
    const userOrgRaw = cookieStore.get(COOKIE_NAMES.USER_ORG)?.value;
    if (userOrgRaw) {
      try {
        const parsed = JSON.parse(userOrgRaw);
        if (parsed && parsed.organizationId) {
          orgId = String(parsed.organizationId);
          if (process.env.NODE_ENV !== 'production') console.log(`getOrgContext: using organizationId from user-org cookie=${orgId}`);
        }
      } catch (e) {
        // ignore malformed cookie
      }
    }
  }

  if (!orgId) {
    return { ctx: null, error: 'Aucune organisation active. Sélectionnez une organisation.' };
  }

  // 3. Verify membership in DB (NEVER trust client)
  const [membership, user] = await Promise.all([
    db.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, userId),
        eq(schema.userOrganizations.organizationId, orgId),
      ),
    }),
    db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { role: true },
    }),
  ]);

  if (!user) {
    return { ctx: null, error: 'Utilisateur introuvable.' };
  }

  const systemRole = String(user.role).toUpperCase();
  const isSystemAdmin = systemRole === 'SUPERADMIN' || systemRole === 'ADMIN';

  // System admins can access any org even without membership
  if (!membership && !isSystemAdmin) {
    return { ctx: null, error: 'Vous n\'appartenez pas à cette organisation.' };
  }

  const orgRole = membership?.role ? String(membership.role) : 'FIELD_AGENT';
  const isOrgAdmin = orgRole === 'ADMIN' || isSystemAdmin;

  return {
    ctx: { userId, orgId, orgRole, systemRole, isOrgAdmin },
    error: null,
  };
}

/**
 * Guard: requires org ADMIN (or system ADMIN/SUPERADMIN).
 */
export async function requireOrgAdmin(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const { ctx, error } = await getOrgContext();
  if (error || !ctx) return { ctx: null, error: error || 'Accès refusé.' };

  if (!ctx.isOrgAdmin) {
    return { ctx: null, error: 'Seul un administrateur de l\'organisation peut effectuer cette action.' };
  }

  return { ctx, error: null };
}

/**
 * Guard: requires at least ADMIN or ZONE_MANAGER in org (or system admin).
 */
export async function requireOrgManager(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const { ctx, error } = await getOrgContext();
  if (error || !ctx) return { ctx: null, error: error || 'Accès refusé.' };

  const allowedRoles = ['ADMIN', 'ZONE_MANAGER'];
  if (!allowedRoles.includes(ctx.orgRole) && !ctx.isOrgAdmin) {
    return { ctx: null, error: 'Droits insuffisants pour cette action.' };
  }

  return { ctx, error: null };
}
