import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function createAuction(input: {
  subCategoryId: string;
  quantity: number;
  unit?: 'TONNE' | 'KG' | 'LITRE' | 'BAG';
  maxPricePerUnit: number;
  deadline: string; // ISO
  incoterm: string;
  deliveryLocation: string;
  deliveryDeadline: string; // ISO
  targetZoneId?: string | null;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    // Validate basic fields
    if (!input.subCategoryId) return { success: false, error: 'Sous-catégorie requise' };
    if (!input.quantity || input.quantity <= 0) return { success: false, error: 'Quantité invalide' };
    if (!input.maxPricePerUnit || input.maxPricePerUnit <= 0) return { success: false, error: 'Plafond prix invalide' };
    const dl = new Date(input.deadline);
    if (isNaN(dl.getTime()) || dl <= new Date()) return { success: false, error: 'Deadline invalide' };

    if (!input.deliveryLocation || !String(input.deliveryLocation).trim()) return { success: false, error: 'Lieu de livraison requis' };
    const deliveryDeadline = new Date(input.deliveryDeadline);
    if (isNaN(deliveryDeadline.getTime()) || deliveryDeadline <= new Date()) return { success: false, error: 'Date limite de livraison invalide' };
    if (deliveryDeadline <= dl) return { success: false, error: 'La date limite de livraison doit être après la fin de l\'enchère' };

    const incoterm = String(input.incoterm || '').toUpperCase();
    if (!incoterm) return { success: false, error: 'Incoterm requis' };

    // Verify subCategory exists
    const sub = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, input.subCategoryId) });
    if (!sub) return { success: false, error: 'Sous-catégorie introuvable' };

    // If targetZone provided, ensure subCategory not blocked
    if (input.targetZoneId) {
      if (sub.blockedZoneIds?.includes(input.targetZoneId)) {
        return { success: false, error: 'Sous-catégorie bloquée dans la zone cible' };
      }
    }

    const [created] = await db.insert(schema.auctions).values({
      buyerId: userId,
      subCategoryId: input.subCategoryId,
      quantity: String(input.quantity),
      unit: input.unit ?? 'TONNE',
      maxPricePerUnit: String(input.maxPricePerUnit),
      incoterm,
      deliveryLocation: String(input.deliveryLocation).trim(),
      deliveryDeadline,
      deadline: dl,
      targetZoneId: input.targetZoneId ?? null,
    }).returning();

    await audit({
      action: 'CREATE_AUCTION',
      entityType: 'Auction',
      entityId: created.id,
      actorId: userId,
      newValue: {
        subCategoryId: input.subCategoryId,
        quantity: input.quantity,
        maxPricePerUnit: input.maxPricePerUnit,
        deadline: input.deadline,
        incoterm,
        deliveryLocation: String(input.deliveryLocation).trim(),
        deliveryDeadline: input.deliveryDeadline,
        targetZoneId: input.targetZoneId ?? null,
      },
    });

    return { success: true, data: created };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('createAuction error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

// ── Soumission d'un bid ──────────────────────────────────────────────────
