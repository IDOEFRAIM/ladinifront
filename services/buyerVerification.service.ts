'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '@/lib/audit';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BUYER VERIFICATION — Badge de confiance pour acheteurs B2B         ║
// ╚══════════════════════════════════════════════════════════════════════╝

type TrustBadge = 'VERIFIED_INSTITUTION' | 'VERIFIED_COMMERCE' | 'VERIFIED_ID';

/**
 * Admin valide le profil acheteur (CNIB ou registre de commerce).
 * Attribue un badge de confiance selon le type de vérification.
 *
 * Règles :
 * - Hôtels/Restaurants → vérification registre de commerce → badge VERIFIED_INSTITUTION
 * - Particuliers avec CNIB → badge VERIFIED_ID
 * - Commerçants avec registre → badge VERIFIED_COMMERCE
 */
export async function verifyBuyerProfile(input: {
  buyerProfileId: string;
  adminUserId: string;
  verificationType: 'CNIB' | 'COMMERCE_REGISTER';
}) {
  const { buyerProfileId, adminUserId, verificationType } = input;

  // 1. Charger le profil acheteur avec l'utilisateur lié
  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.id, buyerProfileId),
    with: {
      user: { columns: { id: true, cnibNumber: true, identityVerified: true } },
      buyerType: { columns: { id: true, name: true } },
    },
  });

  if (!profile) return { success: false, error: 'Profil acheteur introuvable' };

  // 2. Vérification des documents
  if (verificationType === 'CNIB') {
    if (!profile.user?.cnibNumber) {
      return { success: false, error: 'Numéro CNIB manquant pour cet utilisateur' };
    }
  }

  // 3. Déterminer le badge approprié
  let badge: TrustBadge;
  const typeName = profile.buyerType?.name?.toUpperCase() || '';

  if (verificationType === 'COMMERCE_REGISTER') {
    if (['HOTEL', 'RESTAURANT', 'HÔTEL'].includes(typeName)) {
      badge = 'VERIFIED_INSTITUTION';
    } else {
      badge = 'VERIFIED_COMMERCE';
    }
  } else {
    badge = 'VERIFIED_ID';
  }

  // 4. Mise à jour atomique
  const now = new Date();
  const [updated] = await db.update(schema.buyerProfiles)
    .set({
      isVerified: true,
      trustBadge: badge,
      verifiedAt: now,
      verifiedById: adminUserId,
    })
    .where(eq(schema.buyerProfiles.id, buyerProfileId))
    .returning();

  // 5. Marquer aussi l'utilisateur comme vérifié si CNIB
  if (verificationType === 'CNIB' && profile.user?.id) {
    await db.update(schema.users)
      .set({ identityVerified: true })
      .where(eq(schema.users.id, profile.user.id));
  }

  // 6. Audit
  await audit({
    action: 'VERIFY_BUYER_PROFILE',
    entityType: 'BuyerProfile',
    entityId: buyerProfileId,
    actorId: adminUserId,
    newValue: { badge, verificationType, verifiedAt: now.toISOString() },
  });

  return { success: true, data: updated };
}

/**
 * Liste les profils acheteurs en attente de vérification (pour le dashboard admin).
 */
export async function getPendingBuyerVerifications() {
  return db.query.buyerProfiles.findMany({
    where: eq(schema.buyerProfiles.isVerified, false),
    with: {
      user: { columns: { id: true, name: true, phone: true, cnibNumber: true, email: true } },
      buyerType: { columns: { id: true, name: true } },
    },
  });
}

/**
 * Révoque le badge de confiance d'un acheteur.
 */
export async function revokeBuyerTrustBadge(buyerProfileId: string, adminUserId: string) {
  const [updated] = await db.update(schema.buyerProfiles)
    .set({
      isVerified: false,
      trustBadge: null,
      verifiedAt: null,
      verifiedById: null,
    })
    .where(eq(schema.buyerProfiles.id, buyerProfileId))
    .returning();

  await audit({
    action: 'REVOKE_BUYER_BADGE',
    entityType: 'BuyerProfile',
    entityId: buyerProfileId,
    actorId: adminUserId,
    newValue: { revokedAt: new Date().toISOString() },
  });

  return { success: true, data: updated };
}
