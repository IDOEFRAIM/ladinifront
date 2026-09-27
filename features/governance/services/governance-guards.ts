import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';

/** Vérifier que l'appelant est bien Chef de DR (PRODUCER certifié), Admin org, ou SUPERADMIN */
export async function assertDRChief(userId: string, zoneId: string): Promise<any> {
  // Load user and producer explicitly to avoid relation metadata reliance
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) throw new Error('Utilisateur introuvable');

  // SUPERADMIN bypass
  if (user.role === 'SUPERADMIN') return user;

  // ADMIN system role bypass (with org membership check)
  if (user.role === 'ADMIN') {
    // Allow ADMIN if they belong to the same organization that owns the zone.
    // If the zone has no organizationId, fall back to allowing any org membership with allowed roles.
    const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId) });
    const allowedOrgRoles = ['ADMIN', 'ZONE_MANAGER', 'SALES_MANAGER'];
      if (zone && zone.organizationId) {
      const membership = await db.query.userOrganizations.findFirst({
        where: (t, { and: andOp }) => andOp(
          eq(schema.userOrganizations.userId, userId),
          eq(schema.userOrganizations.organizationId, zone.organizationId as string),
        ),
      });
      if (membership && allowedOrgRoles.includes(membership.role)) return user;
    } else {
      // Zone has no organization linked — be permissive if user has any allowed org membership
      const membershipAny = await db.query.userOrganizations.findFirst({ where: eq(schema.userOrganizations.userId, userId) });
      if (membershipAny && allowedOrgRoles.includes(membershipAny.role)) return user;
    }
  }

  // If user is producer, fetch producer record
  let producer: any = null;
  if (user.role === 'PRODUCER') {
    producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, user.id) });
  }

  // Chef de DR = PRODUCER certifié rattaché à cette zone
  if (user.role !== 'PRODUCER' || !producer?.isCertified) {
    console.warn(`assertDRChief denied: user.role=${user.role}, producerCert=${producer?.isCertified}, userId=${userId}, zoneId=${zoneId}`);
    throw new Error('Seul un Chef de DR certifié, un Admin, ou un SUPERADMIN peut effectuer cette action.');
  }

  if (producer.zoneId !== zoneId) {
    throw new Error('Vous n\'êtes pas rattaché à cette zone.');
  }

  return { ...user, producer };
}

/** Vérifie que l'appelant est ADMIN/SUPERADMIN — même garde que `admin.service.ts`.
 * Utilisé pour les actions qui sont une POLICY DE PLATEFORME (jamais une
 * donnée zonale/DR) : le seuil minimum de commande par type de produit
 * appartient à l'admin plateforme, pas au Chef de DR (`assertDRChief`
 * ci-dessus reste réservé aux actions zonales — verrouillage, prix standards). */
export async function assertPlatformAdmin(): Promise<string> {
  const userId = await getUserIdFromSession();
  if (!userId) throw new Error('Session expirée');
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { role: true } });
  const role = String(user?.role ?? '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new Error('Accès réservé aux administrateurs');
  return userId;
}

// ── Catégories ───────────────────────────────────────────────────────────
