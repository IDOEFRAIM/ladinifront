'use server';

import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  SERVICE DR – Gouvernance des Directions Régionales                ║
// ║  • Gestion des catégories / sous-catégories                        ║
// ║  • Prix Standards (Indice DRDR)                                    ║
// ║  • Verrouillage de sous-catégorie par zone                         ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Helpers ──────────────────────────────────────────────────────────────

/** Vérifier que l'appelant est bien Chef de DR (PRODUCER certifié) ou SUPERADMIN */
async function assertDRChief(userId: string, zoneId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { producer: true },
  });

  if (!user) throw new Error('Utilisateur introuvable');

  // SUPERADMIN bypass
  if (user.role === 'SUPERADMIN') return user;

  // Chef de DR = PRODUCER certifié rattaché à cette zone
  if (user.role !== 'PRODUCER' || !user.producer?.isCertified) {
    throw new Error('Seul un Chef de DR certifié ou un SUPERADMIN peut effectuer cette action.');
  }

  if (user.producer.zoneId !== zoneId) {
    throw new Error('Vous n\'êtes pas rattaché à cette zone.');
  }

  return user;
}

// ── Catégories ───────────────────────────────────────────────────────────

export async function createCategory(data: { name: string; description?: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) return { success: false, error: 'Cette catégorie existe déjà.' };

    const category = await prisma.category.create({ data });

    await audit({
      action: 'CREATE_CATEGORY',
      actorId: userId,
      entityType: 'Category',
      entityId: category.id,
      newValue: { name: category.name },
    });

    return { success: true, data: category };
  } catch (e: any) {
    console.error('createCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function createSubCategory(data: { categoryId: string; name: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const sub = await prisma.subCategory.create({ data });

    await audit({
      action: 'CREATE_SUBCATEGORY',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: sub.id,
      newValue: { name: sub.name, categoryId: sub.categoryId },
    });

    return { success: true, data: sub };
  } catch (e: any) {
    console.error('createSubCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subCategories: {
          include: {
            standardPrices: { include: { zone: { select: { id: true, name: true } } } },
            _count: { select: { products: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: categories };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Prix Standards (Indice DRDR) ─────────────────────────────────────────

/**
 * Met à jour (ou crée) le prix standard d'une sous-catégorie pour une zone.
 * Seul un Chef de DR rattaché à cette zone peut le faire.
 */
export async function upsertStandardPrice(input: {
  subCategoryId: string;
  zoneId: string;
  pricePerUnit: number;
  unit?: 'KG' | 'TONNE' | 'LITRE' | 'BAG';
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertDRChief(userId, input.zoneId);

    if (input.pricePerUnit <= 0) {
      return { success: false, error: 'Le prix doit être positif.' };
    }

    const price = await prisma.standardPrice.upsert({
      where: {
        subCategoryId_zoneId: {
          subCategoryId: input.subCategoryId,
          zoneId: input.zoneId,
        },
      },
      create: {
        subCategoryId: input.subCategoryId,
        zoneId: input.zoneId,
        pricePerUnit: input.pricePerUnit,
        unit: input.unit ?? 'KG',
        updatedById: userId,
      },
      update: {
        pricePerUnit: input.pricePerUnit,
        unit: input.unit ?? undefined,
        updatedById: userId,
      },
    });

    await audit({
      action: 'UPSERT_STANDARD_PRICE',
      actorId: userId,
      entityType: 'StandardPrice',
      entityId: price.id,
      newValue: { pricePerUnit: input.pricePerUnit, unit: input.unit ?? 'KG', zoneId: input.zoneId },
    });

    return { success: true, data: price };
  } catch (e: any) {
    console.error('upsertStandardPrice error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function getStandardPrices(zoneId: string) {
  try {
    const prices = await prisma.standardPrice.findMany({
      where: { zoneId },
      include: {
        subCategory: {
          include: { category: { select: { id: true, name: true } } },
        },
        updatedBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: prices };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Verrouillage de sous-catégorie ───────────────────────────────────────

/**
 * Bloque ou débloque une sous-catégorie dans une zone donnée.
 * Implémenté via le champ `blockedZoneIds` (String[]) sur SubCategory.
 */
export async function toggleSubCategoryBlock(input: {
  subCategoryId: string;
  zoneId: string;
  block: boolean;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertDRChief(userId, input.zoneId);

    const sub = await prisma.subCategory.findUnique({
      where: { id: input.subCategoryId },
    });
    if (!sub) return { success: false, error: 'Sous-catégorie introuvable' };

    let updatedZones = [...sub.blockedZoneIds];

    if (input.block) {
      if (!updatedZones.includes(input.zoneId)) updatedZones.push(input.zoneId);
    } else {
      updatedZones = updatedZones.filter((z) => z !== input.zoneId);
    }

    const updated = await prisma.subCategory.update({
      where: { id: input.subCategoryId },
      data: { blockedZoneIds: updatedZones },
    });

    await audit({
      action: input.block ? 'BLOCK_SUBCATEGORY' : 'UNBLOCK_SUBCATEGORY',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: updated.id,
      newValue: { blockedZoneIds: updatedZones, zoneId: input.zoneId },
    });

    return { success: true, data: updated };
  } catch (e: any) {
    console.error('toggleSubCategoryBlock error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

/**
 * Vérifie si un produit peut être vendu dans une zone.
 * Retourne false si la sous-catégorie est bloquée.
 */
export async function isProductAllowedInZone(productId: string, zoneId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { subCategory: true },
  });

  if (!product?.subCategory) return true; // pas de sous-catégorie = autorisé
  return !product.subCategory.blockedZoneIds.includes(zoneId);
}
